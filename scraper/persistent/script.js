import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const API_BASE_URL = 'https://apipersistent.zwayam.com'
const CAREERS_BASE_URL = 'https://careers.persistent.com'
const SEARCH_API_URL = `${API_BASE_URL}/jobs/search`
const DETAIL_API_URL = `${API_BASE_URL}/jobs-service/v1/jobs/careersite`
const COMPANY_ID = 'MTQ5Nzc='
const DOMAIN = 'careers.persistent.com'
const DEFAULT_PAGE_SIZE = 9

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
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
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

const splitCsv = (value) => normalizeWhitespace(value)
  ?.split(',')
  .map((part) => normalizeWhitespace(part))
  .filter(Boolean) || []

const normalizeExperience = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return normalized.replace(/\s+to\s+/i, '-')
}

const normalizeLocation = (value, jobLocationRecord = []) => {
  const cities = jobLocationRecord
    .map((location) => toTitleCase(location?.city || location?.location))
    .filter(Boolean)

  if (cities.length > 1) return cities.join(' / ')
  if (cities.length === 1) return cities[0]

  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  return normalized
    .split(/[;/]/)
    .map((part) => toTitleCase(part))
    .filter(Boolean)
    .join(' / ')
}

const extractCity = (location, jobLocationRecord = []) =>
  toTitleCase(jobLocationRecord[0]?.city)
  || normalizeWhitespace(location)?.split('/')[0]?.trim()
  || null

const normalizeDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const dashMonth = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(normalized)
  if (dashMonth) {
    const [, day, monthName, year] = dashMonth
    const monthMap = {
      jan: '01',
      feb: '02',
      mar: '03',
      apr: '04',
      may: '05',
      jun: '06',
      jul: '07',
      aug: '08',
      sep: '09',
      oct: '10',
      nov: '11',
      dec: '12',
    }
    const month = monthMap[monthName.toLowerCase()]
    if (month) return `${year}-${month}-${day.padStart(2, '0')}`
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return normalized

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isIndiaJob = (record = {}) =>
  normalizeWhitespace(record?.text1)?.toLowerCase() === 'india'
  || (Array.isArray(record?.jobLocationRecord) && record.jobLocationRecord.some(
    (location) => /india/i.test(normalizeWhitespace(location?.country) || ''),
  ))

export const buildSearchPayload = ({ page = 1, keywords = '' } = {}) => ({
  filterCri: JSON.stringify({
    paginationStartNo: (Math.max(1, Number(page) || 1) - 1) * DEFAULT_PAGE_SIZE,
    selectedCall: 'sort',
    sortCriteria: {
      name: 'modifiedDate',
      isAscending: false,
    },
    anyOfTheseWords: normalizeWhitespace(keywords) || '',
  }),
  domain: DOMAIN,
  companyId: COMPANY_ID,
})

export const buildJobDetailUrl = (jobUrl) =>
  `${CAREERS_BASE_URL}/jobview/${normalizeWhitespace(jobUrl) || ''}`

const toJobFromListing = (record = {}) => {
  const location = normalizeLocation(record.location || record.locAgg, record.jobLocationRecord)
  const jobUrl = normalizeWhitespace(record.jobUrl)

  return {
    title: normalizeWhitespace(record.jobTitle),
    company: 'Persistent Systems',
    department: normalizeWhitespace(record.departmentName || record.DepartmentName),
    location,
    city: extractCity(location, record.jobLocationRecord),
    jobId: normalizeWhitespace(record.jobCode),
    requisitionId: normalizeWhitespace(record.referenceNumber || record.refNumber),
    sourceUrl: jobUrl ? buildJobDetailUrl(jobUrl) : null,
    applyUrl: jobUrl ? buildJobDetailUrl(jobUrl) : null,
    employmentType: null,
    experienceRequired: normalizeExperience(record.experienceUIField),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: splitCsv(record.mandatorySkills?.join(',')),
    postingDate: normalizeDate(record.createDate || record.postingDate || record.createdDate),
    closingDate: null,
    jobDescription: normalizeWhitespace(record.shortDescription),
  }
}

export const extractSearchResults = (payload) => (payload?.data?.data || [])
  .map((item) => item?._source || item)
  .filter((record) => isIndiaJob(record))
  .map((record) => toJobFromListing(record))
  .filter((job) => job.title && job.jobId && job.sourceUrl)

export const extractPaginationSummary = (payload, { currentOffset = 0 } = {}) => {
  const pageSize = Number.parseInt(
    normalizeWhitespace(payload?.data?.facetedSearchConfig?.paginationHowMuch) || '',
    10,
  )
  const normalizedPageSize = Number.isFinite(pageSize) ? pageSize : DEFAULT_PAGE_SIZE

  return {
    hasNext: Boolean(payload?.data?.hasMoreData),
    pageSize: normalizedPageSize,
    nextOffset: currentOffset + normalizedPageSize,
    totalCount: Number(payload?.data?.totalCount) || 0,
  }
}

export const extractJobDetail = (payload, listing = {}) => {
  const sourceUrl = listing.sourceUrl || buildJobDetailUrl(payload?.jobUrl)
  const location = normalizeLocation(
    payload?.Location || payload?.locationDisplayForManageJobs || listing.location,
  )
  const description = stripTags(payload?.longDescription)
  const employmentType = normalizeWhitespace(
    /Job Type:\s*([^<\n]+)/i.exec(String(payload?.longDescription ?? ''))?.[1],
  )

  return {
    title: normalizeWhitespace(payload?.jobTitle) || listing.title || null,
    department: normalizeWhitespace(
      payload?.department?.departmentName || payload?.departmentName,
    ) || listing.department || null,
    location: location || listing.location || null,
    city: extractCity(location || listing.location) || listing.city || null,
    jobId: normalizeWhitespace(payload?.jobCode || payload?.['Job Code']) || listing.jobId || null,
    requisitionId: normalizeWhitespace(payload?.referenceNumber) || listing.requisitionId || null,
    employmentType,
    experienceRequired: normalizeExperience(payload?.['Years Of Exp']) || listing.experienceRequired || null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: splitCsv(payload?.['Skills Required']),
    postingDate: normalizeDate(payload?.createDate) || listing.postingDate || null,
    closingDate: null,
    applyUrl: sourceUrl,
    sourceUrl,
    jobDescription: description,
  }
}

const buildSearchFormData = (payload) => {
  const form = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    form.append(key, value)
  })
  return form
}

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

const markUpstreamOutage = (error) => {
  if (/\bHTTP\s+5\d\d\b/i.test(String(error?.message || error))) {
    error.softFailure = true
    error.upstreamOutage = true
  }

  return error
}

export const createPersistentScraper = ({
  fetchJsonImpl = fetchJson,
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY,
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run() {
    const jobs = []
    const seenJobIds = new Set()

    try {
      for (let page = 1; page <= maxPages; page += 1) {
        const searchPayload = buildSearchPayload({ page })
        const listingPayload = await fetchJsonImpl(SEARCH_API_URL, {
          method: 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
            Accept: 'application/json,text/plain,*/*',
          },
          body: buildSearchFormData(searchPayload),
        })

        const listings = extractSearchResults(listingPayload)
        const summary = extractPaginationSummary(listingPayload, {
          currentOffset: (page - 1) * DEFAULT_PAGE_SIZE,
        })

        for (const listing of listings) {
          if (seenJobIds.has(listing.jobId)) continue
          seenJobIds.add(listing.jobId)

          const detailPayload = await fetchJsonImpl(DETAIL_API_URL, {
            method: 'POST',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
              Accept: 'application/json,text/plain,*/*',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jobUrl: listing.sourceUrl.split('/').pop(),
              externalSource: 'CareerSite',
              campusUrl: 'empty',
              companyId: '14977',
            }),
          })

          const detail = extractJobDetail(detailPayload, listing)

          jobs.push({
            ...detail,
            company: 'Persistent Systems',
            source: 'persistent',
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
    } catch (error) {
      throw markUpstreamOutage(error)
    }
  },
})

export const run = async () => createPersistentScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Persistent Systems scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)
  const cities = [...new Set(jobs.map((job) => job.city).filter(Boolean))].sort()
  console.log(`Cities found: ${cities.join(', ')}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'persistent')
    console.log('DB result:', result)
    process.exit(0)
  }
}
