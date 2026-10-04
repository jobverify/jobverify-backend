import path from 'node:path'
import { fileURLToPath } from 'node:url'

import SIGMA_SOLVE_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = SIGMA_SOLVE_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_PAGE_URL = PROVIDER_METADATA.officialCareersPageUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&amp;amp;/gi, '&')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(String(value))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/section|\/article|\/li|\/ul|\/ol|\/h[1-6]|\/span)\b[^>]*>/gi, '\n')
    .replace(/<(p|div|section|article|li|ul|ol|h[1-6]|span)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (/full/.test(normalized)) return 'Full-time'
  if (/part/.test(normalized)) return 'Part-time'
  if (/contract/.test(normalized)) return 'Contract'
  if (/intern/.test(normalized)) return 'Internship'
  return normalizeWhitespace(value)
}

const toAbsoluteUrl = (value) => {
  try {
    return new URL(String(value ?? ''), 'https://www.sigmasolve.com').toString()
  } catch {
    return null
  }
}

const getJobIdFromUrl = (value) => {
  try {
    const pathname = new URL(String(value ?? '')).pathname.replace(/\/+$/, '')
    return normalizeWhitespace(pathname.split('/').pop())
  } catch {
    return null
  }
}

const parseLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) {
    return {
      location: null,
      city: null,
      state: null,
      country: null,
    }
  }

  const parts = normalized.split(',').map((part) => normalizeWhitespace(part)).filter(Boolean)
  if (parts.length === 1) {
    return {
      location: normalized,
      city: null,
      state: null,
      country: normalized,
    }
  }

  return {
    location: normalized,
    city: parts[0] || null,
    state: parts.length > 2 ? parts[1] : null,
    country: parts[parts.length - 1] || null,
  }
}

const extractMetaDescription = (html = '') =>
  normalizeWhitespace(String(html ?? '').match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1])

const extractLabeledValue = (html = '', label) =>
  normalizeWhitespace(String(html ?? '').match(
    new RegExp(
      `<span[^>]*>\\s*${label}\\s*<\\/span>\\s*<span[^>]*>([\\s\\S]*?)<\\/span>`,
      'i',
    ),
  )?.[1])

export const hasOfficialOpeningsPageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /<title>\s*Open Positions(?: - Sigma Solve)? \| Sigma Solve\s*<\/title>/i.test(page)
    && /<meta\s+name=["']description["']\s+content=["']Career opportunities at Sigma Solve\. Explore current openings and apply directly\.["']/i.test(page)
    && /<link[^>]*rel=["']canonical["'][^>]*href=["']https:\/\/www\.sigmasolve\.com\/who-we-are\/openings["']/i.test(page)
    && text.includes('Returning Candidate?')
    && (/Search your job/i.test(text) || /placeholder=["']Search your job here["']/i.test(page))
}

export const extractOpeningSummaries = (html = '') => {
  const summaries = []

  for (const match of String(html ?? '').matchAll(
    /<a[^>]*href=["'](\/who-we-are\/open-position\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<p[^>]*>([\s\S]*?)<\/p>/gi,
  )) {
    const sourceUrl = toAbsoluteUrl(match[1])
    const title = stripTags(match[2])
    const metaHtml = match[3]
    const metaItems = [...String(metaHtml).matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)]
      .map((item) => stripTags(item[1])?.replace(/^·\s*/, ''))
      .filter(Boolean)

    const employmentType = normalizeEmploymentType(metaItems[0])
    const department = normalizeWhitespace(metaItems[1])

    if (!title || !sourceUrl) continue

    summaries.push({
      title,
      department,
      employmentType,
      sourceUrl,
      applyUrl: sourceUrl,
    })
  }

  return summaries
}

const extractApplyUrl = (html = '', sourceUrl) => {
  const href = String(html ?? '').match(/<a[^>]*href=["']([^"']*\/who-we-are\/apply-for-job\?job=[^"']+)["'][^>]*>/i)?.[1]
  const applyUrl = toAbsoluteUrl(href)
  if (!applyUrl) return null
  const parsed = new URL(applyUrl)
  return parsed.hostname === 'www.sigmasolve.com'
    && parsed.pathname === '/who-we-are/apply-for-job'
    && parsed.searchParams.get('job') === getJobIdFromUrl(sourceUrl)
    ? applyUrl
    : null
}

const hasOfficialDetailPageSignal = (html = '', sourceUrl) => {
  const page = String(html ?? '')
  const canonical = normalizeWhitespace(
    page.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1],
  )

  return /<title>[\s\S]*\|\s*Sigma Solve\s*<\/title>/i.test(page)
    && canonical === sourceUrl
    && Boolean(extractMetaDescription(page))
    && Boolean(extractLabeledValue(page, 'Type'))
    && Boolean(extractLabeledValue(page, 'Location'))
    && Boolean(extractLabeledValue(page, 'Department'))
    && Boolean(extractApplyUrl(page, sourceUrl))
}

export const extractJobsFromDetailPages = (pages = []) => pages.map(({ summary, detailHtml }) => {
  const sourceUrl = summary?.sourceUrl
  const applyUrl = extractApplyUrl(detailHtml, sourceUrl)
  const locationData = parseLocation(extractLabeledValue(detailHtml, 'Location'))
  const title = normalizeWhitespace(
    String(detailHtml ?? '').match(/<title>\s*([\s\S]*?)\s*\|\s*Sigma Solve\s*<\/title>/i)?.[1],
  ) || summary?.title
  const department = extractLabeledValue(detailHtml, 'Department') || summary?.department || null
  const employmentType = normalizeEmploymentType(
    extractLabeledValue(detailHtml, 'Type') || summary?.employmentType,
  )
  const jobId = getJobIdFromUrl(sourceUrl)

  return {
    title,
    company: COMPANY,
    department,
    location: locationData.location,
    city: locationData.city,
    state: locationData.state,
    country: locationData.country,
    jobId,
    requisitionId: jobId,
    sourceUrl,
    applyUrl,
    employmentType,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: extractMetaDescription(detailHtml),
    remoteStatus: 'On-site',
  }
})

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const createSigmaSolveScraper = ({
  maxJobs = null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const openingsHtml = await fetchText(CAREERS_PAGE_URL)
    if (!hasOfficialOpeningsPageSignal(openingsHtml)) {
      throw new Error('Response is not the verified Sigma Solve openings page')
    }

    const summaries = extractOpeningSummaries(openingsHtml)
    if (summaries.length === 0) {
      throw new Error('Trusted Sigma Solve opening cards no longer match the verified public surface')
    }

    const selectedSummaries = Number.isInteger(maxJobs) && maxJobs > 0
      ? summaries.slice(0, maxJobs)
      : summaries

    const detailPages = []
    for (const summary of selectedSummaries) {
      const detailHtml = await fetchText(summary.sourceUrl)
      if (!hasOfficialDetailPageSignal(detailHtml, summary.sourceUrl)) {
        throw new Error('Response is not the verified Sigma Solve detail page')
      }

      detailPages.push({
        summary,
        detailHtml,
      })
    }

    return extractJobsFromDetailPages(detailPages).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createSigmaSolveScraper(options).run(options)

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
