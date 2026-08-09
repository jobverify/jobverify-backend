import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getValidIndiaCityForJob } from '../../src/utils/publicJobLocationScope.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { enrichJobsWithPublicExperience } from '../../scraper-support/utils/publicExperienceEnrichment.js'
import REDINGTON_INDIA_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const DEFAULT_EXPERIENCE_ENRICHMENT_CONCURRENCY = 4

export const SOURCE = REDINGTON_INDIA_CATALOG.source
export const COMPANY = REDINGTON_INDIA_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = REDINGTON_INDIA_CATALOG.officialBrandName
export const VERIFIED_ON = REDINGTON_INDIA_CATALOG.verifiedOn
export const PROVIDER_METADATA = REDINGTON_INDIA_CATALOG
export const CAREERS_PAGE_URL = REDINGTON_INDIA_CATALOG.companyCareerPage
export const JOBS_API_URL = REDINGTON_INDIA_CATALOG.jobsApiUrl

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTrailingLocationCode = (value) =>
  normalizeWhitespace(String(value ?? '').replace(/\s*\(\d+\)\s*$/g, ''))

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (/intern/.test(normalized)) return 'Internship'
  if (/contract/.test(normalized)) return 'Contract'
  if (/part.?time/.test(normalized)) return 'Part-time'
  if (/full.?time/.test(normalized)) return 'Full-time'
  return normalizeWhitespace(value)
}

const parseDateOnly = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const match = normalized.match(/^(?:\d{2}:\d{2}:\d{2}\s+)?(\d{2})-(\d{2})-(\d{4})$/)
    || normalized.match(/^(\d{2})-(\d{2})-(\d{4})\s+\d{2}:\d{2}:\d{2}$/)

  if (!match) return null

  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

const isIndiaRecord = (record = {}) => {
  const locationCountry = normalizeWhitespace(record?.location_country)
  const location = normalizeWhitespace(record?.location)

  return /india/i.test(locationCountry || '')
    || /india/i.test(location || '')
}

const deriveCity = (record = {}) => {
  const location = stripTrailingLocationCode(record?.location)
  const locationCity = normalizeWhitespace(record?.location_city)

  return getValidIndiaCityForJob({
    city: locationCity,
    location,
    country: normalizeWhitespace(record?.location_country) || 'India',
  })
}

const normalizeLocation = (record = {}) =>
  stripTrailingLocationCode(record?.location)
  || normalizeWhitespace(record?.location_country)
  || 'India'

export const buildDarwinboxJobDetailUrl = (jobId) => {
  const normalizedId = normalizeWhitespace(jobId)
  if (!normalizedId) return null

  return `https://hrpulserlgroup.darwinbox.in/ms/candidatev2/main/careers/jobDetails/${normalizedId}?from=all`
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')

  return /<title>\s*Careers - Redington\s*<\/title>/i.test(page)
    && /Opportunities Across the Globe/i.test(page)
    && /Search Jobs/i.test(page)
    && /Join our\s*<br>\s*Community/i.test(page)
    && /Upload Resume/i.test(page)
    && /action:\s*["']get_jobs["']/i.test(page)
    && /action:\s*["']get_countries["']/i.test(page)
    && /action:\s*["']get_skills["']/i.test(page)
    && /job_nonce\s*=\s*["'][a-z0-9]+["']/i.test(page)
    && /href=["']\$\{job\.job_url\}["']/i.test(page)
    && /Full Job Description/i.test(page)
}

export const extractJobNonce = (html = '') =>
  String(html ?? '').match(/job_nonce\s*=\s*["']([a-z0-9]+)["']/i)?.[1] || null

const parseJobsPayload = (payload) => {
  const parsed = typeof payload === 'string'
    ? JSON.parse(payload)
    : payload

  if (!Array.isArray(parsed)) {
    throw new Error('Verified Redington jobs payload changed materially')
  }

  return parsed
}

export const buildJobsRequestBody = ({ offset = 0, nonce }) => ({
  action: 'get_jobs',
  offset: String(offset),
  search: '',
  job_type: '',
  country: '',
  city: '',
  role: '',
  skill: '',
  nonce,
})

export const extractIndiaJobsFromAjaxPayload = (
  payload,
  { scrapedAt = new Date().toISOString() } = {},
) => parseJobsPayload(payload)
  .filter((record) => record && typeof record === 'object')
  .filter((record) => isIndiaRecord(record))
  .map((record) => {
    const title = normalizeWhitespace(record?.title)
    const jobId = normalizeWhitespace(record?.job_id)
    const detailUrl = buildDarwinboxJobDetailUrl(jobId)
    const groupCompany = normalizeWhitespace(record?.group_company)
    const location = normalizeLocation(record)

    if (groupCompany && !/redington/i.test(groupCompany)) {
      throw new Error('Verified Redington jobs payload changed materially')
    }

    if (!title || !jobId || !detailUrl || !location) {
      throw new Error('Verified Redington jobs payload changed materially')
    }

    return {
      title,
      company: COMPANY,
      department: normalizeWhitespace(record?.department || record?.parent_department),
      location,
      city: deriveCity(record),
      country: normalizeWhitespace(record?.location_country) || 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: detailUrl,
      applyUrl: detailUrl,
      employmentType: normalizeEmploymentType(record?.employee_type),
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: parseDateOnly(record?.job_created_timestamp),
      closingDate: null,
      jobDescription: null,
      groupCompany,
      remoteStatus: /remote/i.test(location) ? 'Remote' : 'On-site',
      source: SOURCE,
      link: detailUrl,
      scrapedAt,
    }
  })

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

const defaultPostForm = (url, body) => fetchTextWithRetry(url, {
  method: 'POST',
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    Referer: CAREERS_PAGE_URL,
  },
  body: new URLSearchParams(body),
  label: SOURCE,
  timeoutMs: 20000,
})

export const createRedingtonIndiaScraper = ({
  now: defaultNow = () => new Date().toISOString(),
  maxPages = 25,
  experienceEnrichmentConcurrency = DEFAULT_EXPERIENCE_ENRICHMENT_CONCURRENCY,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    postForm = defaultPostForm,
    fetchPublicJobText = null,
    now = defaultNow,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_PAGE_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Verified Redington careers page changed materially')
    }

    const nonce = extractJobNonce(careersHtml)
    if (!nonce) {
      throw new Error('Verified Redington careers page changed materially')
    }

    const scrapedAt = now()
    const collectedJobs = []
    const seenJobIds = new Set()
    let offset = 0

    for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
      const payload = await postForm(JOBS_API_URL, buildJobsRequestBody({ offset, nonce }))
      const records = parseJobsPayload(payload)
      if (records.length === 0) break

      const jobs = extractIndiaJobsFromAjaxPayload(records, { scrapedAt })

      for (const job of jobs) {
        if (seenJobIds.has(job.jobId)) continue
        seenJobIds.add(job.jobId)
        collectedJobs.push(job)
      }

      offset += records.length
    }

    const shouldEnrichPublicDetails =
      typeof fetchPublicJobText === 'function' || fetchText === defaultFetchText
    const jobsWithPublicDetails = shouldEnrichPublicDetails
      ? await enrichJobsWithPublicExperience(collectedJobs, {
          ...(typeof fetchPublicJobText === 'function'
            ? { fetchText: fetchPublicJobText }
            : {}),
          concurrency: Math.min(
            experienceEnrichmentConcurrency,
            Math.max(1, collectedJobs.length),
          ),
        })
      : collectedJobs

    return jobsWithPublicDetails.map((job) => ({
      ...job,
      publicExperienceChecked: job.publicExperienceChecked === true,
    }))
  },
})

export const run = async (options = {}) => createRedingtonIndiaScraper(options).run(options)

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
