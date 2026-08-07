import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  fetchJsonWithRetry,
  fetchTextWithRetry,
} from '../../scraper-support/utils/fetch.js'
import { inferExperienceFromPublicPageHtml } from '../../scraper-support/utils/publicExperienceEnrichment.js'

import { AURIGO_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = AURIGO_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const SEARCH_PAGE_URL = PROVIDER_METADATA.searchResultsUrl
export const SEARCH_RESULTS_URL = SEARCH_PAGE_URL
export const JOBS_API_URL = 'https://careers.aurigo.com/services/recruiting/v1/jobs'
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const DEFAULT_LOCALE = 'en_US'
export const DEFAULT_PAGE_SIZE = 10
export const AURIGO_ERROR_PAGE_URL = 'https://careers.aurigo.com/errorpage/?errortype=Exception'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

const parseSlashDate = (value) => {
  const normalized = normalizeWhitespace(value)
  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!match) return null

  const month = String(Number.parseInt(match[1], 10)).padStart(2, '0')
  const day = String(Number.parseInt(match[2], 10)).padStart(2, '0')
  const rawYear = Number.parseInt(match[3], 10)
  const year = rawYear < 100 ? 2000 + rawYear : rawYear
  return `${year}-${month}-${day}`
}

const normalizeArrayValues = (value) => (
  Array.isArray(value)
    ? value.map((entry) => normalizeWhitespace(entry)).filter(Boolean)
    : []
)

const buildJobUrl = (urlTitle, id) => {
  const normalizedTitle = normalizeWhitespace(urlTitle)
  const normalizedId = normalizeWhitespace(id)
  if (!normalizedTitle || !normalizedId) return null
  return `https://careers.aurigo.com/job/${normalizedTitle}/${normalizedId}/`
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Aurigo Software Technologies Jobs\s*<\/title>/i.test(page)
    && /var\s+CSRFToken\s*=\s*"[^"]*"/i.test(page)
    && page.includes('/platform/js/j2w/min/j2w.searchManager.min.js')
    && page.includes('searchResultView=LIST')
    && normalized.includes('Job listings')
    && normalized.includes('Search jobs')
}

export const extractCsrfToken = (html = '') => (
  String(html ?? '').match(/var\s+CSRFToken\s*=\s*"([^"]+)"/i)?.[1] || null
)

export const extractSearchLocale = (html = '') => (
  String(html ?? '').match(/locale:\s*"([^"]+)"/i)?.[1]
  || String(html ?? '').match(/currentLocale:\s*'([^']+)'/i)?.[1]
  || DEFAULT_LOCALE
)

export const buildJobsApiRequestPayload = ({
  keywords = '',
  locale = DEFAULT_LOCALE,
  location = '',
  pageNumber = 0,
  sortBy = 'recent',
} = {}) => ({
  keywords,
  locale,
  location,
  pageNumber,
  sortBy,
})

export const hasExpectedJobsApiSignal = (payload = {}) => (
  Number.isFinite(Number(payload?.totalJobs))
  && Array.isArray(payload?.jobSearchResult)
)

export const extractJobsFromApiPayload = (payload = {}) => (
  Array.isArray(payload?.jobSearchResult) ? payload.jobSearchResult : []
)
  .map((entry) => entry?.response || null)
  .map((job) => {
    if (!job) return null

    const locations = normalizeArrayValues(job.filter1)
    if (!locations.some((location) => /india/i.test(location))) return null

    const title = normalizeWhitespace(job.unifiedStandardTitle || job.title)
    const jobId = normalizeWhitespace(job.id)
    const sourceUrl = buildJobUrl(job.unifiedUrlTitle || job.urlTitle, jobId)

    if (!title || !jobId || !sourceUrl) return null

    const department = normalizeArrayValues(job.division_obj)[0] || null
    const location = locations[0] || 'India'

    return {
      title,
      company: COMPANY,
      department,
      location,
      city: null,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: parseSlashDate(job.unifiedStandardStart),
      closingDate: parseSlashDate(job.unifiedStandardEnd),
      jobDescription: null,
      remoteStatus: 'On-site',
    }
  })
  .filter(Boolean)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchJson = (url, options = {}) => fetchJsonWithRetry(url, {
  ...options,
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return {
    finalUrl: response.url,
    html: await response.text(),
  }
}

export const pageRedirectsToAurigoError = (value = '') => {
  const normalized = normalizeWhitespace(value)
  return normalized === AURIGO_ERROR_PAGE_URL
}

export const createAurigoScraper = ({ maxPages = 10, maxJobs = null } = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    fetchPage = defaultFetchPage,
    now = () => new Date().toISOString(),
  } = {}) {
    const searchShell = await fetchText(SEARCH_PAGE_URL)
    if (!hasOfficialCareersSignal(searchShell)) {
      throw new Error('The verified Aurigo search shell no longer matches the trusted first-party jobs surface')
    }

    const csrfToken = extractCsrfToken(searchShell)
    if (!csrfToken) {
      throw new Error('The verified Aurigo search shell no longer exposes the first-party jobs API token')
    }

    const locale = extractSearchLocale(searchShell)
    const jobs = []
    const seenJobIds = new Set()
    let accumulatedRawResults = 0

    for (let pageNumber = 0; pageNumber < maxPages; pageNumber += 1) {
      const payload = buildJobsApiRequestPayload({ locale, pageNumber })
      const response = await fetchJson(JOBS_API_URL, {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          Referer: SEARCH_PAGE_URL,
          Origin: 'https://careers.aurigo.com',
          Accept: 'application/json,text/plain,*/*',
        },
        body: JSON.stringify(payload),
      })

      if (!hasExpectedJobsApiSignal(response)) {
        throw new Error('The verified Aurigo jobs API no longer matches the trusted first-party jobs surface')
      }

      const rawResults = Array.isArray(response.jobSearchResult) ? response.jobSearchResult : []
      const pageJobs = extractJobsFromApiPayload(response)
      accumulatedRawResults += rawResults.length

      for (const job of pageJobs) {
        if (seenJobIds.has(job.jobId)) continue
        seenJobIds.add(job.jobId)
        jobs.push(job)
      }

      if (rawResults.length === 0) break

      const totalJobs = Number.parseInt(response.totalJobs, 10)
      if (Number.isFinite(totalJobs) && accumulatedRawResults >= totalJobs) break
    }

    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    const verifiedJobs = await Promise.all(selectedJobs.map(async (job) => {
      const publicJob = {
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
      }

      try {
        const publicPage = await fetchPage(job.sourceUrl)
        if (pageRedirectsToAurigoError(publicPage.finalUrl)) {
          return {
            ...publicJob,
            publicExperienceChecked: true,
          }
        }

        return inferExperienceFromPublicPageHtml(publicJob, publicPage.html)
      } catch {
        return publicJob
      }
    }))

    return verifiedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createAurigoScraper().run(options)

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
