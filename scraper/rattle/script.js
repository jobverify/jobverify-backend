import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'rattle'
export const COMPANY = 'Rattle'
export const GREENHOUSE_BOARD_URL = 'https://job-boards.greenhouse.io/rattle'
export const GREENHOUSE_JOBS_API_URL = 'https://boards-api.greenhouse.io/v1/boards/rattle/jobs'

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

const hasIndiaMarker = (value) => /\bindia\b/i.test(String(value ?? ''))

const inferCity = (location) => {
  const firstToken = normalizeWhitespace(location)?.split(',')[0]?.trim()
  return !firstToken || /^india$/i.test(firstToken) ? null : firstToken
}

export const buildGreenhouseJobsApiUrl = () => `${GREENHOUSE_JOBS_API_URL}?content=true`

export const normalizeGreenhouseJobUrl = (value, jobId) => {
  const canonicalJobId = normalizeWhitespace(jobId)
  if (!canonicalJobId) return null

  try {
    const url = new URL(value)
    const hostname = url.hostname.replace(/^www\./i, '').toLowerCase()
    const pathname = url.pathname.replace(/\/+$/, '')

    if (hostname !== 'job-boards.greenhouse.io') return null
    if (pathname !== `/rattle/jobs/${canonicalJobId}`) return null

    return `https://job-boards.greenhouse.io/rattle/jobs/${canonicalJobId}`
  } catch {
    return null
  }
}

export const extractIndiaJobsFromGreenhousePayload = (
  payload,
  { scrapedAt = new Date().toISOString() } = {},
) => {
  const jobs = Array.isArray(payload?.jobs) ? payload.jobs : null
  if (!jobs) {
    throw new Error('Rattle Greenhouse jobs API response no longer matches the expected payload')
  }

  return jobs.flatMap((job) => {
    const companyName = normalizeWhitespace(job?.company_name)
    if (companyName !== COMPANY) {
      throw new Error('Rattle Greenhouse payload no longer maps to the verified company identity')
    }

    const title = normalizeWhitespace(job?.title)
    const sourceUrl = normalizeGreenhouseJobUrl(job?.absolute_url, job?.id)
    if (!title || !sourceUrl) {
      throw new Error('Rattle Greenhouse payload no longer exposes the verified Greenhouse detail route')
    }

    const location = normalizeWhitespace(job?.location?.name)
    if (!hasIndiaMarker(location)) return []

    return [{
      title,
      company: COMPANY,
      location,
      city: inferCity(location),
      country: 'India',
      link: sourceUrl,
      applyUrl: sourceUrl,
      sourceUrl,
      source: SOURCE,
      jobId: String(job.id),
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

const defaultFetchJson = (url, { signal } = {}) => fetchJsonWithRetry(url, {
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; Jobify scraper)',
    Accept: 'application/json,text/plain,*/*',
    Referer: GREENHOUSE_BOARD_URL,
  },
  label: SOURCE,
  timeoutMs: 15000,
  signal,
})

export const createRattleScraper = () => ({
  async run({
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
    signal,
  } = {}) {
    return extractIndiaJobsFromGreenhousePayload(
      await fetchJson(buildGreenhouseJobsApiUrl(), { signal }),
      { scrapedAt: now() },
    )
  },
})

export const run = async (options = {}) => createRattleScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
