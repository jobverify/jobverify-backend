import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { FORTIS_HEALTHCARE_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = PROVIDER_METADATA.source
export { PROVIDER_METADATA }
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_AT = PROVIDER_METADATA.verifiedOn
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const OFFICIAL_CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const OFFICIAL_CAREERS_RESOLVED_URL = PROVIDER_METADATA.officialCareersResolvedUrl
export const CANDIDATE_EXPERIENCE_URL = PROVIDER_METADATA.oracleCandidateExperienceUrl
export const WORKSPACE_DOMAIN = PROVIDER_METADATA.workspaceDomain
export const LISTING_API_BASE_URL = PROVIDER_METADATA.listingApiBaseUrl
export const DETAIL_API_BASE_URL = PROVIDER_METADATA.detailApiBaseUrl
export const PUBLIC_JOBS_BASE_URL = PROVIDER_METADATA.publicJobsBaseUrl
export const SITE_NUMBER = PROVIDER_METADATA.siteNumber
export const COUNTRY_FILTER = PROVIDER_METADATA.countryFilter
export const DEFAULT_LOCATION = COUNTRY_FILTER
export const DEFAULT_LIMIT = 24

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
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
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
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

const countryNameFromCode = (value) => {
  const normalized = normalizeWhitespace(value)?.toUpperCase()
  if (normalized === 'IN') return COUNTRY_FILTER
  return normalizeWhitespace(value)
}

const unique = (values) => [...new Set(values.filter(Boolean))]

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (/^india$/i.test(normalized)) return COUNTRY_FILTER
  return normalized
}

const buildLocationFromWorkLocation = (record = {}) => {
  const location = Array.isArray(record?.workLocation) && record.workLocation[0]
    ? record.workLocation[0]
    : Array.isArray(record?.otherWorkLocations) && record.otherWorkLocations[0]
      ? record.otherWorkLocations[0]
      : null

  if (!location) return null

  const parts = unique([
    normalizeWhitespace(location.TownOrCity),
    normalizeWhitespace(location.Region2),
    normalizeWhitespace(location.Region1),
    countryNameFromCode(location.Country),
  ])

  if (parts.length > 0) {
    return parts.join(', ')
  }

  const fallback = unique([
    normalizeWhitespace(location.LocationName),
    countryNameFromCode(location.Country),
  ])

  return fallback.length > 0 ? fallback.join(', ') : null
}

const getEffectiveLocation = (record = {}) =>
  buildLocationFromWorkLocation(record)
  || normalizeLocation(record.PrimaryLocation)
  || normalizeLocation(record?.secondaryLocations?.[0]?.Name)

const extractCity = (location) => {
  const normalized = normalizeLocation(location)
  if (!normalized || /^india$/i.test(normalized)) return null
  return normalized.split(',')[0]?.trim() || null
}

const joinDescriptionParts = (...parts) => {
  const description = parts
    .map((part) => stripTags(part))
    .filter(Boolean)
    .join(' ')

  return normalizeWhitespace(description)
}

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

const getEmploymentType = (record = {}) => normalizeWhitespace(
  record.JobSchedule
    || record.RequisitionType
    || record.JobType
    || record.WorkerType
    || record.ContractType,
)

const getDepartment = (record = {}) => normalizeWhitespace(
  record.JobFunction
    || record.Department
    || record.Category
    || record.JobFamily,
)

const getQualificationLines = (record = {}) => {
  const qualificationText = stripTags(record.ExternalQualificationsStr)
  if (qualificationText) return [qualificationText]

  const fallback = normalizeWhitespace(record.StudyLevel)
  return fallback ? [fallback] : []
}

const extractMinimumQualification = (record = {}) =>
  getQualificationLines(record).find((line) => !/\byears?\b/i.test(line)) || null

const extractExperienceRequired = (record = {}) =>
  getQualificationLines(record).find((line) => /\byears?\b/i.test(line)) || null

const isIndiaJob = (record = {}) => {
  const country = normalizeWhitespace(record.PrimaryLocationCountry)?.toUpperCase()
  const primaryLocation = normalizeWhitespace(record.PrimaryLocation)
  const secondaryLocations = Array.isArray(record?.secondaryLocations)
    ? record.secondaryLocations
      .map((location) => normalizeWhitespace(location?.Name))
      .filter(Boolean)
    : []

  return (
    country === 'IN'
    || /(?:^|,)\s*india\s*$/i.test(primaryLocation || '')
    || secondaryLocations.some((location) => /(?:^|,)\s*india\s*$/i.test(location))
    || false
  )
}

export const hasOfficialCareersPageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /<title>\s*Careers at Fortis\s*\|\s*Fortis Healthcare\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.fortishealthcare\.com\/careers-at-Fortis-basic["'][^>]*>/i.test(page)
    && text.includes('Careers at Fortis')
    && text.includes('Healthcare for Good')
    && text.includes('Today. Tomorrow. Always')
    && text.includes('transforming care across our hospital network')
    && /selectedCategoriesFacet=300000787441924/i.test(page)
    && /selectedCategoriesFacet=300000787442029/i.test(page)
    && /selectedCategoriesFacet=300000787442090/i.test(page)
    && /selectedCategoriesFacet=300000787442096/i.test(page)
    && /selectedCategoriesFacet=300000787441932/i.test(page)
    && /join-talent-community/i.test(page)
    && text.includes('Fortis employs ~23,000 people')
    && text.includes('formal recruitment process')
}

export const hasOfficialCandidateExperienceSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Fortis Career\s*<\/title>/i.test(page)
    && /<meta[^>]+property=["']og:title["'][^>]+content=["']Fortis Career Careers["'][^>]*>/i.test(page)
    && /<meta[^>]+property=["']og:site_name["'][^>]+content=["']Fortis Career["'][^>]*>/i.test(page)
    && /<base[^>]+href=["']\/hcmUI\/CandidateExperience\/en\/sites\/CX_1\/?["'][^>]*>/i.test(page)
    && /apiBaseUrl:\s*['"]https:\/\/fa-ermg-saasfaprod1\.fa\.ocs\.oraclecloud\.com:443['"]/i.test(page)
    && /siteCode:\s*['"]FT01['"]/i.test(page)
    && /siteNumber:\s*['"]CX_1['"]/i.test(page)
    && /logoImageUrl:\s*['"]https:\/\/www\.fortishealthcare\.com\/static_new\/img\/fortis-logo\.png['"]/i.test(page)
}

export const hasVerifiedFortisListingSignal = (payload) => {
  const summary = payload?.items?.[0]
  const siteNumber = normalizeWhitespace(summary?.SiteNumber)
  const organizationNames = Array.isArray(summary?.organizationsFacet)
    ? summary.organizationsFacet
      .map((item) => normalizeWhitespace(item?.Name))
      .filter(Boolean)
    : []
  const totalCount = Number(summary?.TotalJobsCount)

  return siteNumber === SITE_NUMBER
    && organizationNames.includes('Fortis Healthcare Limited')
    && Number.isFinite(totalCount)
    && totalCount > 0
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

export const buildJobDetailUrl = (jobId) =>
  `${PUBLIC_JOBS_BASE_URL}${normalizeWhitespace(jobId) || ''}`

export const buildJobDetailApiUrl = (jobId) =>
  `${DETAIL_API_BASE_URL}?expand=all&onlyData=true&finder=ById;Id=%22${normalizeWhitespace(jobId) || ''}%22,siteNumber=${SITE_NUMBER}`

export const extractSearchResults = (payload) => getRequisitionList(payload)
  .filter((record) => isIndiaJob(record))
  .map((record) => {
    const jobId = normalizeWhitespace(record.Id)
    const location = getEffectiveLocation(record)
    const sourceUrl = jobId ? buildJobDetailUrl(jobId) : null

    return {
      title: normalizeWhitespace(record.Title),
      company: COMPANY_NAME,
      department: getDepartment(record),
      location,
      city: extractCity(location),
      country: COUNTRY_FILTER,
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: getEmploymentType(record),
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: normalizeDate(record.ExternalPostedStartDate || record.PostedDate),
      closingDate: normalizeDate(record.ExternalPostedEndDate || record.PostingEndDate),
      jobDescription: joinDescriptionParts(record.ShortDescriptionStr),
      remoteStatus: normalizeWhitespace(record.WorkplaceType) || null,
      siteNumber: SITE_NUMBER,
    }
  })
  .filter((job) => job.title && job.jobId && job.sourceUrl)

export const extractPaginationSummary = (payload, { page = 0 } = {}) => {
  const listingSummary = payload?.items?.[0] || {}
  const pageSize = Number(listingSummary.Limit) || DEFAULT_LIMIT
  const totalCount = Number(listingSummary.TotalJobsCount) || 0
  const nextOffset = (Math.max(0, Number(page) || 0) + 1) * pageSize

  return {
    hasNext: nextOffset < totalCount,
    pageSize,
    totalCount,
  }
}

export const extractJobDetail = (payload, listing = {}) => {
  const detail = getRequisitionDetail(payload)
  const location = getEffectiveLocation(detail) || listing.location || null
  const jobId = normalizeWhitespace(detail.Id) || listing.jobId || null
  const sourceUrl = listing.sourceUrl || buildJobDetailUrl(jobId)

  return {
    title: normalizeWhitespace(detail.Title) || listing.title || null,
    company: COMPANY_NAME,
    department: getDepartment(detail) || listing.department || null,
    location,
    city: extractCity(location) || listing.city || null,
    country: COUNTRY_FILTER,
    jobId,
    requisitionId: jobId || listing.requisitionId || null,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: getEmploymentType(detail) || listing.employmentType || null,
    experienceRequired: extractExperienceRequired(detail) || listing.experienceRequired || null,
    minimumQualification: extractMinimumQualification(detail) || listing.minimumQualification || null,
    preferredQualification: null,
    requiredSkills: Array.isArray(detail.skills)
      ? detail.skills
        .map((skill) => normalizeWhitespace(skill?.Skill))
        .filter(Boolean)
      : listing.requiredSkills || [],
    postingDate: normalizeDate(detail.ExternalPostedStartDate || detail.PostedDate) || listing.postingDate || null,
    closingDate: normalizeDate(detail.ExternalPostedEndDate || detail.PostingEndDate) || listing.closingDate || null,
    jobDescription: joinDescriptionParts(
      detail.ExternalDescriptionStr,
      detail.ExternalResponsibilitiesStr,
      detail.ShortDescriptionStr,
    ) || listing.jobDescription || null,
    remoteStatus: normalizeWhitespace(detail.WorkplaceType) || listing.remoteStatus || null,
    siteNumber: SITE_NUMBER,
  }
}

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

export const createFortisHealthcareScraper = ({
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY,
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  fetchText = defaultFetchText,
  fetchJson = defaultFetchJson,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run() {
    const candidateExperienceHtml = await fetchText(CANDIDATE_EXPERIENCE_URL)
    if (!hasOfficialCandidateExperienceSignal(candidateExperienceHtml)) {
      throw new Error('Fortis Healthcare verified Oracle candidate experience page no longer matches the known public shell')
    }

    const jobs = []
    const seenJobIds = new Set()

    for (let page = 0; page < maxPages; page += 1) {
      const payload = await fetchJson(buildSearchUrl({ page }))
      if (!hasVerifiedFortisListingSignal(payload)) {
        throw new Error('Fortis Healthcare verified Fortis listing contract no longer matches the known Oracle board')
      }

      const pageJobs = extractSearchResults(payload)
      const summary = extractPaginationSummary(payload, { page })

      for (const listing of pageJobs) {
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

export const run = async (options = {}) => createFortisHealthcareScraper(options).run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
