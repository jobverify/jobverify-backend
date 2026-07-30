import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'

import EMIDS_TECHNOLOGIES_LIMITED_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = EMIDS_TECHNOLOGIES_LIMITED_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const CANDIDATE_EXPERIENCE_URL = PROVIDER_METADATA.oracleCandidateExperienceUrl
export const LISTING_API_BASE_URL = PROVIDER_METADATA.listingApiBaseUrl
export const DETAIL_API_BASE_URL = PROVIDER_METADATA.detailApiBaseUrl
export const PUBLIC_JOBS_BASE_URL = PROVIDER_METADATA.publicJobsBaseUrl
export const SITE_NUMBER = PROVIDER_METADATA.siteNumber

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&#8217;|&#x27;/gi, "'")
  .replace(/&ndash;|&#8211;/gi, '-')
  .replace(/&mdash;|&#8212;/gi, '-')
  .replace(/&amp;/gi, '&')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

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

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
  },
  label: SOURCE,
  timeoutMs: 30000,
})

const getListingSummary = (payload = {}) => payload?.items?.[0] || {}

const getRequisitionList = (payload = {}) => {
  const summary = getListingSummary(payload)
  return Array.isArray(summary?.requisitionList) ? summary.requisitionList : []
}

const getDetailRecord = (payload = {}) => payload?.items?.[0] || {}

const normalizeLocation = (value) => normalizeWhitespace(value)

const inferCity = (location) => {
  const normalized = normalizeLocation(location)
  if (!normalized || /^india$/i.test(normalized)) return null
  return normalized.split(',')[0]?.trim() || null
}

const isIndiaJob = (item = {}) => {
  const primaryCountry = normalizeWhitespace(item?.PrimaryLocationCountry)?.toUpperCase()
  const primaryLocation = normalizeWhitespace(item?.PrimaryLocation)
  const secondaryLocations = Array.isArray(item?.secondaryLocations)
    ? item.secondaryLocations
      .map((location) => normalizeWhitespace(location?.Name))
      .filter(Boolean)
    : []

  return primaryCountry === 'IN'
    || /(?:^|,)\s*india\s*$/i.test(primaryLocation || '')
    || secondaryLocations.some((location) => /(?:^|,)\s*india\s*$/i.test(location))
}

const getEmploymentType = (item = {}) =>
  normalizeWhitespace(
    item.RequisitionType
      || item.JobType
      || item.WorkerType
      || item.JobSchedule,
  )

const toListing = (item = {}) => {
  const jobId = normalizeWhitespace(item?.Id)
  const location = normalizeLocation(
    item?.PrimaryLocation
      || item?.secondaryLocations?.[0]?.Name,
  )

  if (!jobId) return null

  return {
    title: normalizeWhitespace(item?.Title),
    company: COMPANY,
    department: normalizeWhitespace(item?.JobFunction || item?.Department || item?.Category) || null,
    location,
    city: inferCity(location),
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl: `${PUBLIC_JOBS_BASE_URL}${jobId}`,
    applyUrl: `${PUBLIC_JOBS_BASE_URL}${jobId}`,
    employmentType: getEmploymentType(item),
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: normalizeDate(item?.ExternalPostedStartDate || item?.PostedDate),
    closingDate: normalizeDate(item?.ExternalPostedEndDate || item?.PostingEndDate),
    jobDescription: normalizeWhitespace(item?.ShortDescriptionStr) || null,
    remoteStatus: null,
  }
}

export const hasOfficialCorporateCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title[^>]*>\s*Careers\s*-\s*Emids\s*<\/title>/i.test(page)
    && (
      (page.includes(CANDIDATE_EXPERIENCE_URL) && text.includes('Explore Open Roles'))
      || (
        text.includes('Help Shape the Future of Health')
        && text.includes('Be A Part Of Our Growth Story')
      )
    )
}

export const hasOfficialCandidateExperienceSignal = (html = '') => {
  const page = String(html ?? '')

  return /<title[^>]*>\s*Emids Career Site\s*<\/title>/i.test(page)
    && /<base[^>]+href=["']\/hcmUI\/CandidateExperience\/en\/sites\/CX_1\/?["'][^>]+data-apibaseurl=["']https:\/\/fa-eupt-saasfaprod1\.fa\.ocs\.oraclecloud\.com:443["'][^>]+data-sitenumber=["']CX_1["']/i.test(page)
}

export const buildSearchUrl = ({ page = 0, limit = 5, location = 'India' } = {}) => {
  const normalizedLimit = Number(limit) || 5
  const offset = Math.max(0, Number(page) || 0) * normalizedLimit
  return `${LISTING_API_BASE_URL}?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=${SITE_NUMBER},limit=${normalizedLimit},offset=${offset},location=${location}`
}

export const buildJobDetailApiUrl = (jobId) =>
  `${DETAIL_API_BASE_URL}?expand=all&onlyData=true&finder=ById;Id=%22${normalizeWhitespace(jobId) || ''}%22,siteNumber=${SITE_NUMBER}`

export const extractSearchResults = (payload = {}) =>
  getRequisitionList(payload)
    .filter((item) => isIndiaJob(item))
    .map((item) => toListing(item))
    .filter((item) => item?.title && item?.jobId)

export const extractPaginationSummary = (payload = {}, { page = 0 } = {}) => {
  const summary = getListingSummary(payload)
  const pageSize = Number(summary?.Limit) || 5
  const totalCount = Number(summary?.TotalJobsCount) || 0
  const nextOffset = (Math.max(0, Number(page) || 0) + 1) * pageSize

  return {
    hasNext: nextOffset < totalCount,
    pageSize,
    nextOffset,
    totalCount,
  }
}

export const extractJobDetail = (payload = {}, listing = {}) => {
  const detail = getDetailRecord(payload)
  const location = normalizeLocation(detail?.PrimaryLocation || listing.location)
  const jobId = normalizeWhitespace(detail?.Id) || listing.jobId
  const sourceUrl = `${PUBLIC_JOBS_BASE_URL}${jobId}`

  return {
    title: normalizeWhitespace(detail?.Title) || listing.title || null,
    company: COMPANY,
    department: normalizeWhitespace(detail?.JobFunction || detail?.Department || detail?.Category)
      || listing.department
      || null,
    location,
    city: inferCity(location) || listing.city || null,
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: getEmploymentType(detail) || listing.employmentType || null,
    experienceRequired: null,
    minimumQualification: normalizeWhitespace(detail?.ExternalQualificationsStr) || null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: normalizeDate(detail?.ExternalPostedStartDate || detail?.PostedDate) || listing.postingDate || null,
    closingDate: normalizeDate(detail?.ExternalPostedEndDate || detail?.PostingEndDate) || listing.closingDate || null,
    jobDescription: joinDescriptionParts(
      detail?.ExternalDescriptionStr,
      detail?.ExternalResponsibilitiesStr,
      detail?.ShortDescriptionStr,
    ) || listing.jobDescription || null,
    remoteStatus: null,
  }
}

export const createEmidsTechnologiesLimitedScraper = ({
  maxPages = Number.POSITIVE_INFINITY,
  maxJobs = null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, fetchJson = defaultFetchJson } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCorporateCareersSignal(careersHtml)) {
      throw new Error('Emids Technologies Limited verified first-party careers page no longer matches the trusted handoff')
    }

    const candidateExperienceHtml = await fetchText(CANDIDATE_EXPERIENCE_URL)
    if (!hasOfficialCandidateExperienceSignal(candidateExperienceHtml)) {
      throw new Error('Emids Technologies Limited verified Oracle candidate experience shell no longer matches the trusted page')
    }

    const jobs = []
    const seenJobIds = new Set()

    for (let page = 0; page < maxPages; page += 1) {
      const payload = await fetchJson(buildSearchUrl({ page }))
      const listings = extractSearchResults(payload)
      const summary = extractPaginationSummary(payload, { page })

      for (const listing of listings) {
        if (seenJobIds.has(listing.jobId)) continue
        seenJobIds.add(listing.jobId)

        const detailPayload = await fetchJson(buildJobDetailApiUrl(listing.jobId))
        const detail = extractJobDetail(detailPayload, listing)

        jobs.push({
          ...detail,
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

    return jobs
  },
})

export const run = async (options = {}) => createEmidsTechnologiesLimitedScraper().run(options)

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
