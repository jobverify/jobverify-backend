import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const OPEN_POSITIONS_PAGE_URL = 'https://www.cohesity.com/careers/open-positions/'
export const OPEN_POSITIONS_API_URL = 'https://www.cohesity.com/bin/cohesity/open-positions'

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;|&rsquo;|&#8217;/gi, "'")
    .replace(/&#8211;|&ndash;/gi, '-')
    .replace(/&#8212;|&mdash;/gi, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || null
}

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  return normalized
    .replace(/\s*-\s*India\s*\(Office\)/i, ', India')
    .replace(/^India\s*-\s*Remote$/i, 'India - Remote')
    .replace(/^Cohesity\s*-\s*/i, '')
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  if (/^India\s*-\s*Remote$/i.test(normalized)) return null

  return normalized
    .replace(/,\s*India$/i, '')
    .split(/\s*-\s*|,\s*/)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)[0] || null
}

const flattenJobData = (payload) => Object.values(payload?.job_data || {})
  .flatMap((group) => Array.isArray(group) ? group : [])

const isIndiaJob = (job = {}) => normalizeWhitespace(job.country) === 'India'

export const hasOpenPositionsSignal = (payload) =>
  Array.isArray(payload?.careerSiteDeptList)
  && payload?.job_data
  && payload?.locationsByCountry

export const extractSearchResults = (payload) => flattenJobData(payload)
  .filter((job) => isIndiaJob(job))
  .map((job) => {
    const location = normalizeLocation(job.primaryLocation)

    return {
      title: normalizeWhitespace(job.title),
      company: normalizeWhitespace(job.company) || 'Cohesity',
      department: normalizeWhitespace(job.careerSiteDept),
      location,
      city: extractCity(location),
      country: 'India',
      jobId: normalizeWhitespace(job.JobID) || normalizeWhitespace(job.req_id),
      requisitionId: normalizeWhitespace(job.req_id) || normalizeWhitespace(job.JobID),
      sourceUrl: normalizeWhitespace(job.jobUrl),
      applyUrl: normalizeWhitespace(job.jobUrl),
      employmentType: normalizeWhitespace(job.categories),
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      jobType: normalizeWhitespace(job.jobType),
      additionalLocations: normalizeWhitespace(job.AdditionalLocations) || null,
    }
  })
  .filter((job) => job.title && job.sourceUrl && job.requisitionId)

const defaultFetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      Accept: 'application/json,text/plain,*/*',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const createCohesityScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  fetchJson = defaultFetchJson,
} = {}) => ({
  async run() {
    const payload = await fetchJson(OPEN_POSITIONS_API_URL)

    if (!hasOpenPositionsSignal(payload)) {
      return []
    }

    const jobs = extractSearchResults(payload)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: 'cohesity',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createCohesityScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Cohesity scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'cohesity')
    console.log('DB result:', result)
    process.exit(0)
  }
}
