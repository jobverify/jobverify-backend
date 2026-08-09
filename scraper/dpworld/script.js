import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { extractJobFilterSignals } from '../../src/utils/jobFilterSignals.js'
import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'dpworld'
export const COMPANY_NAME = 'DP World'
export const COMPANY_DOMAIN = 'dpworld.com'
export const VERIFIED_AT = '2026-07-15'
export const HOMEPAGE_URL = 'https://www.dpworld.com/en'
export const CORPORATE_CAREERS_URL = 'https://www.dpworld.com/en/careers'
export const ATS_PLATFORM = 'oracle-cloud'
export const COUNTRY_FILTER = 'India'
export const PAGINATION_STRATEGY = 'offset-query-location-filter'
export const EXTRACTION_STRATEGY =
  'verified-first-party-careers-shell+oracle-cloud-candidate-experience+oracle-cloud-india-finder-api+oracle-cloud-detail-api'
export const PARSER = 'custom-script'
export const NORMALIZATION_PROFILE = 'engineering-default'
export const CANDIDATE_EXPERIENCE_URL =
  'https://ehpv.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs'
export const WORKSPACE_DOMAIN = 'ehpv.fa.em2.oraclecloud.com'
export const LISTING_API_BASE_URL =
  'https://ehpv.fa.em2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions'
export const DETAIL_API_BASE_URL =
  'https://ehpv.fa.em2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails'
export const PUBLIC_JOBS_BASE_URL =
  'https://ehpv.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/'
export const SITE_NUMBER = 'CX_1'
export const DEFAULT_LOCATION = 'India'
export const DEFAULT_LIMIT = 24

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.dpworld.com/en/careers is the live first-party careers page and its View All Vacancies CTA hands applicants to the public Oracle Candidate Experience board at https://ehpv.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs. The public India-scoped finder at https://ehpv.fa.em2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=5,offset=0,location=India returned 133 India jobs, and the public detail API is live at https://ehpv.fa.em2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=ById;Id=%2224391%22,siteNumber=CX_1 for Group Senior Product Support Engineer in Gurgaon, Haryana, India.'

export const PROVIDER_METADATA = {
  source: SOURCE,
  companyName: COMPANY_NAME,
  adapter: 'script',
  homepageUrl: HOMEPAGE_URL,
  companyCareerPage: CORPORATE_CAREERS_URL,
  officialCandidateExperienceUrl: CANDIDATE_EXPERIENCE_URL,
  companyDomain: COMPANY_DOMAIN,
  atsPlatform: ATS_PLATFORM,
  countryFilter: COUNTRY_FILTER,
  paginationStrategy: PAGINATION_STRATEGY,
  extractionStrategy: EXTRACTION_STRATEGY,
  parser: PARSER,
  normalizationProfile: NORMALIZATION_PROFILE,
  workspaceDomain: WORKSPACE_DOMAIN,
  listingApiBaseUrl: LISTING_API_BASE_URL,
  detailApiBaseUrl: DETAIL_API_BASE_URL,
  publicJobsBaseUrl: PUBLIC_JOBS_BASE_URL,
  siteNumber: SITE_NUMBER,
  verifiedOn: VERIFIED_AT,
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  modulePath: path.join(currentDir, 'script.js'),
}

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
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (/^india$/i.test(normalized)) return COUNTRY_FILTER
  return normalized
}

const extractCity = (location) => {
  const normalized = normalizeLocation(location)
  if (!normalized || /^india$/i.test(normalized)) return null
  return normalized.split(',')[0]?.trim() || null
}

const normalizeDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized
  }

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

const getEmploymentType = (record = {}) =>
  normalizeWhitespace(
    record.JobSchedule
      || record.RequisitionType
      || record.JobType
      || record.WorkerType
      || record.ContractType,
  )

const getEffectiveLocation = (record = {}) => normalizeLocation(
  record.PrimaryLocation
    || record?.secondaryLocations?.[0]?.Name,
)

const normalizeRemoteStatus = (value) => {
  const normalized = normalizeWhitespace(value)
  return normalized || null
}

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

const toListing = (record = {}) => {
  const jobId = normalizeWhitespace(record.Id)
  const location = getEffectiveLocation(record)
  const sourceUrl = jobId ? buildJobDetailUrl(jobId) : null
  const title = normalizeWhitespace(record.Title)
  const minimumQualification = normalizeWhitespace(record.StudyLevel || record.ExternalQualificationsStr)
  const jobDescription = joinDescriptionParts(record.ShortDescriptionStr, record.ExternalResponsibilitiesStr)

  return {
    title,
    company: COMPANY_NAME,
    department: normalizeWhitespace(record.JobFunction || record.Department || record.Category || record.JobFamily),
    location,
    city: extractCity(location),
    country: COUNTRY_FILTER,
    jobId,
    requisitionId: jobId,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: getEmploymentType(record),
    experienceRequired: extractExperienceRequired({
      title,
      minimumQualification,
      jobDescription,
    }),
    minimumQualification,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: normalizeDate(record.ExternalPostedStartDate || record.PostedDate),
    closingDate: normalizeDate(record.ExternalPostedEndDate || record.PostingEndDate),
    jobDescription,
    remoteStatus: normalizeRemoteStatus(record.WorkplaceType),
    siteNumber: SITE_NUMBER,
  }
}

export const hasOfficialCorporateCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /<title[^>]*>\s*DP World Careers\s*(?:&amp;|&)\s*Jobs \| DP World Recruitment \| DP World\s*<\/title>/i.test(page)
    && /href=["']https:\/\/ehpv\.fa\.em2\.oraclecloud\.com\/hcmUI\/CandidateExperience\/en\/sites\/CX_1\/jobs["'][^>]*>[\s\S]{0,250}?View All Vacancies/i.test(page)
    && text.includes('Join DP World and help shape the future of global trade.')
}

export const hasOfficialCandidateExperienceSignal = (html) => {
  const page = String(html ?? '')
  const hasOracleSiteConfig = (
    /<base[^>]+href=["']\/hcmUI\/CandidateExperience\/en\/sites\/CX_1\/?["'][^>]*data-apibaseurl=["']https:\/\/ehpv\.fa\.em2\.oraclecloud\.com:443["'][^>]*data-sitenumber=["']CX_1["'][^>]*>/i.test(page)
    || (
      /<base[^>]+href=["']\/hcmUI\/CandidateExperience\/en\/sites\/CX_1\/?["'][^>]*>/i.test(page)
      && /apiBaseUrl:\s*['"]https:\/\/ehpv\.fa\.em2\.oraclecloud\.com:443['"]/i.test(page)
      && /siteNumber:\s*['"]CX_1['"]/i.test(page)
    )
  )

  return /<title>\s*DP World\s*<\/title>/i.test(page)
    && /<meta[^>]+property=["']og:title["'][^>]+content=["']DP World Careers["']/i.test(page)
    && /<meta[^>]+property=["']og:site_name["'][^>]+content=["']DP World["']/i.test(page)
    && hasOracleSiteConfig
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
  .map((record) => toListing(record))
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
  const location = getEffectiveLocation(detail) || listing.location || null
  const jobId = normalizeWhitespace(detail.Id) || listing.jobId || null
  const sourceUrl = listing.sourceUrl || buildJobDetailUrl(jobId)
  const title = normalizeWhitespace(detail.Title) || listing.title || null
  const minimumQualification = normalizeWhitespace(detail.ExternalQualificationsStr || detail.StudyLevel)
    || listing.minimumQualification
    || null
  const jobDescription = joinDescriptionParts(
    detail.ExternalDescriptionStr,
    detail.ExternalResponsibilitiesStr,
    detail.ShortDescriptionStr,
    detail.ExternalQualificationsStr,
  ) || listing.jobDescription || null

  return {
    title,
    company: COMPANY_NAME,
    department: normalizeWhitespace(detail.JobFunction || detail.Department || detail.Category || detail.JobFamily)
      || listing.department
      || null,
    location,
    city: extractCity(location) || listing.city || null,
    country: COUNTRY_FILTER,
    jobId,
    requisitionId: jobId || listing.requisitionId || null,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: getEmploymentType(detail) || listing.employmentType || null,
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
      : listing.requiredSkills || [],
    postingDate: normalizeDate(detail.ExternalPostedStartDate || detail.PostedDate) || listing.postingDate || null,
    closingDate: normalizeDate(detail.ExternalPostedEndDate || detail.PostingEndDate) || listing.closingDate || null,
    jobDescription,
    remoteStatus: normalizeRemoteStatus(detail.WorkplaceType) || listing.remoteStatus || null,
    siteNumber: SITE_NUMBER,
    publicExperienceChecked: true,
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

export const createDpWorldScraper = ({
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY,
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  fetchText = defaultFetchText,
  fetchJson = defaultFetchJson,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run() {
    const corporateCareersHtml = await fetchText(CORPORATE_CAREERS_URL)
    if (!hasOfficialCorporateCareersSignal(corporateCareersHtml)) {
      throw new Error('DP World verified official DP World careers page no longer matches the known first-party handoff')
    }

    const candidateExperienceHtml = await fetchText(CANDIDATE_EXPERIENCE_URL)
    if (!hasOfficialCandidateExperienceSignal(candidateExperienceHtml)) {
      throw new Error('DP World verified Oracle candidate experience page no longer matches the known public shell')
    }

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

export const run = async (options = {}) => createDpWorldScraper(options).run()

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
