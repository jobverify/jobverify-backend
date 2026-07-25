import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'credresolve'
export const COMPANY = 'CredResolve'
export const HOMEPAGE_URL = 'https://credresolve.co.in/'
export const JOB_OPENINGS_URL = 'https://credresolve.co.in/jobopenings'
export const CAREERS_API_URL = 'https://credresolve.co.in/wp-json/wp/v2/awsm_job_openings'
export const PAGE_SIZE = 100

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeText = (value) => {
  const normalized = decodeHtml(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const stripTags = (value) => normalizeText(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/section|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const extractFieldValue = (html, heading) => {
  const pattern = new RegExp(
    `<h[1-6][^>]*>\\s*${escapeRegex(heading)}\\s*<\\/h[1-6]>\\s*<p[^>]*>([\\s\\S]*?)<\\/p>`,
    'i',
  )

  return normalizeText(String(html ?? '').match(pattern)?.[1])
}

const extractListAfterHeading = (html, heading) => {
  const pattern = new RegExp(
    `<h[1-6][^>]*>\\s*${escapeRegex(heading)}\\s*<\\/h[1-6]>([\\s\\S]*?)(?=<h[1-6][^>]*>|$)`,
    'i',
  )
  const section = String(html ?? '').match(pattern)?.[1] || ''

  return [...section.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)
}

const extractDescriptionParts = (html) => {
  const parts = [
    extractFieldValue(html, 'Job Description'),
    ...extractListAfterHeading(html, 'Key Responsibilities'),
    ...extractListAfterHeading(html, 'Requirements'),
  ]

  return parts.filter(Boolean)
}

const titleCaseWords = (value) => String(value ?? '')
  .toLowerCase()
  .split(/(\s+|\/|-)/)
  .map((part) => (/^[a-z0-9]+$/i.test(part) ? part.charAt(0).toUpperCase() + part.slice(1) : part))
  .join('')
  .trim() || null

const isRemoteStatusToken = (value) => /\b(remote|hybrid|in-office|on-site|onsite)\b/i.test(String(value ?? ''))

const normalizeRemoteStatus = (...values) => {
  const combined = values.filter(Boolean).join(' ').toLowerCase()
  if (combined.includes('remote')) return 'Remote'
  if (combined.includes('hybrid')) return 'Hybrid'
  return 'On-site'
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeText(value)
  if (!normalized || isRemoteStatusToken(normalized)) return null
  return titleCaseWords(normalized)
}

const normalizeLocation = (value) => {
  const normalized = normalizeText(value)
  if (!normalized || isRemoteStatusToken(normalized)) {
    return { location: null, city: null }
  }

  if (/,?\s*india$/i.test(normalized)) {
    return {
      location: normalized,
      city: normalizeText(normalized.replace(/,?\s*india$/i, '')),
    }
  }

  return {
    location: `${normalized}, India`,
    city: normalized,
  }
}

const isSameDomainDetail = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase() === 'credresolve.co.in'
  } catch {
    return false
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeText(page)

  return /<title>\s*CredResolve Advisory Services/i.test(page)
    && /\bCredResolve Advisory Services\b/i.test(normalized)
    && /\bLoan Settlement and Financial Resolution Experts in India\b/i.test(normalized)
    && /\bAbout CredResolve\b/i.test(normalized)
    && /\bJob Openings\b/i.test(normalized)
    && /contact@credresolve\.co\.in/i.test(normalized)
}

export const hasOfficialJobOpeningsSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeText(page)

  return /<title>\s*Job Openings\s*(?:-|–|—|&#8211;|&ndash;|&mdash;)\s*CredResolve Advisory Services/i.test(page)
    && /\bJob Openings\b/i.test(normalized)
    && /\bCredResolve Advisory Services\b/i.test(normalized)
    && /\bBack Office Executive\b/i.test(normalized)
    && /\bCustomer Support Executive\b/i.test(normalized)
}

const assertVerifiedFeed = (records) => {
  if (!Array.isArray(records)) {
    throw new Error('CredResolve verified WP Job Openings feed no longer matches the public archive')
  }

  for (const record of records) {
    const classList = Array.isArray(record?.class_list) ? record.class_list : []
    if (!classList.includes('type-awsm_job_openings') || !isSameDomainDetail(record?.link)) {
      throw new Error('CredResolve verified WP Job Openings feed no longer matches the public archive')
    }
  }

  return records
}

export const buildSearchUrl = (page, pageSize = PAGE_SIZE) => {
  const url = new URL(CAREERS_API_URL)
  url.searchParams.set('_fields', 'id,link,title,content,class_list')
  url.searchParams.set('per_page', String(pageSize))
  url.searchParams.set('page', String(page))
  return url.toString()
}

export const extractSearchResults = (records) => assertVerifiedFeed(records)
  .map((record) => {
    const contentHtml = String(record?.content?.rendered ?? '')
    const department = extractFieldValue(contentHtml, 'Job Category')
    const requirements = extractListAfterHeading(contentHtml, 'Requirements')
    const description = extractDescriptionParts(contentHtml).join(' ') || null
    const locationField = extractFieldValue(contentHtml, 'Job Location')
    const typeField = extractFieldValue(contentHtml, 'Job Type')
    const location = normalizeLocation(locationField)

    return {
      title: normalizeText(record?.title?.rendered),
      company: COMPANY,
      department,
      location: location.location,
      city: location.city,
      country: 'India',
      jobId: record?.id == null ? null : String(record.id),
      requisitionId: record?.id == null ? null : String(record.id),
      sourceUrl: normalizeText(record?.link),
      applyUrl: normalizeText(record?.link),
      employmentType: normalizeEmploymentType(typeField),
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: requirements,
      postingDate: null,
      closingDate: null,
      jobDescription: description,
      remoteStatus: normalizeRemoteStatus(locationField, typeField),
    }
  })
  .filter((job) => job.title && job.jobId && job.sourceUrl)

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
  },
  label: SOURCE,
  timeoutMs: 30000,
})

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 30000,
})

export const createCredresolveScraper = ({
  pageSize = PAGE_SIZE,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('CredResolve verified official homepage surface no longer matches the known first-party site')
    }

    const jobOpeningsHtml = await fetchText(JOB_OPENINGS_URL)
    if (!hasOfficialJobOpeningsSignal(jobOpeningsHtml)) {
      throw new Error('CredResolve verified official job openings surface no longer matches the known first-party site')
    }

    const jobs = []

    for (let page = 1; ; page += 1) {
      const pageRecords = assertVerifiedFeed(await fetchJson(buildSearchUrl(page, pageSize)))
      jobs.push(...extractSearchResults(pageRecords).map((job) => ({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: now(),
      })))

      if (pageRecords.length < pageSize) break
    }

    return jobs
  },
})

export const run = async (options = {}) => createCredresolveScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
