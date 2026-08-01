import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { SIGMA_COMPUTING_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = SIGMA_COMPUTING_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const GREENHOUSE_BOARD_URL = PROVIDER_METADATA.greenhouseBoardUrl
export const GREENHOUSE_JOBS_API_URL = PROVIDER_METADATA.greenhouseJobsApiUrl

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;|&#8217;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const decodeHtml = (value) => normalizeWhitespace(value)

const collectLocationValues = (job = {}) => [
  normalizeWhitespace(job?.location?.name),
  ...(Array.isArray(job?.offices)
    ? job.offices.map((office) => normalizeWhitespace(office?.location || office?.name))
    : []),
  ...(Array.isArray(job?.metadata)
    ? job.metadata.map((entry) => normalizeWhitespace(entry?.value))
    : []),
].filter(Boolean)

const hasIndiaMarker = (value) => /\bindia\b/i.test(String(value ?? ''))

const inferCity = (location) => {
  const firstToken = normalizeWhitespace(location)?.split(',')[0]?.trim()
  if (!firstToken || /^india$/i.test(firstToken)) return null
  return firstToken
}

const defaultFetchText = (url, { signal } = {}) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
  signal,
})

const defaultFetchJson = (url, { signal } = {}) => fetchJsonWithRetry(url, {
  method: 'GET',
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
    Referer: CAREERS_URL,
  },
  label: SOURCE,
  timeoutMs: 15000,
  signal,
})

export const buildGreenhouseJobsApiUrl = () => `${GREENHOUSE_JOBS_API_URL}?content=true`

export const normalizeGreenhouseJobUrl = (value, jobId) => {
  const canonicalJobId = normalizeWhitespace(jobId)
  if (!canonicalJobId) return null

  try {
    const url = new URL(value)
    const hostname = url.hostname.replace(/^www\./i, '').toLowerCase()
    const pathname = url.pathname.replace(/\/+$/, '')

    if (hostname !== 'job-boards.greenhouse.io') return null
    if (pathname !== `/sigmacomputing/jobs/${canonicalJobId}`) return null

    return `https://job-boards.greenhouse.io/sigmacomputing/jobs/${canonicalJobId}`
  } catch {
    return null
  }
}

export const hasOfficialCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return /<title>\s*Careers and Open Positions\s*\|\s*Sigma\s*<\/title>/i.test(page)
    && normalized.includes('Careers at Sigma')
    && normalized.includes('View open positions')
    && /job-boards\.greenhouse\.io\/sigmacomputing\/jobs\//i.test(page)
}

export const extractIndiaJobsFromGreenhousePayload = (
  payload,
  { scrapedAt = new Date().toISOString() } = {},
) => {
  const jobs = Array.isArray(payload?.jobs) ? payload.jobs : null
  if (!jobs) {
    throw new Error('Sigma Computing Greenhouse jobs API response no longer matches the expected payload')
  }

  return jobs.flatMap((job) => {
    const title = normalizeWhitespace(job?.title)
    const companyName = normalizeWhitespace(job?.company_name)
    const sourceUrl = normalizeGreenhouseJobUrl(job?.absolute_url, job?.id)

    if (companyName && companyName.toLowerCase() !== COMPANY_NAME.toLowerCase()) {
      throw new Error('Sigma Computing Greenhouse payload no longer maps to the verified company identity')
    }

    if (!title || !sourceUrl) {
      throw new Error('Sigma Computing Greenhouse payload no longer exposes the verified Greenhouse detail route')
    }

    const location = collectLocationValues(job).find((value) => hasIndiaMarker(value))
    if (!location) return []

    return [{
      title,
      company: COMPANY_NAME,
      location,
      city: inferCity(location),
      country: 'India',
      link: sourceUrl,
      applyUrl: sourceUrl,
      sourceUrl,
      source: SOURCE,
      jobId: String(job?.id),
      requisitionId: normalizeWhitespace(job?.requisition_id),
      department: normalizeWhitespace(job?.departments?.[0]?.name),
      employmentType: null,
      experienceRequired: null,
      jobDescription: decodeHtml(job?.content),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: normalizeWhitespace(job?.updated_at || job?.first_published),
      closingDate: null,
      scrapedAt,
    }]
  })
}

export const createSigmaComputingScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
    signal,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL, { signal })
    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Sigma Computing verified official careers page no longer matches the trusted public surface')
    }

    return extractIndiaJobsFromGreenhousePayload(
      await fetchJson(buildGreenhouseJobsApiUrl(), { signal }),
      { scrapedAt: now() },
    )
  },
})

export const run = async (options = {}) => createSigmaComputingScraper().run(options)

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
