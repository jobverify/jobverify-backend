import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const BASE_URL = 'https://www.amazon.jobs'
export const SEARCH_COUNTRY_CODE = 'IND'
export const DEFAULT_PAGE_SIZE = 10

const MONTH_INDEX = {
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12',
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<div\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase()
}

const normalizeDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
    return normalized.slice(0, 10)
  }

  const match = normalized.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/)
  if (!match) return null

  const [, monthName, day, year] = match
  const month = MONTH_INDEX[monthName.toLowerCase()]
  if (!month) return null

  return `${year}-${month}-${String(day).padStart(2, '0')}`
}

const normalizeLocation = (record = {}) => {
  const normalizedLocation = normalizeWhitespace(record.normalized_location)
  if (normalizedLocation) {
    return normalizedLocation.replace(/\bIND\b/i, 'India')
  }

  const city = normalizeWhitespace(record.city)
  return city ? `${city}, India` : null
}

const extractCity = (record = {}, normalizedLocation) =>
  normalizeWhitespace(record.city)
  || normalizeWhitespace(normalizedLocation)?.split(',')[0]
  || null

export const buildSearchApiUrl = ({
  offset = 0,
  resultLimit = DEFAULT_PAGE_SIZE,
  sort = 'relevant',
} = {}) => {
  const url = new URL('/en/search.json', `${BASE_URL}/`)
  url.searchParams.set('offset', String(Math.max(0, Number(offset) || 0)))
  url.searchParams.set('result_limit', String(Math.max(1, Number(resultLimit) || DEFAULT_PAGE_SIZE)))
  url.searchParams.set('sort', normalizeWhitespace(sort) || 'relevant')
  url.searchParams.append('normalized_country_code[]', SEARCH_COUNTRY_CODE)
  return url.toString()
}

export const buildJobUrl = (jobPath) => {
  const normalized = normalizeWhitespace(jobPath)
  return normalized ? new URL(normalized, `${BASE_URL}/`).toString() : null
}

export const buildApplyUrl = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized).toString()
  } catch {
    return null
  }
}

export const extractPaginationSummary = (payload, {
  offset = 0,
  resultLimit = DEFAULT_PAGE_SIZE,
} = {}) => {
  const totalRecords = Number(payload?.hits) || 0
  const safeOffset = Math.max(0, Number(offset) || 0)
  const safeResultLimit = Math.max(1, Number(resultLimit) || DEFAULT_PAGE_SIZE)
  const totalPages = Math.ceil(totalRecords / safeResultLimit)

  return {
    offset: safeOffset,
    resultLimit: safeResultLimit,
    totalRecords,
    totalPages,
    hasNext: safeOffset + safeResultLimit < totalRecords,
  }
}

export const extractSearchResults = (payload) => (Array.isArray(payload?.jobs) ? payload.jobs : [])
  .filter((record) => normalizeWhitespace(record.country_code) === SEARCH_COUNTRY_CODE)
  .map((record) => {
    const title = normalizeWhitespace(record.title)
    const jobId = normalizeWhitespace(record.id_icims)
    const requisitionId = normalizeWhitespace(record.id)
    const sourceUrl = buildJobUrl(record.job_path)
    const applyUrl = buildApplyUrl(record.url_next_step)
    const location = normalizeLocation(record)
    const city = extractCity(record, location)

    if (!title || !jobId || !requisitionId || !sourceUrl || !applyUrl || !location) {
      return null
    }

    return {
      title,
      company: 'Amazon',
      department: normalizeWhitespace(record.job_category),
      location,
      city,
      jobId,
      requisitionId,
      sourceUrl,
      applyUrl,
      employmentType: normalizeEmploymentType(record.job_schedule_type),
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: normalizeDate(record.posted_date),
      closingDate: null,
      jobDescription: stripTags(record.description),
    }
  })
  .filter(Boolean)

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

export const createAmazonScraper = ({
  pageSize = Number.isInteger(config.pageSize) ? config.pageSize : DEFAULT_PAGE_SIZE,
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY,
} = {}) => ({
  async run(options = {}) {
    const fetchJsonImpl = options.fetchJson || fetchJson
    const jobs = []
    const seenJobIds = new Set()

    for (let page = 0; page < maxPages; page += 1) {
      const offset = page * pageSize
      const payload = await fetchJsonImpl(buildSearchApiUrl({ offset, resultLimit: pageSize }))
      const listings = extractSearchResults(payload)
      const summary = extractPaginationSummary(payload, { offset, resultLimit: pageSize })

      for (const job of listings) {
        if (seenJobIds.has(job.jobId)) continue
        seenJobIds.add(job.jobId)

        jobs.push({
          ...job,
          source: 'amazon',
          link: job.applyUrl || job.sourceUrl,
          scrapedAt: new Date().toISOString(),
        })

        if (maxJobs && jobs.length >= maxJobs) {
          return jobs
        }
      }

      if (!summary.hasNext || listings.length === 0) {
        break
      }
    }

    return jobs
  },
})

export const run = async () => createAmazonScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Amazon scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)
  const cities = [...new Set(jobs.map((job) => job.city).filter(Boolean))].sort()
  console.log(`Cities found: ${cities.join(', ')}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'amazon')
    console.log('DB result:', result)
    process.exit(0)
  }
}
