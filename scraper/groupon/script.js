import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'
import GROUPON_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = GROUPON_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const CAREERS_URL = PROVIDER_METADATA.officialCareersLandingUrl
export const BOARD_URL = PROVIDER_METADATA.officialJobsBoardUrl
export const GREENHOUSE_JOBS_API_URL = PROVIDER_METADATA.greenhouseJobsApiUrl
export const GREENHOUSE_JOB_BASE_URL = PROVIDER_METADATA.greenhouseJobBaseUrl

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const decodeRepeatedHtmlEntities = (value, maxPasses = 4) => {
  let current = String(value ?? '')

  for (let index = 0; index < maxPasses; index += 1) {
    const decoded = decodeHtmlEntities(current)
    if (decoded === current) break
    current = decoded
  }

  return current.replace(/\u00a0/g, ' ').trim()
}

const stripTags = (value) =>
  normalizeWhitespace(
    String(value ?? '')
      .replace(/<(br|\/p|\/div|\/li|\/ul|\/ol|\/h[1-6]|\/section)\b[^>]*>/gi, '\n')
      .replace(/<(p|div|li|ul|ol|h[1-6]|section)\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )

const normalizeDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const isoPrefixMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoPrefixMatch) {
    return isoPrefixMatch[1]
  }

  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? normalized : parsed.toISOString().slice(0, 10)
}

const normalizeLocationLabel = (value) => normalizeWhitespace(value)

const deriveCity = (location) => {
  const normalized = normalizeLocationLabel(location)
  if (!normalized) return null

  return normalizeWhitespace(
    normalized
      .split(',')[0]
      .split('(')[0],
  )
}

const inferCountry = (location) => {
  const normalized = normalizeLocationLabel(location)
  if (!normalized) return null

  if (/\bindia\b/i.test(normalized)) return 'India'
  if (/\bunited states\b/i.test(normalized)) return 'United States'
  return null
}

const extractExperienceRequired = (description) => {
  const normalizedDescription = normalizeWhitespace(description)
  if (!normalizedDescription) return null

  const plusMatch = normalizedDescription.match(/\b(\d+\+\s*years?)\b/i)
  if (plusMatch) {
    return normalizeWhitespace(plusMatch[1])?.toLowerCase() || null
  }

  const rangeMatch = normalizedDescription.match(/\b(\d+\s*-\s*\d+\s*years?)\b/i)
  if (rangeMatch) {
    return normalizeWhitespace(rangeMatch[1])?.toLowerCase() || null
  }

  return null
}

const toAbsoluteUrl = (value, baseUrl) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchJson = (url, options = {}) => fetchJsonWithRetry(url, {
  method: options.method,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
    Referer: BOARD_URL,
    ...(options.headers || {}),
  },
  body: options.body,
  label: SOURCE,
  timeoutMs: 15000,
})

export const buildGreenhouseJobsApiUrl = () => `${GREENHOUSE_JOBS_API_URL}?content=true`

export const extractOfficialBoardUrl = (html = '') => {
  const match = String(html ?? '').match(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>\s*Apply now and join the Groupon team!\s*<\/a>/i,
  )

  return toAbsoluteUrl(match?.[1], CAREERS_URL)
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')

  return /<title>\s*Why Groupon\s*<\/title>/i.test(page)
    && /Meaningful Work\. Happy Teams\. Great Deals\./i.test(page)
    && /Bangalore and Chennai/i.test(page)
    && /Apply now and join the Groupon team!/i.test(page)
    && extractOfficialBoardUrl(page) === BOARD_URL
}

export const extractVisibleJobUrls = (html = '') => {
  const matches = String(html ?? '').matchAll(
    /https:\/\/job-boards\.eu\.greenhouse\.io\/groupon\/jobs\/(\d+)/gi,
  )

  const urls = []
  const seen = new Set()

  for (const match of matches) {
    const jobId = normalizeWhitespace(match[1])
    if (!jobId) continue

    const normalized = `${GREENHOUSE_JOB_BASE_URL}/${jobId}`
    if (seen.has(normalized)) continue

    seen.add(normalized)
    urls.push(normalized)
  }

  return urls
}

export const normalizeGreenhouseJobUrl = (value, jobId) => {
  const canonicalJobId = normalizeWhitespace(jobId)
  if (!canonicalJobId) return null

  try {
    const url = new URL(String(value ?? ''))
    const normalizedHost = url.hostname.replace(/^www\./i, '').toLowerCase()
    const normalizedPathname = url.pathname.replace(/\/+$/, '')
    const expectedPathname = `/groupon/jobs/${canonicalJobId}`

    if (normalizedHost !== 'job-boards.eu.greenhouse.io') return null
    if (normalizedPathname !== expectedPathname) return null

    return `${GREENHOUSE_JOB_BASE_URL}/${canonicalJobId}`
  } catch {
    return null
  }
}

export const extractJobsFromGreenhousePayload = (
  payload,
  {
    scrapedAt = new Date().toISOString(),
  } = {},
) => {
  const jobs = Array.isArray(payload?.jobs) ? payload.jobs : null
  if (!jobs) {
    throw new Error('Groupon Greenhouse jobs API response no longer matches the expected payload')
  }

  return jobs.map((job) => {
    const title = normalizeWhitespace(job?.title)
    const location = normalizeLocationLabel(job?.location?.name)
    const sourceUrl = normalizeGreenhouseJobUrl(job?.absolute_url, job?.id)
    const companyName = normalizeWhitespace(job?.company_name)
    const jobDescription = stripTags(decodeRepeatedHtmlEntities(job?.content))

    if (companyName && companyName.toLowerCase() !== COMPANY.toLowerCase()) {
      throw new Error('Groupon Greenhouse jobs API no longer maps to the verified company identity')
    }

    if (!title || !sourceUrl) {
      throw new Error('Groupon Greenhouse payload no longer exposes the verified public Greenhouse detail URLs')
    }

    return {
      title,
      company: COMPANY,
      location,
      city: deriveCity(location),
      country: inferCountry(location),
      link: sourceUrl,
      applyUrl: sourceUrl,
      sourceUrl,
      source: SOURCE,
      jobId: job?.id ?? null,
      requisitionId: normalizeWhitespace(job?.requisition_id),
      department: normalizeWhitespace(job?.departments?.[0]?.name),
      employmentType: null,
      experienceRequired: extractExperienceRequired(jobDescription),
      postingDate: normalizeDate(job?.updated_at || job?.first_published),
      closingDate: null,
      jobDescription,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      scrapedAt,
    }
  })
}

export const createGrouponScraper = ({
  maxJobs = null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Groupon verified Groupon careers page no longer matches the official first-party surface')
    }

    const boardHtml = await fetchText(BOARD_URL)
    const visibleJobUrls = extractVisibleJobUrls(boardHtml)
    if (visibleJobUrls.length === 0) {
      throw new Error('Groupon visible Groupon Greenhouse job links are no longer exposed on the official board')
    }

    let jobs
    try {
      jobs = extractJobsFromGreenhousePayload(
        await fetchJson(buildGreenhouseJobsApiUrl(), { method: 'GET' }),
        { scrapedAt: now() },
      )
    } catch (error) {
      if (/verified public Greenhouse detail URLs/i.test(error?.message || '')) {
        throw new Error('Groupon verified Groupon Greenhouse board links no longer match the Greenhouse jobs API surface')
      }
      throw error
    }

    const visibleJobUrlSet = new Set(visibleJobUrls)
    if (!jobs.every((job) => visibleJobUrlSet.has(job.sourceUrl))) {
      throw new Error('Groupon verified Groupon Greenhouse board links no longer match the Greenhouse jobs API surface')
    }

    return Number.isFinite(maxJobs) ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async (options = {}) => createGrouponScraper(options).run(options)

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
