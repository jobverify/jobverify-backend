import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'aciworldwideindia'
export const COMPANY_NAME = 'ACI Worldwide India'
export const COMPANY_DOMAIN = 'aciworldwide.com'
export const VERIFIED_AT = '2026-07-14'
export const ATS_PLATFORM = 'oracle-cloud'
export const COUNTRY_FILTER = 'India'
export const PAGINATION_STRATEGY = 'offset-query'
export const EXTRACTION_STRATEGY =
  'verified-official-careers-pages+oracle-cloud-finder-api+oracle-cloud-detail-api'
export const PARSER = 'custom-script'
export const NORMALIZATION_PROFILE = 'engineering-default'
export const CORPORATE_CAREERS_URL = 'https://www.aciworldwide.com/about-aci/careers'
export const CANDIDATE_EXPERIENCE_URL =
  'https://ebwg.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/'
export const WORKSPACE_DOMAIN = 'ebwg.fa.us2.oraclecloud.com'
export const LISTING_API_BASE_URL =
  'https://ebwg.fa.us2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions'
export const DETAIL_API_BASE_URL =
  'https://ebwg.fa.us2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails'
export const PUBLIC_JOBS_BASE_URL =
  'https://ebwg.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/'
export const SITE_NUMBER = 'CX'
export const DEFAULT_LOCATION = 'India'
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

  return {
    title: normalizeWhitespace(record.Title),
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
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: normalizeDate(record.ExternalPostedStartDate || record.PostedDate),
    closingDate: normalizeDate(record.ExternalPostedEndDate || record.PostingEndDate),
    jobDescription: joinDescriptionParts(record.ShortDescriptionStr),
    remoteStatus: null,
    siteNumber: SITE_NUMBER,
  }
}

export const hasOfficialCorporateCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /<title>\s*Careers\s*\|\s*ACI Worldwide\s*<\/title>/i.test(page)
    && /href=["']https:\/\/ebwg\.fa\.us2\.oraclecloud\.com\/hcmUI\/CandidateExperience\/en\/sites\/CX\/["'][^>]*>\s*Explore Opportunities\s*</i.test(page)
    && text.includes('ACI powers the global economy.')
    && text.includes('Every person at ACI makes an impact on payments around the world.')
    && text.includes('Explore Opportunities')
}

export const hasOfficialCandidateExperienceSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*ACI Worldwide Job Opportunities\s*<\/title>/i.test(page)
    && /<meta[^>]+property=["']og:title["'][^>]+content=["']ACI Worldwide Job Opportunities Careers["']/i.test(page)
    && /<meta[^>]+property=["']og:description["'][^>]+content=["']JOIN OUR TEAM["']/i.test(page)
    && /<base[^>]+href=["']\/hcmUI\/CandidateExperience\/en\/sites\/CX\/?["'][^>]+data-apibaseurl=["']https:\/\/ebwg\.fa\.us2\.oraclecloud\.com:443["'][^>]+data-sitenumber=["']CX["']/i.test(page)
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

  return {
    title: normalizeWhitespace(detail.Title) || listing.title || null,
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
    experienceRequired: null,
    minimumQualification: normalizeWhitespace(detail.ExternalQualificationsStr || detail.StudyLevel)
      || listing.minimumQualification
      || null,
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
    remoteStatus: null,
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

export const createAciWorldwideIndiaScraper = ({
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY,
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  fetchText = defaultFetchText,
  fetchJson = defaultFetchJson,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run() {
    const corporateCareersHtml = await fetchText(CORPORATE_CAREERS_URL)
    if (!hasOfficialCorporateCareersSignal(corporateCareersHtml)) {
      throw new Error('ACI Worldwide India verified official ACI Worldwide careers page no longer matches the known first-party handoff')
    }

    const candidateExperienceHtml = await fetchText(CANDIDATE_EXPERIENCE_URL)
    if (!hasOfficialCandidateExperienceSignal(candidateExperienceHtml)) {
      throw new Error('ACI Worldwide India verified Oracle candidate experience page no longer matches the known first-party shell')
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

export const run = async (options = {}) => createAciWorldwideIndiaScraper(options).run()

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
