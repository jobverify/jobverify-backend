import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'onsemiindia'
export const COMPANY_NAME = 'onsemi India'
export const CORPORATE_CAREERS_URL = 'https://www.onsemi.com/careers'
export const CANDIDATE_EXPERIENCE_URL =
  'https://hctz.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/jobs'
export const LISTING_API_BASE_URL =
  'https://hctz.fa.us2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions'
export const DETAIL_API_BASE_URL =
  'https://hctz.fa.us2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails'
export const PUBLIC_JOBS_BASE_URL =
  'https://hctz.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/job/'
export const SITE_NUMBER = 'CX_1001'
export const DEFAULT_LIMIT = 24

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
  const normalized = decodeHtmlEntities(value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol|hr)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+:/g, ':'),
)

const joinDescriptionParts = (...parts) => normalizeWhitespace(
  parts
    .map((part) => stripTags(part))
    .filter(Boolean)
    .join(' '),
)

const extractLines = (value) => String(value ?? '')
  .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol|hr)\b[^>]*>/gi, '\n')
  .replace(/<li\b[^>]*>/gi, '\n')
  .replace(/<p\b[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .split(/\n+/)
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const isDecorativeQualificationLine = (value) => /^(?:qualifications?|what you['’]ll need|requirements?)$/i.test(String(value || ''))

const extractMinimumQualification = (record = {}) =>
  extractLines(record.ExternalQualificationsStr).find((line) => (
    !isDecorativeQualificationLine(line)
    && !/\b(?:years?|months?|yrs?)\b/i.test(line)
  ))
  || normalizeWhitespace(record.StudyLevel)
  || null

const extractExperienceRequired = (record = {}) =>
  extractLines(record.ExternalQualificationsStr).find((line) => (
    !isDecorativeQualificationLine(line)
    && /\b(?:years?|months?|yrs?)\b/i.test(line)
  ))
  || null

const isIndiaLocation = (value) => /(?:^|,)\s*india\s*$/i.test(String(value || ''))

const getRequisitionList = (payload) => {
  if (Array.isArray(payload?.items)) {
    return payload.items.flatMap((item) => (
      Array.isArray(item?.requisitionList) ? item.requisitionList : []
    ))
  }
  return Array.isArray(payload?.requisitionList) ? payload.requisitionList : []
}

const getRequisitionDetail = (payload) => {
  if (Array.isArray(payload?.items) && payload.items[0]) {
    return payload.items[0]
  }
  return payload || {}
}

const getLocation = (record = {}) => {
  if (normalizeWhitespace(record.PrimaryLocationCountry)?.toUpperCase() === 'IN') {
    return normalizeWhitespace(record.PrimaryLocation)
  }
  return record.secondaryLocations?.find((location) => (
    location?.CountryCode === 'IN' || isIndiaLocation(location?.Name)
  ))?.Name || null
}

export const buildSearchUrl = ({ page = 0, limit = DEFAULT_LIMIT } = {}) => {
  const normalizedLimit = Number(limit) || DEFAULT_LIMIT
  const offset = Math.max(0, Number(page) || 0) * normalizedLimit
  return `${LISTING_API_BASE_URL}?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=${SITE_NUMBER},limit=${normalizedLimit},offset=${offset},location=India`
}

export const buildJobDetailUrl = (jobId) => `${PUBLIC_JOBS_BASE_URL}${jobId}`
export const buildJobDetailApiUrl = (jobId) =>
  `${DETAIL_API_BASE_URL}?expand=all&onlyData=true&finder=ById;Id=%22${normalizeWhitespace(jobId) || ''}%22,siteNumber=${SITE_NUMBER}`

export const extractSearchResults = (payload) => getRequisitionList(payload)
  .filter((record) => {
    const location = getLocation(record)
    return normalizeWhitespace(record.PrimaryLocationCountry)?.toUpperCase() === 'IN'
      || isIndiaLocation(location)
  })
  .map((record) => {
    const jobId = normalizeWhitespace(record.Id)
    const location = normalizeWhitespace(getLocation(record))
    const detailUrl = jobId ? buildJobDetailUrl(jobId) : null
    return {
      title: normalizeWhitespace(record.Title),
      company: COMPANY_NAME,
      location,
      city: location?.split(',')[0]?.trim() || null,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: detailUrl,
      applyUrl: detailUrl,
      department: normalizeWhitespace(record.Organization || record.Department || record.JobFunction),
      employmentType: normalizeWhitespace(record.JobSchedule || record.JobType || record.WorkerType),
      postingDate: normalizeWhitespace(record.ExternalPostedStartDate || record.PostedDate),
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      jobDescription: joinDescriptionParts(record.ShortDescriptionStr),
    }
  })
  .filter((job) => job.title && job.jobId && job.sourceUrl)

export const extractJobDetail = (payload, listing = {}) => {
  const detail = getRequisitionDetail(payload)
  const location = normalizeWhitespace(getLocation(detail)) || listing.location || null
  const sourceUrl = listing.sourceUrl || buildJobDetailUrl(normalizeWhitespace(detail.Id) || listing.jobId)

  return {
    title: normalizeWhitespace(detail.Title) || listing.title || null,
    company: COMPANY_NAME,
    location,
    city: location?.split(',')[0]?.trim() || listing.city || null,
    country: 'India',
    jobId: normalizeWhitespace(detail.Id) || listing.jobId || null,
    requisitionId: normalizeWhitespace(detail.Id) || listing.requisitionId || null,
    sourceUrl,
    applyUrl: sourceUrl,
    department: normalizeWhitespace(
      detail.Organization || detail.Department || detail.JobFunction,
    ) || listing.department || null,
    employmentType: normalizeWhitespace(
      detail.JobSchedule || detail.JobType || detail.WorkerType,
    ) || listing.employmentType || null,
    postingDate: normalizeWhitespace(detail.ExternalPostedStartDate || detail.PostedDate) || listing.postingDate || null,
    experienceRequired: extractExperienceRequired(detail) || listing.experienceRequired || null,
    minimumQualification: extractMinimumQualification(detail) || listing.minimumQualification || null,
    preferredQualification: listing.preferredQualification || null,
    requiredSkills: Array.isArray(detail.skills)
      ? detail.skills
        .map((skill) => normalizeWhitespace(skill?.Skill))
        .filter(Boolean)
      : listing.requiredSkills || [],
    jobDescription: joinDescriptionParts(
      detail.ExternalDescriptionStr,
      detail.ExternalResponsibilitiesStr,
      detail.ExternalQualificationsStr,
      detail.ShortDescriptionStr,
    ) || listing.jobDescription || null,
  }
}

const defaultFetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36',
      Accept: 'application/json,text/plain,*/*',
    },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.json()
}

export const createOnsemiIndiaScraper = ({
  maxPages = Number.POSITIVE_INFINITY,
  fetchJson = defaultFetchJson,
} = {}) => ({
  async run() {
    const jobs = []
    const seenIds = new Set()

    for (let page = 0; page < maxPages; page += 1) {
      const payload = await fetchJson(buildSearchUrl({ page }))
      const pageJobs = extractSearchResults(payload).filter((job) => {
        if (seenIds.has(job.jobId)) return false
        seenIds.add(job.jobId)
        return true
      })

      for (const listing of pageJobs) {
        let detail = listing
        try {
          const detailPayload = await fetchJson(buildJobDetailApiUrl(listing.jobId))
          detail = extractJobDetail(detailPayload, listing)
        } catch {
          detail = listing
        }
        jobs.push(detail)
      }

      const summary = payload?.items?.[0] || {}
      const limit = Number(summary.Limit) || DEFAULT_LIMIT
      const total = Number(summary.TotalJobsCount)
      if (pageJobs.length < limit || (Number.isFinite(total) && (page + 1) * limit >= total)) break
    }

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createOnsemiIndiaScraper(options).run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()
  if (process.argv.includes('--dry-run')) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
