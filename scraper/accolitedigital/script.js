import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'
import { fetchJsonWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://www.bounteous.com/careers/search-results'
export const TURBOHIRE_ENDPOINT = 'https://www.bounteous.com/turbohire/api/'
export const BOUNTEOUS_JOB_ROUTE_PREFIX = 'https://www.bounteous.com/careers/job/'

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
  Accept: 'application/json',
}

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const formatExperience = (experience = {}) => {
  const min = Number.isFinite(experience?.MinExp) ? experience.MinExp : null
  const max = Number.isFinite(experience?.MaxExp) ? experience.MaxExp : null

  if (min != null && max != null) {
    if (min === max) return `${min} year${min === 1 ? '' : 's'}`
    return `${min}-${max} years`
  }

  if (min != null) return `${min}+ years`
  if (max != null) return `Up to ${max} years`
  return null
}

const toRemoteStatus = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (normalized === 'remote') return 'Remote'
  if (normalized === 'hybrid') return 'Hybrid'
  if (normalized === 'onsite' || normalized === 'on-site') return 'On-site'
  return null
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null

  return normalizeWhitespace(
    normalized
      .split(/,| - /)
      .map((part) => normalizeWhitespace(part))
      .find(Boolean),
  )
}

const normalizeIndiaLocation = (value) => {
  const location = normalizeWhitespace(value)
  if (!location) return 'India'
  if (/\bindia\b/i.test(location)) return location
  return `${location}, India`
}

const isAccoliteDepartment = (job) => {
  const values = [
    job?.department,
    job?.categories?.department,
    job?.categories?.team,
  ]
  return values.some((value) => /accolite/i.test(normalizeWhitespace(value) || ''))
}

const isIndiaValue = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return false
  return normalized === 'in'
    || normalized === 'india'
    || normalized.endsWith(', india')
    || normalized.includes(' india')
}

const isIndiaJob = (job) => {
  const candidates = [
    job?.country,
    job?.categories?.country,
    job?.categories?.location,
    ...(Array.isArray(job?.categories?.allLocations) ? job.categories.allLocations : []),
  ]

  return candidates.some((candidate) => isIndiaValue(candidate))
}

const buildTurboHireJobUrl = (jobId) => (
  jobId ? `${BOUNTEOUS_JOB_ROUTE_PREFIX}${jobId}` : null
)

const mapTurboHireJob = (job) => {
  const rawLocation = normalizeWhitespace(
    job?.categories?.location
    || job?.categories?.allLocations?.[0]
    || job?.country
    || null,
  )
  const location = normalizeIndiaLocation(rawLocation)
  const sourceUrl = buildTurboHireJobUrl(normalizeWhitespace(job?.id))
  const applyUrl = normalizeWhitespace(job?.applyUrl) || sourceUrl

  if (!job?.id || !job?.text || !sourceUrl || !isIndiaJob(job) || !isAccoliteDepartment(job)) {
    return null
  }

  return {
    title: normalizeWhitespace(job.text),
    company: 'Accolite Digital',
    department: normalizeWhitespace(job?.categories?.department || job?.categories?.team || job?.department),
    location,
    city: extractCity(rawLocation === 'in' ? 'India' : rawLocation),
    country: 'India',
    jobId: normalizeWhitespace(job?.id),
    requisitionId: normalizeWhitespace(job?.id_raw || job?.id),
    sourceUrl,
    applyUrl,
    employmentType: normalizeWhitespace(job?.categories?.commitment),
    experienceRequired: formatExperience(job?.experience),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: Array.isArray(job?.skills)
      ? job.skills.map((skill) => normalizeWhitespace(skill)).filter(Boolean)
      : [],
    postingDate: normalizeWhitespace(job?.postedDate || job?.createdAt) || null,
    closingDate: null,
    jobDescription: stripTags(job?.description),
    remoteStatus: toRemoteStatus(job?.workplaceType),
  }
}

export const extractSearchResults = (payload = {}) =>
  (Array.isArray(payload?.response) ? payload.response : [])
    .map((job) => mapTurboHireJob(job))
    .filter(Boolean)

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: DEFAULT_HEADERS,
  label: 'accolitedigital',
})

export const createAccoliteDigitalScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchJson = options.fetchJson || defaultFetchJson
    const payload = await fetchJson(TURBOHIRE_ENDPOINT)
    const jobs = extractSearchResults(payload)
      .map((job) => ({
        ...job,
        source: 'accolitedigital',
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: new Date().toISOString(),
      }))

    return maxJobs ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async () => createAccoliteDigitalScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Accolite Digital scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'accolitedigital')
    console.log('DB result:', result)
    process.exit(0)
  }
}
