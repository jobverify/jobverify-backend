import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const API_BASE_URL = 'https://ejgk.fa.em2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions'
const PUBLIC_CAREERS_BASE_URL = 'https://ejgk.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites'
const DEFAULT_LOCATION = 'India'
const DEFAULT_LIMIT = 24

export const SITE_NUMBERS = ['CX_1', 'CX_3', 'CX_3001']

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
  Accept: 'application/json,text/plain,*/*',
}

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

  return normalized
    .split(',')
    .map((part) => toTitleCase(part))
    .filter(Boolean)
    .join(', ')
}

const extractCity = (location) => normalizeLocation(location)?.split(',')[0] || null

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

const isIndiaJob = (record = {}) => {
  const country = normalizeWhitespace(record.PrimaryLocationCountry)?.toUpperCase()
  const location = normalizeWhitespace(record.PrimaryLocation)?.toLowerCase()

  return country === 'IN' || location?.endsWith('india') || false
}

export const buildSearchUrl = ({
  siteNumber = SITE_NUMBERS[0],
  page = 0,
  limit = DEFAULT_LIMIT,
  location = DEFAULT_LOCATION,
} = {}) => {
  const offset = Math.max(0, Number(page) || 0) * (Number(limit) || DEFAULT_LIMIT)
  return `${API_BASE_URL}?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=${siteNumber},limit=${Number(limit) || DEFAULT_LIMIT},offset=${offset},location=${location}`
}

export const buildJobDetailUrl = ({ siteNumber = SITE_NUMBERS[0], jobId }) =>
  `${PUBLIC_CAREERS_BASE_URL}/${siteNumber}/job/${jobId}`

const toJob = (record = {}, { siteNumber = SITE_NUMBERS[0] } = {}) => {
  const jobId = normalizeWhitespace(record.Id)
  const detailUrl = jobId ? buildJobDetailUrl({ siteNumber, jobId }) : null

  return {
    title: normalizeWhitespace(record.Title),
    company: 'KPMG',
    department: normalizeWhitespace(record.Department || record.JobFunction || record.JobFamily),
    location: normalizeLocation(record.PrimaryLocation),
    city: extractCity(record.PrimaryLocation),
    jobId,
    requisitionId: jobId,
    sourceUrl: detailUrl,
    applyUrl: detailUrl,
    employmentType: 'Full-time',
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

export const extractSearchResults = (payload, options = {}) => getRequisitionList(payload)
  .filter((record) => isIndiaJob(record))
  .map((record) => toJob(record, options))

const fetchJson = async (url, fetchImpl = fetch) => {
  const response = await fetchImpl(url, { headers: REQUEST_HEADERS })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }
  return response.json()
}

export const createKpmgScraper = ({
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : 10,
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  fetchImpl = fetch,
  siteNumbers = SITE_NUMBERS,
} = {}) => ({
  async run() {
    const jobs = []
    const seenUrls = new Set()

    for (const siteNumber of siteNumbers) {
      for (let page = 0; page < maxPages; page += 1) {
        const payload = await fetchJson(buildSearchUrl({ siteNumber, page }), fetchImpl)
        const pageJobs = extractSearchResults(payload, { siteNumber })

        for (const job of pageJobs) {
          const key = job.sourceUrl || `${siteNumber}:${job.jobId}`
          if (seenUrls.has(key)) continue
          seenUrls.add(key)

          jobs.push({
            ...job,
            source: 'kpmg',
            link: job.applyUrl || job.sourceUrl,
            scrapedAt: new Date().toISOString(),
          })

          if (maxJobs && jobs.length >= maxJobs) {
            return jobs
          }
        }

        const totalCount = Number(payload?.items?.[0]?.TotalJobsCount)
        const limit = Number(payload?.items?.[0]?.Limit) || DEFAULT_LIMIT
        const nextOffset = (page + 1) * limit

        if (pageJobs.length < limit || (Number.isFinite(totalCount) && nextOffset >= totalCount)) {
          break
        }
      }
    }

    return jobs
  },
})

export const run = async () => createKpmgScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running KPMG scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'kpmg')
    console.log('DB result:', result)
    process.exit(0)
  }
}
