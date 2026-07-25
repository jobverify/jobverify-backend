import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PORTAL_ORIGIN = 'https://bfhlcareers.peoplestrong.com'
export const CAREERS_PAGE_URL = 'https://www.bajajfinservhealth.in/join-us'
export const DEFAULT_PAGE_SIZE = 20
export const EMPTY_SEARCH_BODY = {}

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const firstNonEmpty = (...values) => {
  for (const value of values) {
    const normalized = normalizeWhitespace(value)
    if (normalized) return normalized
  }
  return null
}

const normalizeSkills = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => normalizeWhitespace(item)).filter(Boolean))]
  }

  const normalized = normalizeWhitespace(value)
  if (!normalized) return []

  return [...new Set(
    normalized
      .split(',')
      .map((item) => normalizeWhitespace(item))
      .filter(Boolean),
  )]
}

const extractLocation = (record = {}) => firstNonEmpty(
  record.location,
  record.locationName,
  record.jobLocation,
  record.job_location,
  record.locationText,
  record.cityName,
  record.city,
)

const extractCity = (location) => normalizeWhitespace(String(location ?? '').split(',')[0]) || null

export const buildApiUrl = ({ offset = 0, limit = DEFAULT_PAGE_SIZE } = {}) => (
  `${PORTAL_ORIGIN}/api/cp/rest/altone/cp/jobs/v1?offset=${offset}&limit=${limit}`
)

export const buildJobDetailUrl = (reqCode) => (
  reqCode ? `${PORTAL_ORIGIN}/job/detail/${encodeURIComponent(reqCode)}` : null
)

export const buildJobDetailApiUrl = (
  reqCode,
  { part = 'overview', isReqId = true } = {},
) => (
  reqCode
    ? `${PORTAL_ORIGIN}/api/cp/rest/altone/cp/job/${encodeURIComponent(reqCode)}/v2?part=${encodeURIComponent(part)}&isReqId=${isReqId ? 'true' : 'false'}`
    : null
)

export const buildPublicHeaders = () => ({
  Origin: PORTAL_ORIGIN,
  Referer: `${PORTAL_ORIGIN}/`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
  Accept: 'application/json,text/plain,*/*',
  'Content-Type': 'application/json',
})

const defaultFetchJson = async (url, options = {}) => {
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

export const extractSearchResults = (payload) => (Array.isArray(payload?.response) ? payload.response : [])
  .map((record) => {
    const title = firstNonEmpty(
      record.jobTitle,
      record.title,
      record.designation,
      record.name,
    )
    const requisitionId = firstNonEmpty(
      record.reqCode,
      record.reqId,
      record.requisitionId,
      record.jobCode,
      record.id,
    )
    const location = extractLocation(record)
    const sourceUrl = buildJobDetailUrl(requisitionId)

    if (!title || !requisitionId || !sourceUrl) return null

    return {
      title,
      company: 'Bajaj Finserv Health',
      department: firstNonEmpty(record.department, record.departmentName, record.functionName),
      location,
      city: extractCity(location),
      country: firstNonEmpty(record.country, location?.includes('India') ? 'India' : null),
      jobId: firstNonEmpty(record.jobId, record.id, requisitionId),
      requisitionId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: firstNonEmpty(record.jobType, record.employmentType, record.type),
      experienceRequired: firstNonEmpty(record.experience, record.experienceRange),
      minimumQualification: firstNonEmpty(record.minimumQualification, record.minQualification),
      preferredQualification: firstNonEmpty(record.preferredQualification, record.prefQualification),
      requiredSkills: normalizeSkills(record.skills),
      postingDate: firstNonEmpty(record.postingDate, record.postedOn, record.publishDate),
      closingDate: firstNonEmpty(record.closingDate, record.expiryDate),
      jobDescription: firstNonEmpty(record.jobDescription, record.description),
    }
  })
  .filter(Boolean)

export const createBajajFinservHealthScraper = () => ({
  async run(options = {}) {
    const fetchJson = options.fetchJson || defaultFetchJson
    const pageSize = Number.isInteger(options.pageSize) ? options.pageSize : DEFAULT_PAGE_SIZE
    const maxPages = Number.isInteger(options.maxPages)
      ? options.maxPages
      : (Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY)
    const jobs = []
    let offset = Number.isInteger(options.initialOffset) ? options.initialOffset : 0
    let totalRecords = null

    for (let page = 0; page < maxPages; page += 1) {
      const payload = await fetchJson(buildApiUrl({ offset, limit: pageSize }), {
        method: 'POST',
        headers: buildPublicHeaders(),
        body: JSON.stringify(EMPTY_SEARCH_BODY),
      })

      const pageJobs = extractSearchResults(payload)
      jobs.push(...pageJobs)

      totalRecords = Number.isFinite(payload?.totalRecords) ? payload.totalRecords : totalRecords
      const responseCount = Array.isArray(payload?.response) ? payload.response.length : 0
      if (responseCount === 0) break

      offset += pageSize
      if (Number.isFinite(totalRecords) && offset >= totalRecords) break
    }

    return jobs.map((job) => ({
      ...job,
      source: 'bajajfinservhealth',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createBajajFinservHealthScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Bajaj Finserv Health scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'bajajfinservhealth')
    console.log('DB result:', result)
    process.exit(0)
  }
}
