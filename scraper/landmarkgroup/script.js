import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const LISTING_API_BASE_URL = 'https://efhi.fa.em3.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions'
export const PUBLIC_JOBS_BASE_URL = 'https://efhi.fa.em3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/'
export const SITE_NUMBER = 'CX_1'
export const DEFAULT_LOCATION = 'India'
export const DEFAULT_LIMIT = 24

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || null
}

const toTitleCase = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  return normalized
    .toLowerCase()
    .split(' ')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ')
}

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (/^india$/i.test(normalized)) return 'India'

  return normalized
    .split(',')
    .map((part) => toTitleCase(part))
    .filter(Boolean)
    .join(', ')
}

const extractCity = (location) => {
  const normalized = normalizeLocation(location)
  if (!normalized || /^india$/i.test(normalized)) return null
  return normalized.split(',')[0] || null
}

const joinDescriptionParts = (...parts) => normalizeWhitespace(
  parts
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)
    .join(' '),
)

const getRequisitionList = (payload) => {
  if (Array.isArray(payload?.items)) {
    return payload.items.flatMap((item) => Array.isArray(item?.requisitionList) ? item.requisitionList : [])
  }

  if (Array.isArray(payload?.requisitionList)) {
    return payload.requisitionList
  }

  return []
}

const getSecondaryLocation = (record = {}) =>
  normalizeLocation(record?.secondaryLocations?.[0]?.Name)

const getEffectiveLocation = (record = {}) => {
  const primaryLocation = normalizeLocation(record.PrimaryLocation)
  if (primaryLocation && primaryLocation !== 'India') return primaryLocation

  return getSecondaryLocation(record) || primaryLocation
}

const isIndiaJob = (record = {}) => {
  const country = normalizeWhitespace(record.PrimaryLocationCountry)?.toUpperCase()
  const location = normalizeWhitespace(record.PrimaryLocation)?.toLowerCase()
  const secondaryLocation = normalizeWhitespace(record?.secondaryLocations?.[0]?.Name)?.toLowerCase()

  return (
    country === 'IN'
    || location?.endsWith('india')
    || secondaryLocation?.endsWith('india')
    || false
  )
}

const getEmploymentType = (record = {}) =>
  normalizeWhitespace(
    record.JobSchedule
      || record.RequisitionType
      || record.JobType
      || record.WorkerType
      || record.ContractType,
  )

const toJob = (record = {}) => {
  const jobId = normalizeWhitespace(record.Id)
  const detailUrl = jobId ? buildJobDetailUrl(jobId) : null
  const location = getEffectiveLocation(record)

  return {
    title: normalizeWhitespace(record.Title),
    company: 'Landmark Group',
    department: normalizeWhitespace(record.Department || record.JobFunction || record.JobFamily || record.Category),
    location,
    city: extractCity(location),
    jobId,
    requisitionId: jobId,
    sourceUrl: detailUrl,
    applyUrl: detailUrl,
    employmentType: getEmploymentType(record),
    experienceRequired: null,
    minimumQualification: normalizeWhitespace(record.StudyLevel || record.ExternalQualificationsStr),
    preferredQualification: null,
    requiredSkills: [],
    postingDate: normalizeWhitespace(record.PostedDate),
    closingDate: normalizeWhitespace(record.PostingEndDate),
    jobDescription: joinDescriptionParts(
      record.ShortDescriptionStr,
      record.ExternalResponsibilitiesStr,
    ),
  }
}

export const buildSearchUrl = ({
  page = 0,
  limit = DEFAULT_LIMIT,
  location = DEFAULT_LOCATION,
} = {}) => {
  const normalizedLimit = Number(limit) || DEFAULT_LIMIT
  const offset = Math.max(0, Number(page) || 0) * normalizedLimit

  return `${LISTING_API_BASE_URL}?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=${SITE_NUMBER},limit=${normalizedLimit},offset=${offset},location=${location}`
}

export const buildJobDetailUrl = (jobId) => `${PUBLIC_JOBS_BASE_URL}${jobId}`

export const extractSearchResults = (payload) => getRequisitionList(payload)
  .filter((record) => isIndiaJob(record))
  .map((record) => toJob(record))
  .filter((job) => job.title && job.jobId && job.sourceUrl)

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

export const createLandmarkGroupScraper = ({
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : 1,
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  fetchJson = defaultFetchJson,
} = {}) => ({
  async run() {
    const jobs = []

    for (let page = 0; page < maxPages; page += 1) {
      const payload = await fetchJson(buildSearchUrl({ page }))
      const pageJobs = extractSearchResults(payload)

      jobs.push(...pageJobs)

      const totalCount = Number(payload?.items?.[0]?.TotalJobsCount)
      const limit = Number(payload?.items?.[0]?.Limit) || DEFAULT_LIMIT
      const nextOffset = (page + 1) * limit
      const pageListingCount = getRequisitionList(payload).length

      if (pageListingCount < limit || (Number.isFinite(totalCount) && nextOffset >= totalCount)) {
        break
      }

      if (maxJobs && jobs.length >= maxJobs) {
        break
      }
    }

    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: 'landmarkgroup',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createLandmarkGroupScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Landmark Group scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'landmarkgroup')
    console.log('DB result:', result)
    process.exit(0)
  }
}
