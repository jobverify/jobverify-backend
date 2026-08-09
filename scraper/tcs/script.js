import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://ibegin.tcsapps.com/candidate/'
export const SEARCH_API_URL = new URL('api/v1/jobs/searchJ', CAREER_PAGE_URL).toString()
export const DETAIL_API_URL = new URL('api/v1/job/desc', CAREER_PAGE_URL).toString()
export const WALKIN_DETAIL_API_URL = new URL('api/v1/job/desc/walkin', CAREER_PAGE_URL).toString()
export const DEFAULT_PAGE_SIZE = 10

const MONTH_INDEX = {
  JAN: '01',
  FEB: '02',
  MAR: '03',
  APR: '04',
  MAY: '05',
  JUN: '06',
  JUL: '07',
  AUG: '08',
  SEP: '09',
  OCT: '10',
  NOV: '11',
  DEC: '12',
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&ndash;|&#8211;/gi, '-')
  .replace(/&mdash;|&#8212;/gi, '-')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const LOWERCASE_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'for', 'in', 'of', 'on', 'or', 'the', 'to'])

const titleCase = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  return normalized
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (index > 0 && LOWERCASE_WORDS.has(word)) {
        return word
      }

      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<div\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return /india/i.test(normalized) ? normalized : `${normalized}, India`
}

const extractCity = (location) => normalizeWhitespace(location)?.split(',')[0] || null

const normalizeDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
    return normalized.slice(0, 10)
  }

  const monthMatch = normalized.match(/^(\d{2})-([A-Z]{3})-(\d{4})/i)
  if (monthMatch) {
    const [, day, month, year] = monthMatch
    const monthNumber = MONTH_INDEX[month.toUpperCase()]
    return monthNumber ? `${year}-${monthNumber}-${day}` : null
  }

  return null
}

const normalizeExperience = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return /year/i.test(normalized) ? normalized : `${normalized} Years`
}

const splitSkills = (value) => String(value ?? '')
  .split(',')
  .map((item) => normalizeWhitespace(item))
  .filter(Boolean)

const isWalkinJobId = (jobId) => /w$/i.test(String(jobId ?? ''))

const extractRequisitionId = (jobId) => normalizeWhitespace(jobId)?.replace(/[jw]$/i, '') || null

const normalizeEmploymentType = (jobId) => {
  if (isWalkinJobId(jobId)) return 'Walk-in'
  if (/j$/i.test(String(jobId ?? ''))) return 'Full-time'
  return null
}

export const buildPublicJobUrl = (jobId) => new URL(`jobs/${jobId}`, CAREER_PAGE_URL).toString()

export const buildSearchPayload = ({
  page = 1,
  regular = true,
  walkin = true,
} = {}) => ({
  jobTitle: null,
  jobCity: null,
  jobFunction: null,
  jobExperience: null,
  jobSkill: null,
  pageNumber: String(Math.max(1, Number(page) || 1)),
  userText: '',
  jobTitleOrder: null,
  jobCityOrder: null,
  jobFunctionOrder: null,
  jobExperienceOrder: null,
  applyByOrder: null,
  regular,
  walkin,
})

export const buildDetailApiUrl = (jobId) => (isWalkinJobId(jobId) ? WALKIN_DETAIL_API_URL : DETAIL_API_URL)

export const buildDetailRequestBody = (jobId) => ({
  jobId: extractRequisitionId(jobId),
})

export const extractPaginationSummary = (payload, {
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
} = {}) => {
  const totalRecords = Number(payload?.data?.totalJobs) || 0
  const currentPage = Math.max(1, Number(page) || 1)
  const safePageSize = Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE)
  const totalPages = Math.ceil(totalRecords / safePageSize)

  return {
    page: currentPage,
    pageSize: safePageSize,
    totalRecords,
    totalPages,
    hasNext: currentPage < totalPages,
  }
}

export const extractSearchResults = (payload) => (Array.isArray(payload?.data?.jobs) ? payload.data.jobs : [])
  .map((record) => {
    const jobId = normalizeWhitespace(record.id)
    const requisitionId = extractRequisitionId(jobId)
    const location = normalizeLocation(record.location)
    const sourceUrl = jobId ? buildPublicJobUrl(jobId) : null

    if (!jobId || !requisitionId || !location || !sourceUrl) return null

    return {
      title: normalizeWhitespace(record.jobTitle),
      company: 'TCS',
      department: titleCase(record.functionName),
      location,
      city: extractCity(location),
      jobId,
      requisitionId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: normalizeEmploymentType(jobId),
      experienceRequired: normalizeExperience(record.experience),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: splitSkills(record.skills),
      postingDate: null,
      closingDate: normalizeDate(record.applyByDate),
      jobDescription: null,
    }
  })
  .filter(Boolean)

export const extractJobDetail = (payload, baseJob = {}) => {
  const detail = payload?.data || payload || {}
  const requiredSkills = splitSkills(detail.skilldetail)

  return {
    ...baseJob,
    title: normalizeWhitespace(detail.title) || baseJob.title || null,
    company: baseJob.company || 'TCS',
    department: titleCase(detail.functionName) || baseJob.department || null,
    location: normalizeLocation(detail.location) || baseJob.location || null,
    city: extractCity(detail.location) || baseJob.city || null,
    jobId: baseJob.jobId || normalizeWhitespace(detail.jobId),
    requisitionId: baseJob.requisitionId || extractRequisitionId(baseJob.jobId || detail.jobId),
    sourceUrl: baseJob.sourceUrl || (baseJob.jobId ? buildPublicJobUrl(baseJob.jobId) : null),
    applyUrl: baseJob.applyUrl || (baseJob.jobId ? buildPublicJobUrl(baseJob.jobId) : null),
    employmentType: baseJob.employmentType || normalizeEmploymentType(baseJob.jobId || detail.jobId),
    experienceRequired: normalizeExperience(detail.experience) || baseJob.experienceRequired || null,
    minimumQualification: titleCase(detail.qualifications) || baseJob.minimumQualification || null,
    preferredQualification: baseJob.preferredQualification || null,
    requiredSkills: requiredSkills.length > 0 ? requiredSkills : baseJob.requiredSkills || [],
    postingDate: baseJob.postingDate || null,
    closingDate: normalizeDate(detail.applyby) || baseJob.closingDate || null,
    jobDescription: stripTags(detail.description) || baseJob.jobDescription || null,
  }
}

const defaultFetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      Accept: 'application/json,text/plain,*/*',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body == null ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const createTcsScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY,
} = {}) => ({
  async run(options = {}) {
    const fetchJson = options.fetchJson || defaultFetchJson
    const jobs = []
    const seenJobIds = new Set()

    for (let page = 1; page <= maxPages; page += 1) {
      const payload = await fetchJson(SEARCH_API_URL, {
        method: 'POST',
        body: buildSearchPayload({ page }),
      })
      const listings = extractSearchResults(payload)
      const summary = extractPaginationSummary(payload, { page })

      for (const job of listings) {
        if (seenJobIds.has(job.jobId)) continue
        seenJobIds.add(job.jobId)

        const detailPayload = await fetchJson(buildDetailApiUrl(job.jobId), {
          method: 'POST',
          body: buildDetailRequestBody(job.jobId),
        })
        const detailedJob = extractJobDetail(detailPayload, job)

        jobs.push({
          ...detailedJob,
          source: 'tcs',
          link: detailedJob.applyUrl || detailedJob.sourceUrl,
          scrapedAt: new Date().toISOString(),
        })

        if (maxJobs && jobs.length >= maxJobs) {
          return jobs
        }
      }

      if (!summary.hasNext) {
        break
      }
    }

    return jobs
  },
})

export const run = async () => createTcsScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running TCS scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'tcs')
    console.log('DB result:', result)
    process.exit(0)
  }
}
