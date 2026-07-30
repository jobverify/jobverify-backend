import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry } from '../utils/fetch.js'

import DATAIKU_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = DATAIKU_CATALOG.source
export const COMPANY = DATAIKU_CATALOG.companyName
export const CAREERS_URL = DATAIKU_CATALOG.companyCareerPage
export const GREENHOUSE_BOARD_URL = 'https://job-boards.greenhouse.io/dataiku'
export const GREENHOUSE_API_URL = 'https://boards-api.greenhouse.io/v1/boards/dataiku/jobs?content=true'
export const VERIFIED_ON = DATAIKU_CATALOG.verifiedOn

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;|&#8217;/gi, "'")
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const decodeHtml = (value) => normalizeWhitespace(value)

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const metadataIncludesIndia = (metadata = []) =>
  (Array.isArray(metadata) ? metadata : []).some((entry) =>
    /country|location|office/i.test(String(entry?.name ?? ''))
    && /\bindia\b/i.test(String(entry?.value ?? '')))

export const isIndiaJob = (job = {}) => {
  const locationText = [
    job?.location?.name,
    ...(Array.isArray(job?.offices) ? job.offices.map((office) => office?.location ?? office?.name) : []),
  ]
    .filter(Boolean)
    .join(' ')

  return /\bindia\b/i.test(locationText) || metadataIncludesIndia(job.metadata)
}

const inferCity = (locationName) => normalizeWhitespace(String(locationName ?? '').split(',')[0]) || null

const mapJob = (job = {}) => {
  const location = normalizeWhitespace(job?.location?.name)
  const sourceUrl = normalizeWhitespace(job?.absolute_url)
  const title = normalizeWhitespace(job?.title)

  if (!title || !location || !sourceUrl) return null

  return {
    title,
    company: COMPANY,
    department: normalizeWhitespace(job?.departments?.[0]?.name) || null,
    location,
    city: inferCity(location),
    country: 'India',
    jobId: String(job?.id ?? ''),
    requisitionId: normalizeWhitespace(job?.requisition_id) || null,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: normalizeWhitespace(job?.updated_at)?.slice(0, 10) || null,
    closingDate: null,
    jobDescription: decodeHtml(job?.content),
  }
}

export const extractJobsFromGreenhousePayload = (payload = {}) =>
  (Array.isArray(payload?.jobs) ? payload.jobs : [])
    .filter(isIndiaJob)
    .map(mapJob)
    .filter(Boolean)

export const createDataikuScraper = () => ({
  async run({ fetchJson = defaultFetchJson, now = () => new Date().toISOString() } = {}) {
    const payload = await fetchJson(GREENHOUSE_API_URL)
    const jobs = extractJobsFromGreenhousePayload(payload)

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createDataikuScraper().run(options)

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
