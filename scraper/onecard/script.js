import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

import { ONECARD_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = ONECARD_CATALOG
export const SOURCE = ONECARD_CATALOG.source
export const COMPANY = ONECARD_CATALOG.companyName
export const OFFICIAL_CAREERS_URL = ONECARD_CATALOG.companyCareerPage
export const OFFICIAL_CAREERS_HANDOFF_URL = ONECARD_CATALOG.officialCareersHandoffUrl
export const OFFICIAL_JOBS_API_URL = ONECARD_CATALOG.officialJobsApiUrl
export const OFFICIAL_JOBS_API_KEY = ONECARD_CATALOG.officialJobsApiKey
export const OFFICIAL_APPLY_URL = ONECARD_CATALOG.officialApplyUrl
export const VERIFIED_AT = ONECARD_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = ONECARD_CATALOG.verifiedSurfaceSummary

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;|&#x27;|&rsquo;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const extractTitle = (html) =>
  normalizeWhitespace(String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null)

export const extractOfficialHandoffUrl = (html) =>
  normalizeWhitespace(
    String(html ?? '').match(/href=["'](https:\/\/www\.fplabs\.tech\/careers\/)["']/i)?.[1] ?? null,
  )

export const extractOfficialApplyUrl = (html) =>
  normalizeWhitespace(
    String(html ?? '').match(/href=["'](mailto:careers@getonecard\.app)["']/i)?.[1] ?? null,
  )

export const extractOfficialJobsApiConfig = (html) => {
  const match = String(html ?? '').match(
    /fetch\(\s*"([^"]+\/hr\/jobs)"[\s\S]*?"x-api-key":\s*"([^"]+)"/i,
  )

  const jobsApiUrl = normalizeWhitespace(match?.[1] ?? null)
  const jobsApiKey = normalizeWhitespace(match?.[2] ?? null)

  if (!jobsApiUrl || !jobsApiKey) {
    return null
  }

  return { jobsApiUrl, jobsApiKey }
}

export const hasOfficialOneCardCareersSignals = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = (normalizeWhitespace(rawHtml) || '').toLowerCase()
  const apiConfig = extractOfficialJobsApiConfig(rawHtml)

  return extractTitle(rawHtml) === 'Careers at FPL'
    && normalized.includes('join team onecard')
    && normalized.includes('fintech revolution in india')
    && normalized.includes('work with us')
    && extractOfficialHandoffUrl(rawHtml) === OFFICIAL_CAREERS_HANDOFF_URL
    && extractOfficialApplyUrl(rawHtml) === OFFICIAL_APPLY_URL
    && apiConfig?.jobsApiUrl === OFFICIAL_JOBS_API_URL
    && apiConfig?.jobsApiKey === OFFICIAL_JOBS_API_KEY
}

const normalizePostingDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

const extractCity = (value) => normalizeWhitespace(String(value ?? '').split(',')[0] ?? null)

export const extractJobsFromPayload = (payload) => {
  const rows = payload?.data?.data
  if (!Array.isArray(rows)) {
    throw new Error('OneCard public jobs API no longer exposes the expected data array')
  }

  return rows
    .map((row) => {
      const title = normalizeWhitespace(row?.attributes?.title)
      const jobId = normalizeWhitespace(row?.id)
      if (!title || !jobId) return null

      const location = normalizeWhitespace(row?.attributes?.location) || 'Pune'

      return {
        title,
        company: COMPANY,
        department: null,
        location,
        city: extractCity(location),
        country: 'India',
        jobId,
        requisitionId: jobId,
        sourceUrl: OFFICIAL_CAREERS_URL,
        applyUrl: OFFICIAL_APPLY_URL,
        employmentType: null,
        experienceRequired: normalizeWhitespace(row?.attributes?.experience),
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: normalizePostingDate(row?.attributes?.publishedAt),
        closingDate: null,
        jobDescription: normalizeWhitespace(row?.attributes?.description),
      }
    })
    .filter(Boolean)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'onecard-html',
  timeoutMs: 15000,
})

const defaultFetchJson = (url, options = {}) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
    ...(options.headers ?? {}),
  },
  label: 'onecard-json',
  timeoutMs: 15000,
})

export const createOneCardScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
  } = {}) {
    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)

    if (!hasOfficialOneCardCareersSignals(careersHtml)) {
      throw new Error('OneCard verified official careers page no longer matches the trusted public surface')
    }

    const apiConfig = extractOfficialJobsApiConfig(careersHtml)
    if (!apiConfig) {
      throw new Error('OneCard verified official careers page no longer exposes the public jobs api config')
    }

    const payload = await fetchJson(apiConfig.jobsApiUrl, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiConfig.jobsApiKey,
      },
    })

    const jobs = extractJobsFromPayload(payload)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs
    const scrapedAt = now()

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.sourceUrl,
      scrapedAt,
    }))
  },
})

export const run = async (options = {}) => createOneCardScraper().run(options)

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
