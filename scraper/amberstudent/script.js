import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'amberstudent'
export const COMPANY = 'Amberstudent'
export const VERIFIED_ON = '2026-08-01'
export const CAREERS_URL = 'https://amberstudent.com/career'
export const SMARTRECRUITERS_BOARD_URL = 'https://careers.smartrecruiters.com/amberstudent'
export const SMARTRECRUITERS_LISTING_API_URL =
  'https://api.smartrecruiters.com/v1/companies/amberstudent/postings'
export const SMARTRECRUITERS_DETAIL_API_URL_TEMPLATE =
  'https://api.smartrecruiters.com/v1/companies/amberstudent/postings/{{jobId}}'

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobverify scraper)'
const PAGE_SIZE = 100

const decodeHtml = (value = '') =>
  String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
    .replace(/&#8211;|&ndash;/gi, '-')
    .replace(/&#8212;|&mdash;/gi, '-')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtml(String(value))
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value = '') =>
  normalizeWhitespace(
    decodeHtml(String(value))
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '\n')
      .replace(/<p\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )

const normalizeUrl = (value) => {
  try {
    return new URL(String(value ?? '')).toString()
  } catch {
    return null
  }
}

const slugify = (value) =>
  normalizeWhitespace(value)
    ?.toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || ''

const buildListingApiUrl = (offset = 0) => {
  const url = new URL(SMARTRECRUITERS_LISTING_API_URL)
  url.searchParams.set('limit', String(PAGE_SIZE))
  url.searchParams.set('country', 'in')
  url.searchParams.set('offset', String(offset))
  return url.toString()
}

const buildDetailApiUrl = (jobId) =>
  SMARTRECRUITERS_DETAIL_API_URL_TEMPLATE.replace('{{jobId}}', encodeURIComponent(String(jobId)))

const buildPostingUrl = (posting = {}) => {
  const jobId = normalizeWhitespace(posting.id)
  const title = normalizeWhitespace(posting.name)
  const companyIdentifier = normalizeWhitespace(posting.company?.identifier) || 'AmberStudent'

  if (!jobId || !title) return null
  return `https://jobs.smartrecruiters.com/${companyIdentifier}/${jobId}-${slugify(title)}`
}

const sectionText = (detail = {}, key) => stripTags(detail.jobAd?.sections?.[key]?.text)

const resolveLocation = (posting = {}) => {
  const location = posting.location || {}
  return normalizeWhitespace(location.fullLocation)
    || [location.city, location.region, 'India'].map(normalizeWhitespace).filter(Boolean).join(', ')
    || null
}

const isPublicPosting = (posting = {}) =>
  normalizeWhitespace(posting.visibility)?.toUpperCase() === 'PUBLIC'

const isIndiaPosting = (posting = {}) => {
  const country = normalizeWhitespace(posting.location?.country)?.toLowerCase()
  if (country === 'in' || country === 'india') return true
  return /\bIndia\b/i.test(resolveLocation(posting) || '')
}

const getRemoteStatus = (posting = {}) => {
  if (posting.location?.remote) return 'Remote'
  if (posting.location?.hybrid) return 'Hybrid'
  return 'On-site'
}

const mapSmartRecruitersJob = (posting = {}, detail = {}, scrapedAt) => {
  const merged = {
    ...posting,
    ...detail,
    location: detail.location || posting.location,
  }
  const title = normalizeWhitespace(merged.name)
  const jobId = normalizeWhitespace(merged.id)
  const location = resolveLocation(merged)
  const sourceUrl = normalizeUrl(merged.postingUrl) || buildPostingUrl(merged)
  const applyUrl = normalizeUrl(merged.applyUrl) || (sourceUrl ? `${sourceUrl}?oga=true` : null)

  if (!title || !jobId || !location || !sourceUrl) {
    throw new Error('Amberstudent SmartRecruiters payload no longer exposes the verified public job fields')
  }

  return {
    title,
    company: COMPANY,
    department:
      normalizeWhitespace(merged.function?.label)
      || normalizeWhitespace(merged.department?.label),
    location,
    city: normalizeWhitespace(merged.location?.city) || normalizeWhitespace(location.split(',')[0]),
    country: 'India',
    link: sourceUrl,
    applyUrl,
    sourceUrl,
    source: SOURCE,
    jobId,
    requisitionId: normalizeWhitespace(merged.refNumber),
    employmentType: normalizeWhitespace(merged.typeOfEmployment?.label),
    experienceRequired: null,
    experienceLevel: normalizeWhitespace(merged.experienceLevel?.label),
    minimumQualification: sectionText(detail, 'qualifications'),
    preferredQualification: sectionText(detail, 'additionalInformation'),
    requiredSkills: [],
    postingDate: normalizeWhitespace(merged.releasedDate),
    closingDate: null,
    jobDescription: sectionText(detail, 'jobDescription') || 'Apply via the Amberstudent careers page.',
    remoteStatus: getRemoteStatus(merged),
    scrapedAt,
  }
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /<title[^>]*>\s*Careers at Amber - Join Our Team\s*<\/title>/i.test(page)
    && text.includes('Your Next Big Break')
    && text.includes('Find Roles')
    && /\bAmber\b/i.test(text)
}

export const hasVerifiedJobsBoardSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /<title[^>]*>\s*Careers at Amber Student\s*<\/title>/i.test(page)
    && text.includes('Jobs at Amber Student')
    && text.includes('Pune,, India')
    && text.includes('1 job')
    && /jobs\.smartrecruiters\.com\/amberstudent\/743999728950415-sales-associate/i.test(page)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: `${SOURCE}-html`,
  timeoutMs: 15000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
    Referer: CAREERS_URL,
  },
  label: `${SOURCE}-json`,
  timeoutMs: 15000,
})

export const createAmberstudentScraper = ({
  maxJobs = null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error(
        'Amberstudent verified first-party careers page no longer matches the trusted public jobs surface',
      )
    }

    const boardHtml = await fetchText(SMARTRECRUITERS_BOARD_URL)
    if (!hasVerifiedJobsBoardSignal(boardHtml)) {
      throw new Error(
        'Amberstudent verified SmartRecruiters jobs board no longer matches the trusted public jobs surface',
      )
    }

    const scrapedAt = now()
    const jobs = []
    let offset = 0

    while (!Number.isFinite(maxJobs) || jobs.length < maxJobs) {
      const payload = await fetchJson(buildListingApiUrl(offset))
      const postings = Array.isArray(payload?.content) ? payload.content : null

      if (!postings) {
        throw new Error('Amberstudent SmartRecruiters listings payload no longer returns content[]')
      }

      for (const posting of postings) {
        const companyIdentifier = normalizeWhitespace(posting.company?.identifier)
        if (companyIdentifier && companyIdentifier.toLowerCase() !== 'amberstudent') {
          throw new Error('Amberstudent SmartRecruiters payload company identifier changed')
        }

        if (!isPublicPosting(posting) || !isIndiaPosting(posting)) continue

        const detailUrl = normalizeUrl(posting.ref) || buildDetailApiUrl(posting.id)
        const detail = await fetchJson(detailUrl)
        jobs.push(mapSmartRecruitersJob(posting, detail, scrapedAt))

        if (Number.isFinite(maxJobs) && jobs.length >= maxJobs) break
      }

      const totalFound = Number(payload?.totalFound)
      offset += postings.length
      if (!postings.length || !Number.isFinite(totalFound) || offset >= totalFound) break
    }

    if (jobs.length === 0) {
      throw new Error('Amberstudent SmartRecruiters API returned no public India jobs')
    }

    return Number.isFinite(maxJobs) ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async (options = {}) => createAmberstudentScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
