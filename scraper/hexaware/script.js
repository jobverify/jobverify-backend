import path from 'path'
import { fileURLToPath } from 'url'

import { extractJobFilterSignals } from '../../src/utils/jobFilterSignals.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const LISTING_API_BASE_URL = 'https://fa-etqo-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions'
const DETAIL_API_BASE_URL = 'https://fa-etqo-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails'
const PUBLIC_CAREERS_BASE_URL = 'https://jobs.hexaware.com/#en/sites/CX_1/job/'
const SITE_NUMBER = 'CX_1'
const DEFAULT_LOCATION = 'India'
const DEFAULT_LIMIT = 24

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

const normalizeDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return normalized

  const year = parsed.getUTCFullYear()
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
  const day = String(parsed.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const joinDescriptionParts = (...parts) => normalizeWhitespace(
  parts
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)
    .join(' '),
)

const extractExperienceRequired = ({
  title,
  minimumQualification,
  jobDescription,
}) => (
  extractJobFilterSignals({
    title,
    minimumQualification,
    jobDescription,
    experienceRequired: null,
  }).experienceProfile?.evidence || null
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

const getRequisitionDetail = (payload) => {
  if (Array.isArray(payload?.items) && payload.items[0]) {
    return payload.items[0]
  }

  return payload || {}
}

const isIndiaJob = (record = {}) => {
  const country = normalizeWhitespace(record.PrimaryLocationCountry)?.toUpperCase()
  const location = normalizeWhitespace(record.PrimaryLocation)?.toLowerCase()

  return country === 'IN' || location?.endsWith('india') || false
}

const toJob = (record = {}) => {
  const jobId = normalizeWhitespace(record.Id)
  const detailUrl = jobId ? buildJobDetailUrl(jobId) : null

  return {
    title: normalizeWhitespace(record.Title),
    company: 'Hexaware',
    department: normalizeWhitespace(record.Department || record.JobFunction || record.JobFamily),
    location: normalizeLocation(record.PrimaryLocation),
    city: extractCity(record.PrimaryLocation),
    jobId,
    requisitionId: jobId,
    sourceUrl: detailUrl,
    applyUrl: detailUrl,
    employmentType: normalizeWhitespace(record.JobType || record.WorkerType || record.ContractType),
    experienceRequired: null,
    minimumQualification: normalizeWhitespace(record.StudyLevel || record.ExternalQualificationsStr),
    preferredQualification: null,
    requiredSkills: [],
    postingDate: normalizeDate(record.PostedDate || record.ExternalPostedStartDate),
    closingDate: normalizeDate(record.PostingEndDate || record.ExternalPostedEndDate),
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

export const buildJobDetailUrl = (jobId) => `${PUBLIC_CAREERS_BASE_URL}${jobId}`

const buildJobDetailApiUrl = (jobId) =>
  `${DETAIL_API_BASE_URL}?expand=all&onlyData=true&finder=ById;Id=%22${normalizeWhitespace(jobId) || ''}%22,siteNumber=${SITE_NUMBER}`

export const extractSearchResults = (payload) => getRequisitionList(payload)
  .filter((record) => isIndiaJob(record))
  .map((record) => toJob(record))
  .filter((job) => job.title && job.jobId && job.sourceUrl)

export const extractPaginationSummary = (payload, { page = 0 } = {}) => {
  const listingSummary = payload?.items?.[0] || {}
  const pageSize = Number(listingSummary.Limit) || DEFAULT_LIMIT
  const totalCount = Number(listingSummary.TotalJobsCount) || 0
  const nextOffset = (Math.max(0, Number(page) || 0) + 1) * pageSize

  return {
    hasNext: nextOffset < totalCount,
    pageSize,
    nextOffset,
    totalCount,
  }
}

export const extractJobDetail = (payload, listing = {}) => {
  const detail = getRequisitionDetail(payload)
  const sourceUrl = listing.sourceUrl || buildJobDetailUrl(detail.Id)
  const title = normalizeWhitespace(detail.Title) || listing.title || null
  const minimumQualification = normalizeWhitespace(detail.StudyLevel || detail.ExternalQualificationsStr)
    || listing.minimumQualification
    || null
  const jobDescription = joinDescriptionParts(
    detail.ExternalDescriptionStr,
    detail.ShortDescriptionStr,
    detail.ExternalResponsibilitiesStr,
    detail.ExternalQualificationsStr,
  ) || listing.jobDescription || null

  return {
    title,
    company: 'Hexaware',
    department: normalizeWhitespace(
      detail.Department || detail.JobFunction || detail.JobFamily,
    ) || listing.department || null,
    location: normalizeLocation(detail.PrimaryLocation) || listing.location || null,
    city: extractCity(detail.PrimaryLocation) || listing.city || null,
    jobId: normalizeWhitespace(detail.Id) || listing.jobId || null,
    requisitionId: normalizeWhitespace(detail.Id) || listing.requisitionId || null,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: normalizeWhitespace(detail.JobType || detail.WorkerType || detail.ContractType),
    experienceRequired: extractExperienceRequired({
      title,
      minimumQualification,
      jobDescription,
    }) || listing.experienceRequired || null,
    minimumQualification,
    preferredQualification: null,
    requiredSkills: Array.isArray(detail.skills)
      ? detail.skills
        .map((skill) => normalizeWhitespace(skill?.Skill))
        .filter(Boolean)
      : [],
    postingDate: normalizeDate(detail.ExternalPostedStartDate || detail.PostedDate) || listing.postingDate || null,
    closingDate: normalizeDate(detail.ExternalPostedEndDate || detail.PostingEndDate) || listing.closingDate || null,
    jobDescription,
    publicExperienceChecked: true,
  }
}

const fetchJson = async (url) => {
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

export const run = async () => {
  const maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY
  const maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null
  const jobs = []
  const seenJobIds = new Set()

  for (let page = 0; page < maxPages; page += 1) {
    const payload = await fetchJson(buildSearchUrl({ page }))
    const pageJobs = extractSearchResults(payload)
    const summary = extractPaginationSummary(payload, { page })

    for (const listing of pageJobs) {
      if (seenJobIds.has(listing.jobId)) continue
      seenJobIds.add(listing.jobId)

      const detailPayload = await fetchJson(buildJobDetailApiUrl(listing.jobId))
      const detail = extractJobDetail(detailPayload, listing)

      jobs.push({
        ...detail,
        source: 'hexaware',
        link: detail.applyUrl || detail.sourceUrl,
        scrapedAt: new Date().toISOString(),
      })

      if (maxJobs && jobs.length >= maxJobs) {
        return jobs
      }
    }

    if (!summary.hasNext) break
  }

  return jobs
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Hexaware scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)
  const cities = [...new Set(jobs.map((job) => job.city).filter(Boolean))].sort()
  console.log(`Cities found: ${cities.join(', ')}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'hexaware')
    console.log('DB result:', result)
    process.exit(0)
  }
}
