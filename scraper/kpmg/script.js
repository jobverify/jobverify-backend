import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { mapWithConcurrency } from '../../scraper-support/utils/mapWithConcurrency.js'
import { extractJobFilterSignals } from '../../src/utils/jobFilterSignals.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const API_BASE_URL = 'https://ejgk.fa.em2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions'
export const DETAIL_API_BASE_URL = 'https://ejgk.fa.em2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails'
const PUBLIC_CAREERS_BASE_URL = 'https://ejgk.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites'
const DEFAULT_LOCATION = 'India'
const DEFAULT_LIMIT = 24
const DEFAULT_DETAIL_CONCURRENCY = 6

export const SITE_NUMBERS = ['CX_1', 'CX_3', 'CX_3001']

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
  Accept: 'application/json,text/plain,*/*',
}

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = String(value)
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

  return normalized
    .split(',')
    .map((part) => toTitleCase(part))
    .filter(Boolean)
    .join(', ')
}

const extractCity = (location) => normalizeLocation(location)?.split(',')[0] || null

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

export const buildJobDetailApiUrl = ({ siteNumber = SITE_NUMBERS[0], jobId }) =>
  `${DETAIL_API_BASE_URL}?expand=all&onlyData=true&finder=ById;Id=%22${normalizeWhitespace(jobId) || ''}%22,siteNumber=${siteNumber}`

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

const toJob = (record = {}, { siteNumber = SITE_NUMBERS[0] } = {}) => {
  const jobId = normalizeWhitespace(record.Id)
  const detailUrl = jobId ? buildJobDetailUrl({ siteNumber, jobId }) : null
  const title = normalizeWhitespace(record.Title)
  const minimumQualification = normalizeWhitespace(record.StudyLevel || record.ExternalQualificationsStr)
  const jobDescription = joinDescriptionParts(
    record.ShortDescriptionStr,
    record.ExternalResponsibilitiesStr,
  )

  return {
    title,
    company: 'KPMG',
    department: normalizeWhitespace(record.Department || record.JobFunction || record.JobFamily),
    location: normalizeLocation(record.PrimaryLocation),
    city: extractCity(record.PrimaryLocation),
    jobId,
    requisitionId: jobId,
    sourceUrl: detailUrl,
    applyUrl: detailUrl,
    employmentType: 'Full-time',
    experienceRequired: extractExperienceRequired({
      title,
      minimumQualification,
      jobDescription,
    }),
    minimumQualification,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: normalizeWhitespace(record.PostedDate),
    closingDate: normalizeWhitespace(record.PostingEndDate),
    jobDescription,
  }
}

export const extractSearchResults = (payload, options = {}) => getRequisitionList(payload)
  .filter((record) => isIndiaJob(record))
  .map((record) => toJob(record, options))

export const extractJobDetail = (payload, listing = {}, { siteNumber = SITE_NUMBERS[0] } = {}) => {
  const detail = getRequisitionDetail(payload)
  const title = normalizeWhitespace(detail.Title) || listing.title || null
  const minimumQualification = normalizeWhitespace(detail.StudyLevel || detail.ExternalQualificationsStr) || listing.minimumQualification || null
  const jobDescription = joinDescriptionParts(
    detail.ExternalDescriptionStr,
    detail.ShortDescriptionStr,
    detail.ExternalResponsibilitiesStr,
    detail.ExternalQualificationsStr,
  ) || listing.jobDescription || null
  const jobId = normalizeWhitespace(detail.Id) || listing.jobId || null
  const location = normalizeLocation(detail.PrimaryLocation) || listing.location || null
  const detailUrl = jobId ? buildJobDetailUrl({ siteNumber, jobId }) : listing.sourceUrl || listing.applyUrl || null

  return {
    title,
    company: 'KPMG',
    department: normalizeWhitespace(detail.Department || detail.JobFunction || detail.JobFamily) || listing.department || null,
    location,
    city: extractCity(location) || listing.city || null,
    jobId,
    requisitionId: jobId || listing.requisitionId || null,
    sourceUrl: detailUrl,
    applyUrl: detailUrl,
    employmentType: normalizeWhitespace(detail.JobSchedule || detail.RequisitionType || detail.JobType || detail.WorkerType || detail.ContractType) || listing.employmentType || 'Full-time',
    experienceRequired: extractExperienceRequired({
      title,
      minimumQualification,
      jobDescription,
    }) || listing.experienceRequired || null,
    minimumQualification,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: normalizeWhitespace(detail.ExternalPostedStartDate || detail.PostedDate) || listing.postingDate || null,
    closingDate: normalizeWhitespace(detail.ExternalPostedEndDate || detail.PostingEndDate) || listing.closingDate || null,
    jobDescription,
    publicExperienceChecked: true,
  }
}

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

const fetchJson = async (url, fetchImpl = fetch, { signal } = {}) => {
  signal?.throwIfAborted()
  const response = await fetchImpl(url, { headers: REQUEST_HEADERS, signal })
  signal?.throwIfAborted()
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }
  const payload = await response.json()
  signal?.throwIfAborted()
  return payload
}

export const createKpmgScraper = ({
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : 10,
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  fetchImpl = fetch,
  siteNumbers = SITE_NUMBERS,
  detailConcurrency = DEFAULT_DETAIL_CONCURRENCY,
} = {}) => ({
  async run({ signal } = {}) {
    const jobs = []
    const seenUrls = new Set()

    for (const siteNumber of siteNumbers) {
      for (let page = 0; page < maxPages; page += 1) {
        signal?.throwIfAborted()
        const payload = await fetchJson(buildSearchUrl({ siteNumber, page }), fetchImpl, { signal })
        const pageJobs = extractSearchResults(payload, { siteNumber })
        const freshJobs = []

        for (const job of pageJobs) {
          const key = job.sourceUrl || `${siteNumber}:${job.jobId}`
          if (seenUrls.has(key)) continue
          seenUrls.add(key)
          freshJobs.push(job)

          if (maxJobs && jobs.length + freshJobs.length >= maxJobs) break
        }

        const detailedJobs = await mapWithConcurrency(
          freshJobs,
          detailConcurrency,
          async (job) => {
            signal?.throwIfAborted()
            let detail = job

            try {
              const detailPayload = await fetchJson(buildJobDetailApiUrl({
                siteNumber,
                jobId: job.jobId,
              }), fetchImpl, { signal })
              detail = extractJobDetail(detailPayload, job, { siteNumber })
            } catch {
              signal?.throwIfAborted()
              detail = job
            }

            signal?.throwIfAborted()
            return {
              ...detail,
              source: 'kpmg',
              link: detail.applyUrl || detail.sourceUrl,
              scrapedAt: new Date().toISOString(),
            }
          },
        )

        jobs.push(...detailedJobs)
        signal?.throwIfAborted()

        if (maxJobs && jobs.length >= maxJobs) return jobs

        const summary = extractPaginationSummary(payload, { page })

        if (!summary.hasNext) {
          break
        }
      }
    }

    signal?.throwIfAborted()
    return jobs
  },
})

export const run = async (options = {}) => createKpmgScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
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
