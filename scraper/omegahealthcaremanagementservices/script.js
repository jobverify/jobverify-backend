import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'omegahealthcaremanagementservices'
export const COMPANY_NAME = 'Omega Healthcare Management Services'
export const COMPANY_DOMAIN = 'omegahms.com'
export const GLOBAL_CAREERS_URL = 'https://www.omegahms.com/careers/'
export const INDIA_CAREERS_URL = 'https://www.omegahms.com/careers-india/'
export const ORACLE_HOST = 'https://fa-equm-saasfaprod1.fa.ocs.oraclecloud.com'
export const LISTING_API_BASE_URL = `${ORACLE_HOST}/hcmRestApi/resources/latest/recruitingCEJobRequisitions`
export const DETAIL_API_BASE_URL = `${ORACLE_HOST}/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails`
export const GLOBAL_SITE_NUMBER = 'CX_1001'
export const INDIA_SITE_NUMBER = 'CX_2001'
export const SITE_NUMBERS = [GLOBAL_SITE_NUMBER, INDIA_SITE_NUMBER]
export const DEFAULT_LOCATION = 'India'
export const DEFAULT_LIMIT = 25

const GLOBAL_TITLE_PATTERN = /<title>\s*Join Our Team \| Omega Healthcare Careers\s*<\/title>/i
const INDIA_TITLE_PATTERN = /<title>\s*Careers \| Omega Healthcare\s*<\/title>/i
const GLOBAL_CANONICAL_PATTERN = /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.omegahms\.com\/careers\/?["']/i
const INDIA_CANONICAL_PATTERN = /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.omegahms\.com\/careers-india\/?["']/i
const BRAND_PATTERN = /Omega Healthcare(?: Management Services)?/i
const CX_1001_PATTERN = /https:\/\/fa-equm-saasfaprod1\.fa\.ocs\.oraclecloud\.com\/hcmUI\/CandidateExperience\/en\/sites\/CX_1001\/?/i
const CX_2001_PATTERN = /https:\/\/fa-equm-saasfaprod1\.fa\.ocs\.oraclecloud\.com\/hcmUI\/CandidateExperience\/en\/sites\/CX_2001\/?/i

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&ndash;|&#8211;/gi, '-')
  .replace(/&mdash;|&#8212;/gi, '-')
  .replace(/&amp;/gi, '&')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol|hr)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+:/g, ':'),
)

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
    .map((part) => stripTags(part))
    .filter(Boolean)
    .join(' '),
)

const getSearchSummary = (payload) => {
  if (Array.isArray(payload?.items) && payload.items[0]) {
    return payload.items[0]
  }

  return payload || {}
}

const getRequisitionList = (payload) => {
  if (Array.isArray(payload?.items)) {
    return payload.items.flatMap((item) => (Array.isArray(item?.requisitionList) ? item.requisitionList : []))
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

const getSecondaryLocations = (record = {}) =>
  Array.isArray(record?.secondaryLocations)
    ? record.secondaryLocations
      .map((location) => normalizeLocation(location?.Name))
      .filter(Boolean)
    : []

const getEffectiveLocation = (record = {}) => {
  const primaryLocation = normalizeLocation(record.PrimaryLocation)
  if (primaryLocation && primaryLocation !== 'India') return primaryLocation

  return getSecondaryLocations(record)[0] || primaryLocation
}

const isIndiaJob = (record = {}) => {
  const country = normalizeWhitespace(record.PrimaryLocationCountry)?.toUpperCase()
  const primaryLocation = normalizeWhitespace(record.PrimaryLocation)?.toLowerCase()
  const secondaryLocations = getSecondaryLocations(record)
    .map((location) => location.toLowerCase())

  return (
    country === 'IN'
    || primaryLocation?.endsWith('india')
    || secondaryLocations.some((location) => location.endsWith('india'))
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

const getTotalJobsCount = (payload) => Number(getSearchSummary(payload).TotalJobsCount) || 0

export const hasOfficialGlobalCareersSignal = (html) => {
  const page = String(html ?? '')

  return GLOBAL_TITLE_PATTERN.test(page)
    && GLOBAL_CANONICAL_PATTERN.test(page)
    && BRAND_PATTERN.test(page)
    && CX_1001_PATTERN.test(page)
    && CX_2001_PATTERN.test(page)
}

export const hasOfficialIndiaCareersSignal = (html) => {
  const page = String(html ?? '')

  return INDIA_TITLE_PATTERN.test(page)
    && INDIA_CANONICAL_PATTERN.test(page)
    && BRAND_PATTERN.test(page)
    && CX_1001_PATTERN.test(page)
    && CX_2001_PATTERN.test(page)
}

export const buildSearchUrl = ({
  siteNumber,
  page = 0,
  limit = DEFAULT_LIMIT,
  location = DEFAULT_LOCATION,
  expandSecondaryLocations = true,
} = {}) => {
  const normalizedLimit = Number(limit) || DEFAULT_LIMIT
  const offset = Math.max(0, Number(page) || 0) * normalizedLimit
  const expandPart = expandSecondaryLocations ? 'expand=requisitionList.secondaryLocations&' : ''

  return `${LISTING_API_BASE_URL}?onlyData=true&${expandPart}finder=findReqs;siteNumber=${siteNumber},limit=${normalizedLimit},offset=${offset},location=${location}`
}

export const buildJobDetailUrl = (siteNumber, jobId) =>
  `${ORACLE_HOST}/hcmUI/CandidateExperience/en/sites/${siteNumber}/job/${normalizeWhitespace(jobId) || ''}`

export const buildJobDetailApiUrl = (siteNumber, jobId) =>
  `${DETAIL_API_BASE_URL}?expand=all&onlyData=true&finder=ById;Id=%22${normalizeWhitespace(jobId) || ''}%22,siteNumber=${siteNumber}`

const toListing = (record = {}, siteNumber) => {
  const jobId = normalizeWhitespace(record.Id)
  const sourceUrl = jobId ? buildJobDetailUrl(siteNumber, jobId) : null
  const location = getEffectiveLocation(record)

  return {
    title: normalizeWhitespace(record.Title),
    company: COMPANY_NAME,
    department: normalizeWhitespace(record.Department || record.JobFunction || record.JobFamily || record.Category),
    location,
    city: extractCity(location),
    jobId,
    requisitionId: jobId,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: getEmploymentType(record),
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
    siteNumber,
  }
}

export const extractSearchResults = (payload, { siteNumber } = {}) => getRequisitionList(payload)
  .filter((record) => isIndiaJob(record))
  .map((record) => toListing(record, siteNumber))
  .filter((job) => job.title && job.jobId && job.sourceUrl)

export const extractPaginationSummary = (payload, { page = 0 } = {}) => {
  const listingSummary = getSearchSummary(payload)
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
  const siteNumber = listing.siteNumber || detail.SiteNumber || GLOBAL_SITE_NUMBER
  const location = getEffectiveLocation(detail) || listing.location || null
  const jobId = normalizeWhitespace(detail.Id) || listing.jobId || null
  const sourceUrl = listing.sourceUrl || buildJobDetailUrl(siteNumber, jobId)

  return {
    title: normalizeWhitespace(detail.Title) || listing.title || null,
    company: COMPANY_NAME,
    department: normalizeWhitespace(
      detail.Department || detail.JobFunction || detail.JobFamily || detail.Category,
    ) || listing.department || null,
    location,
    city: extractCity(location) || listing.city || null,
    jobId,
    requisitionId: jobId || listing.requisitionId || null,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: getEmploymentType(detail) || listing.employmentType || null,
    experienceRequired: null,
    minimumQualification: normalizeWhitespace(detail.StudyLevel || detail.ExternalQualificationsStr),
    preferredQualification: null,
    requiredSkills: Array.isArray(detail.skills)
      ? detail.skills
        .map((skill) => normalizeWhitespace(skill?.Skill))
        .filter(Boolean)
      : [],
    postingDate: normalizeDate(detail.ExternalPostedStartDate || detail.PostedDate) || listing.postingDate || null,
    closingDate: normalizeDate(detail.ExternalPostedEndDate || detail.PostingEndDate) || listing.closingDate || null,
    jobDescription: joinDescriptionParts(
      detail.ExternalDescriptionStr,
      detail.ShortDescriptionStr,
      detail.ExternalResponsibilitiesStr,
      detail.ExternalQualificationsStr,
    ) || listing.jobDescription || null,
    siteNumber,
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; JobifyCareerScraper/1.0)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    Accept: 'application/json,text/plain,*/*',
  },
  label: SOURCE,
  timeoutMs: 30000,
})

export const createOmegaHealthcareManagementServicesScraper = ({
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY,
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  fetchText = defaultFetchText,
  fetchJson = defaultFetchJson,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run() {
    const globalCareersHtml = await fetchText(GLOBAL_CAREERS_URL)
    if (!hasOfficialGlobalCareersSignal(globalCareersHtml)) {
      throw new Error('Omega Healthcare global careers page changed; refusing to trust the verified Oracle handoff')
    }

    const indiaCareersHtml = await fetchText(INDIA_CAREERS_URL)
    if (!hasOfficialIndiaCareersSignal(indiaCareersHtml)) {
      throw new Error('Omega Healthcare India careers page changed; refusing to trust the verified Oracle handoff')
    }

    const jobs = []
    const seenJobIds = new Set()

    for (const siteNumber of SITE_NUMBERS) {
      const probePayload = await fetchJson(buildSearchUrl({
        siteNumber,
        page: 0,
        limit: 1,
        expandSecondaryLocations: false,
      }))

      if (getTotalJobsCount(probePayload) === 0 && getRequisitionList(probePayload).length === 0) {
        continue
      }

      for (let page = 0; page < maxPages; page += 1) {
        const payload = await fetchJson(buildSearchUrl({ siteNumber, page }))
        const pageJobs = extractSearchResults(payload, { siteNumber })
        const summary = extractPaginationSummary(payload, { page })

        for (const listing of pageJobs) {
          if (seenJobIds.has(listing.jobId)) continue
          seenJobIds.add(listing.jobId)

          const detailPayload = await fetchJson(buildJobDetailApiUrl(siteNumber, listing.jobId))
          const detail = extractJobDetail(detailPayload, listing)

          jobs.push({
            ...detail,
            company: COMPANY_NAME,
            source: SOURCE,
            link: detail.applyUrl || detail.sourceUrl,
            scrapedAt: now(),
          })

          if (maxJobs && jobs.length >= maxJobs) {
            return jobs
          }
        }

        if (!summary.hasNext) break
      }
    }

    return jobs
  },
})

export const run = async (options = {}) => createOmegaHealthcareManagementServicesScraper(options).run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Omega Healthcare Management Services scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)
  const cities = [...new Set(jobs.map((job) => job.city).filter(Boolean))].sort()
  console.log(`Cities found: ${cities.join(', ')}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, SOURCE)
    console.log('DB result:', result)
    process.exit(0)
  }
}
