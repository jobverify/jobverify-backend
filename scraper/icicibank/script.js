import crypto from 'node:crypto'
import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREERS_PORTAL_URL = 'https://www.icicicareers.com/CareerApplicant/Career/Home'
export const JOB_LISTING_URL = 'https://www.icicicareers.com/CareerApplicant/career/job-listing/'
export const SEARCH_API_URL = 'https://www.icicicareers.com/CareerApplicantApi/Career/Search/1'
export const DETAIL_API_BASE_URL = 'https://www.icicicareers.com/CareerApplicantApi/Career/getSingleJob/1'
export const PUBLIC_JOB_DETAIL_BASE_URL = 'https://www.icicicareers.com/CareerApplicant/Career/job-details'

const COMPANY = 'ICICI Bank Ltd'
const SOURCE = 'icicibank'
const SEARCH_PAGE_SIZE = 12
const ENCRYPTION_KEY = '$k@m0u$0172@0r!k'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

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
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripHtml = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, ' ')
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<p\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const extractRequiredSkills = (html) => [...String(html ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripHtml(match[1]))
  .filter(Boolean)

const buildRandomIv = () => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.randomBytes(16)

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

export const buildSearchRequestPayload = (pageNo = 0) => ({
  userId: 1,
  ApplicantId: '',
  keyword: '',
  maingroup: '',
  experience: '',
  PageNo: pageNo,
  limit: SEARCH_PAGE_SIZE,
  isAllIndia: 3,
})

export const buildPublicJobUrl = (jobId) => `${PUBLIC_JOB_DETAIL_BASE_URL}/${encodeURIComponent(jobId)}`

export const buildDetailApiUrl = (jobId) => `${DETAIL_API_BASE_URL}/${encodeURIComponent(jobId)}`

export const encryptApiPayload = (value) => {
  const iv = buildRandomIv()
  const cipher = crypto.createCipheriv(
    'aes-128-cbc',
    Buffer.from(ENCRYPTION_KEY, 'utf8'),
    Buffer.from(iv, 'utf8'),
  )

  return Buffer.concat([
    cipher.update(JSON.stringify(value), 'utf8'),
    cipher.final(),
  ]).toString('base64') + iv
}

export const decryptApiPayload = (payload) => {
  const encrypted = typeof payload === 'string'
    ? payload
    : payload?.Data

  if (!encrypted || String(encrypted).length <= 16) {
    throw new Error('ICICI Bank API response is missing the encrypted Data payload')
  }

  const iv = encrypted.slice(-16)
  const body = encrypted.slice(0, -16)
  const decipher = crypto.createDecipheriv(
    'aes-128-cbc',
    Buffer.from(ENCRYPTION_KEY, 'utf8'),
    Buffer.from(iv, 'utf8'),
  )

  return JSON.parse(Buffer.concat([
    decipher.update(body, 'base64'),
    decipher.final(),
  ]).toString('utf8'))
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  if (/^(across|all)\s+india$/i.test(normalized)) return null

  const [firstPart] = normalized.split(',').map((part) => part.trim()).filter(Boolean)
  if (!firstPart || /^india$/i.test(firstPart)) return null
  return firstPart
}

const toDateString = (value) => normalizeWhitespace(value)

const extractSearchRecords = (payload) => {
  const decrypted = decryptApiPayload(payload)
  return {
    totalRows: Number.parseInt(String(decrypted?.TotalRows ?? decrypted?.Count ?? 0), 10) || 0,
    records: Array.isArray(decrypted?.Data) ? decrypted.Data : [],
  }
}

export const extractSearchResults = (payload) => extractSearchRecords(payload).records
  .map((record) => {
    const jobId = normalizeWhitespace(record?.f_jobId || record?.JobID || record?.id)
    const title = normalizeWhitespace(record?.f_title || record?.JobTitle)

    if (!jobId || !title) return null

    return {
      title,
      location: normalizeWhitespace(record?.hc_Location || record?.Location),
      city: extractCity(record?.hc_Location || record?.Location),
      department: normalizeWhitespace(record?.hc_Function || record?.Function),
      jobCategory: normalizeWhitespace(record?.hc_MainGroup || record?.MainGroup),
      jobId,
      requisitionId: normalizeWhitespace(record?.JobNumber) || jobId,
      sourceUrl: buildPublicJobUrl(jobId),
      applyUrl: buildPublicJobUrl(jobId),
      experienceRequired: normalizeWhitespace(record?.hc_Experience || record?.Experience),
      minimumQualification: normalizeWhitespace(record?.Education),
      closingDate: toDateString(record?.hc_EndDate || record?.EndDate),
      shortDescription: normalizeWhitespace(record?.f_short_description),
      shortUrl: normalizeWhitespace(record?.ShortUrl),
    }
  })
  .filter(Boolean)

export const extractJobDetail = (payload, listing = {}) => {
  const detail = decryptApiPayload(payload)
  const jobId = normalizeWhitespace(detail?.JobID || detail?.f_jobId) || listing.jobId
  const sourceUrl = listing.sourceUrl || buildPublicJobUrl(jobId)

  return {
    ...listing,
    title: normalizeWhitespace(detail?.JobTitle) || listing.title,
    location: normalizeWhitespace(detail?.Location) || listing.location || null,
    city: extractCity(detail?.Location) ?? listing.city ?? null,
    department: normalizeWhitespace(detail?.Function) || listing.department || null,
    jobCategory: normalizeWhitespace(detail?.MainGroup) || listing.jobCategory || null,
    jobId,
    requisitionId: normalizeWhitespace(detail?.JobNumber) || listing.requisitionId || jobId,
    sourceUrl,
    applyUrl: sourceUrl,
    experienceRequired: listing.experienceRequired || normalizeWhitespace(detail?.Experience),
    minimumQualification: normalizeWhitespace(detail?.Education) || listing.minimumQualification || null,
    closingDate: toDateString(detail?.EndDate) || listing.closingDate || null,
    shortDescription: normalizeWhitespace(detail?.f_short_description) || listing.shortDescription || null,
    shortUrl: normalizeWhitespace(detail?.ShortUrl) || listing.shortUrl || null,
    requiredSkills: extractRequiredSkills(detail?.JD),
    jobDescription: stripHtml(detail?.JD) || listing.shortDescription || null,
  }
}

const defaultFetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  const contentType = response.headers?.get?.('content-type') || ''
  if (/text\/html/i.test(contentType)) {
    const html = await response.text().catch(() => '')
    const text = stripHtml(html)
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim()

    if (/this page can'?t be displayed|contact support|incident id/i.test(text || '')) {
      throw new Error(`ICICI Bank careers endpoint returned blocked HTML error page for ${url}`)
    }

    throw new Error(`ICICI Bank careers endpoint returned HTML${title ? ` (${title})` : ''} for ${url}`)
  }

  return response.json()
}

const createSearchHeaders = () => ({
  Accept: 'Application/json',
  'Content-Type': 'application/json',
  authorization: 'Bearer token',
  Origin: 'https://www.icicicareers.com',
  Referer: JOB_LISTING_URL,
  'User-Agent': USER_AGENT,
})

const createDetailHeaders = () => ({
  Accept: 'Application/json',
  authorization: 'Bearer token',
  Referer: JOB_LISTING_URL,
  'User-Agent': USER_AGENT,
})

export const createIciciBankScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  maxPages = null,
} = {}) => ({
  async run(options = {}) {
    const fetchJson = options.fetchJson || defaultFetchJson
    const now = options.now || (() => new Date().toISOString())
    const effectiveMaxJobs = Number.isInteger(options.maxJobs) ? options.maxJobs : maxJobs
    const effectiveMaxPages = Number.isInteger(options.maxPages) ? options.maxPages : maxPages
    const jobs = []
    const maxPageCount = effectiveMaxPages && effectiveMaxPages > 0 ? effectiveMaxPages : Number.POSITIVE_INFINITY

    for (let pageNo = 0; pageNo < maxPageCount; pageNo += 1) {
      const searchResponse = await fetchJson(SEARCH_API_URL, {
        method: 'POST',
        headers: createSearchHeaders(),
        body: encryptApiPayload(buildSearchRequestPayload(pageNo)),
      })
      const { totalRows, records } = extractSearchRecords(searchResponse)
      const listings = extractSearchResults(searchResponse)

      if (listings.length === 0) break

      for (const listing of listings) {
        const detailResponse = await fetchJson(buildDetailApiUrl(listing.jobId), {
          method: 'GET',
          headers: createDetailHeaders(),
        })
        const job = extractJobDetail(detailResponse, listing)

        jobs.push({
          ...job,
          company: COMPANY,
          country: 'India',
          source: SOURCE,
          link: job.applyUrl || job.sourceUrl,
          scrapedAt: now(),
        })

        if (effectiveMaxJobs && jobs.length >= effectiveMaxJobs) {
          return jobs.slice(0, effectiveMaxJobs)
        }
      }

      if ((pageNo + 1) * SEARCH_PAGE_SIZE >= totalRows) break
    }

    return jobs
  },
})

export const run = async (options = {}) => createIciciBankScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  console.log(`Total ICICI Bank jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    const result = await saveToDB(jobs, SOURCE)
    console.log('DB result:', result)
    process.exit(0)
  }
}
