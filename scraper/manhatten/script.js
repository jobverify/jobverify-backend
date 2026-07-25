import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchWorkdayJobsApiPage } from '../myworkday/engine.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'manhatten'
export const COMPANY = 'Manhattan Associates'
export const CAREERS_PAGE_URL = 'https://www.manh.com/en-in/about-us/careers'
export const WORKDAY_SEARCH_URL = 'https://manh.wd5.myworkdayjobs.com/en-US/External/jobs'
export const WORKDAY_JOBS_API_URL = 'https://manh.wd5.myworkdayjobs.com/wday/cxs/manh/External/jobs'
export const WORKDAY_DETAIL_URL_BASE = 'https://manh.wd5.myworkdayjobs.com/en-US/External'
export const WORKDAY_SEARCH_TEXT = 'India'

const INDIA_LOCATION_PATTERN =
  /\b(india|bangalore|bengaluru|mumbai|pune|hyderabad|chennai|gurugram|gurgaon|noida|delhi)\b/i

const normalizeWhitespace = (value) => {
  const normalized = String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const extractJobId = (job) => {
  const externalPath = normalizeWhitespace(job?.externalPath)
  const pathMatch = externalPath?.match(/_([A-Za-z0-9]+)$/)
  if (pathMatch) return pathMatch[1]

  return Array.isArray(job?.bulletFields)
    ? normalizeWhitespace(job.bulletFields[0])
    : null
}

const buildWorkdayDetailUrl = (externalPath) => {
  const normalizedPath = normalizeWhitespace(externalPath)
  if (!normalizedPath?.startsWith('/')) return null

  try {
    return `${WORKDAY_DETAIL_URL_BASE}${normalizedPath}`
  } catch {
    return null
  }
}

const normalizeCity = (location) => normalizeWhitespace(location)
  ?.replace(/\s*,?\s*India$/i, '')
  .trim() || null

const normalizeLocation = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return 'India'
  return /\bindia\b/i.test(normalized) ? normalized : `${normalized}, India`
}

const isIndiaPosting = (job) => INDIA_LOCATION_PATTERN.test(normalizeWhitespace(job?.locationsText) || '')

const mapWorkdayPosting = (job, { scrapedAt }) => {
  if (!isIndiaPosting(job)) return null

  const title = normalizeWhitespace(job?.title)
  const jobId = extractJobId(job)
  const link = buildWorkdayDetailUrl(job?.externalPath)
  if (!title || !jobId || !link) return null

  const location = normalizeLocation(job.locationsText)

  return {
    title,
    company: COMPANY,
    department: null,
    location,
    city: normalizeCity(location),
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl: link,
    applyUrl: link,
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
    remoteStatus: 'On-site',
    companyCareerPage: CAREERS_PAGE_URL,
    companyDomain: 'manh.com',
    atsPlatform: 'workday-jobs-api',
    source: SOURCE,
    link,
    scrapedAt,
  }
}

export const extractWorkdayJobs = (payload, { scrapedAt = new Date().toISOString() } = {}) =>
  (Array.isArray(payload?.jobPostings) ? payload.jobPostings : [])
    .map((job) => mapWorkdayPosting(job, { scrapedAt }))
    .filter(Boolean)

export const createManhattenScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchJobsPage = fetchWorkdayJobsApiPage } = {}) {
    const request = {
      jobsApiUrl: WORKDAY_JOBS_API_URL,
      bootstrapUrl: WORKDAY_SEARCH_URL,
      appliedFacets: {},
      offset: 0,
      limit: 20,
      searchText: WORKDAY_SEARCH_TEXT,
      source: SOURCE,
    }
    const payload = await fetchJobsPage(request)
    return extractWorkdayJobs(payload, { scrapedAt: now() })
  },
})

export const run = async (options = {}) => createManhattenScraper().run(options)

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
