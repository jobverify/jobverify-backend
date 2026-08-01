import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const LISTING_API_BASE_URL = 'https://fa-exph-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions'
export const DETAIL_API_BASE_URL = 'https://fa-exph-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails'
export const PUBLIC_CAREERS_BASE_URL = 'https://fa-exph-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/jubilant/job/'
export const CAREERS_URL = 'https://www.jubilantfoodworks.com/careers/work-with-us'
export const SITE_NUMBER = 'CX_2005'
export const DEFAULT_LOCATION = 'India'
export const DEFAULT_LIMIT = 24

const COMPANY_NAME = 'Jubilant FoodWorks'
const SOURCE = 'jubilantfoodworks'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const OFFICIAL_CAREERS_LINK_PATTERN = /https:\/\/fa-exph-saasfaprod1\.fa\.ocs\.oraclecloud\.com\/hcmUI\/CandidateExperience\/en\/sites\/jubilant\/?/i
const CAREERS_TEXT_PATTERN = /view all jobs/i

const BUSINESS_UNIT_BY_ID = new Map([
  ['300000003654014', 'Corporate'],
  ['300000003654066', "Domino's Pizza India"],
  ['300000003654105', 'Dunkin'],
  ['300000003654118', "Hong's Kitchen"],
  ['300000003654131', 'Integrated Supply Chain'],
  ['300000003654170', 'Popeyes'],
])

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

const buildLocationFromWorkLocation = (record = {}) => {
  const workLocation = Array.isArray(record.workLocation) ? record.workLocation[0] : null
  if (!workLocation) return null

  const city = toTitleCase(workLocation.TownOrCity)
  const region = toTitleCase(workLocation.Region2 || workLocation.Region1 || workLocation.Region3)
  const country = normalizeWhitespace(workLocation.Country)?.toUpperCase() === 'IN'
    ? 'India'
    : toTitleCase(workLocation.Country)

  return [city, region, country].filter(Boolean).join(', ') || null
}

const getEffectiveLocation = (record = {}) => {
  const workLocation = buildLocationFromWorkLocation(record)
  if (workLocation) return workLocation

  const primaryLocation = normalizeWhitespace(record.PrimaryLocation)
  if (!primaryLocation) return null
  if (/^india$/i.test(primaryLocation)) return 'India'

  return primaryLocation
    .split(',')
    .map((part) => toTitleCase(part))
    .filter(Boolean)
    .join(', ')
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized || /^india$/i.test(normalized)) return null
  return normalized.split(',')[0] || null
}

const getDepartment = (record = {}) => {
  const businessUnitId = normalizeWhitespace(record.BusinessUnitId)
  const organizationId = normalizeWhitespace(record.OrganizationId)

  return BUSINESS_UNIT_BY_ID.get(businessUnitId)
    || BUSINESS_UNIT_BY_ID.get(organizationId)
    || normalizeWhitespace(record.RequisitionType)
    || normalizeWhitespace(record.Department)
    || normalizeWhitespace(record.Organization)
    || null
}

const getEmploymentType = (record = {}) => normalizeWhitespace(
  record.JobSchedule
    || record.RequisitionType
    || record.JobType
    || record.WorkerType
    || record.ContractType,
)

const isIndiaJob = (record = {}) => {
  const country = normalizeWhitespace(record.PrimaryLocationCountry)?.toUpperCase()
  const location = normalizeWhitespace(record.PrimaryLocation)?.toLowerCase()
  return country === 'IN' || location?.endsWith('india') || false
}

const toJob = (record = {}) => {
  const jobId = normalizeWhitespace(record.Id)
  const sourceUrl = jobId ? buildJobDetailUrl(jobId) : null
  const location = getEffectiveLocation(record)

  return {
    title: normalizeWhitespace(record.Title),
    company: COMPANY_NAME,
    department: getDepartment(record),
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
    postingDate: normalizeDate(record.ExternalPostedStartDate || record.PostedDate),
    closingDate: normalizeDate(record.ExternalPostedEndDate || record.PostingEndDate),
    jobDescription: joinDescriptionParts(
      record.ExternalDescriptionStr,
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

const buildJobDetailApiUrl = (jobId) =>
  `${DETAIL_API_BASE_URL}?expand=all&onlyData=true&finder=ById;Id=%22${normalizeWhitespace(jobId) || ''}%22,siteNumber=${SITE_NUMBER}`

export const buildJobDetailUrl = (jobId) => `${PUBLIC_CAREERS_BASE_URL}${jobId}`

export const extractSearchResults = (payload) => getRequisitionList(payload)
  .filter((record) => isIndiaJob(record))
  .map((record) => toJob(record))
  .filter((job) => job.title && job.jobId && job.sourceUrl)

export const extractPaginationSummary = (payload, { page = 0 } = {}) => {
  const summary = payload?.items?.[0] || {}
  const pageSize = Number(summary.Limit) || DEFAULT_LIMIT
  const totalCount = Number(summary.TotalJobsCount) || 0
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
  const sourceUrl = listing.sourceUrl || buildJobDetailUrl(detail.Id)

  return {
    title: normalizeWhitespace(detail.Title) || listing.title || null,
    company: COMPANY_NAME,
    department: getDepartment(detail) || listing.department || null,
    location,
    city: extractCity(location) || listing.city || null,
    jobId: normalizeWhitespace(detail.Id) || listing.jobId || null,
    requisitionId: normalizeWhitespace(detail.Id) || listing.requisitionId || null,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: getEmploymentType(detail) || listing.employmentType || null,
    experienceRequired: null,
    minimumQualification: normalizeWhitespace(detail.StudyLevel || detail.ExternalQualificationsStr) || listing.minimumQualification || null,
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
  }
}

export const hasOfficialCareersPageSignal = (html) => {
  const page = String(html ?? '')
  return CAREERS_TEXT_PATTERN.test(page) && OFFICIAL_CAREERS_LINK_PATTERN.test(page)
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

const defaultFetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain,*/*',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const createJubilantFoodWorksScraper = ({
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY,
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  fetchText = defaultFetchText,
  fetchJson = defaultFetchJson,
} = {}) => ({
  async run() {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Jubilant FoodWorks verified official careers page no longer links to the verified Oracle board')
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
          scrapedAt: new Date().toISOString(),
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

export const run = async () => createJubilantFoodWorksScraper().run()

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
