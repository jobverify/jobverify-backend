import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createBrowserFetchSession } from '../../scraper-support/shared/browserFetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { INSTASAFE_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = INSTASAFE_CATALOG.source
export const COMPANY = INSTASAFE_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = INSTASAFE_CATALOG.officialBrandName
export const VERIFIED_ON = INSTASAFE_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = INSTASAFE_CATALOG.verifiedSurfaceSummary
export const PROVIDER_METADATA = INSTASAFE_CATALOG
export const HOMEPAGE_URL = INSTASAFE_CATALOG.homepageUrl
export const CAREERS_PAGE_URL = INSTASAFE_CATALOG.careersPageUrl
export const CAREERS_PORTAL_URL = INSTASAFE_CATALOG.careersPortalUrl
export const CAREERS_API_URL = INSTASAFE_CATALOG.careersApiUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const shouldUseBrowserFallback = (error) =>
  /HTTP (?:403|429)\b|fetch failed|timed out|timeout|could not connect|und_err_connect_timeout|ssl\/tls secure channel|econnreset|unable to/i
    .test(String(error?.message ?? error ?? ''))

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (/intern/.test(normalized)) return 'Internship'
  if (/contract|consultant/.test(normalized)) return 'Contract'
  if (/part.?time/.test(normalized)) return 'Part-time'
  if (/full.?time/.test(normalized)) return 'Full-time'
  return normalizeWhitespace(value)
}

const hasInputWithId = (html, id) =>
  new RegExp(`<input\\b(?=[^>]*\\bid=["']${id}["'])[^>]*>`, 'i').test(String(html ?? ''))

const isIndiaJob = (record = {}) => /india/i.test(normalizeWhitespace(record.Country) || '')

const getLocation = (record = {}) => [record.City, record.State, record.Country]
  .map(normalizeWhitespace)
  .filter(Boolean)
  .join(', ') || null

export const hasOfficialCareersPageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return normalized?.includes('Instasafe Careers | Instasafe Jobs')
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/instasafe\.com\/careers\/["']/i.test(page)
    && /Grow with InstaSafe/i.test(page)
    && /Our Openings/i.test(page)
    && /rec_job_listing_div/i.test(page)
}

export const hasOfficialPortalSignal = (html) => {
  const page = String(html ?? '')

  return /<title\b[^>]*>\s*Jobs at Instasafe Technologies Pvt Ltd\s*<\/title>/i.test(page)
    && /meta property=["']og:url["'] content=["']https:\/\/instasafe\.zohorecruit\.com\/jobs\/Careers["']/i.test(page)
    && hasInputWithId(page, 'pageJson')
    && hasInputWithId(page, 'moduleMeta')
    && hasInputWithId(page, 'jobs')
}

export const extractIndiaJobs = (payload) => (Array.isArray(payload?.data) ? payload.data : [])
  .filter((record) => isIndiaJob(record))
  .map((record) => {
    const title = normalizeWhitespace(record.Posting_Title || record.Job_Opening_Name)
    const city = normalizeWhitespace(record.City)
    const state = normalizeWhitespace(record.State)
    const country = normalizeWhitespace(record.Country)
    const jobId = normalizeWhitespace(record.id)
    const sourceUrl = normalizeWhitespace(record.$url)
    const location = getLocation(record)

    if (!title || !country || !jobId || !sourceUrl || !location) return null

    return {
      title,
      company: COMPANY,
      department: null,
      location,
      city,
      state,
      country,
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: normalizeEmploymentType(record.Job_Type),
      experienceRequired: normalizeWhitespace(record.Work_Experience),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: normalizeWhitespace(record.Date_Opened),
      closingDate: null,
      jobDescription: normalizeWhitespace(record.Job_Description),
      remoteStatus: record.Remote_Job ? 'Remote' : 'On-site',
    }
  })
  .filter(Boolean)

const defaultFetchText = (url) =>
  fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    attempts: 1,
    label: SOURCE,
    timeoutMs: 15000,
  })

const defaultFetchJson = (url) =>
  fetchJsonWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain,*/*',
    },
    attempts: 1,
    label: SOURCE,
    timeoutMs: 15000,
  })

export const createInstaSafeScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    fetchBrowserText,
    fetchBrowserJson,
  } = {}) {
    let browserSession = null

    const getBrowserSession = async () => {
      if (!browserSession) {
        browserSession = await createBrowserFetchSession({
          userAgent: USER_AGENT,
          settleTimeMs: 4000,
        })
      }

      return browserSession
    }

    const browserTextFetcher = fetchBrowserText || (async (url) => {
      const session = await getBrowserSession()
      const page = await session.fetchPage(url)

      if (![200, 304].includes(page.status)) {
        throw new Error(`HTTP ${page.status} for ${url}`)
      }

      return page.html
    })

    const browserJsonFetcher = fetchBrowserJson || (async (url, landingUrl = CAREERS_PORTAL_URL) => {
      const session = await getBrowserSession()
      return session.fetchJson(url, {
        landingUrl,
        headers: {
          Accept: 'application/json,text/plain,*/*',
        },
      })
    })

    const fetchTextWithBrowserFallback = async (url) => {
      try {
        return await fetchText(url)
      } catch (error) {
        if (!shouldUseBrowserFallback(error)) {
          throw error
        }

        return browserTextFetcher(url)
      }
    }

    const fetchJsonWithBrowserFallback = async (url, landingUrl = CAREERS_PORTAL_URL) => {
      try {
        return await fetchJson(url)
      } catch (error) {
        if (!shouldUseBrowserFallback(error)) {
          throw error
        }

        return browserJsonFetcher(url, landingUrl)
      }
    }

    const shouldPreferBrowserJson = fetchJson === defaultFetchJson

    try {
      const careersPageHtml = await fetchTextWithBrowserFallback(CAREERS_PAGE_URL)
      if (!hasOfficialCareersPageSignal(careersPageHtml)) {
        throw new Error('Response is not the verified official InstaSafe careers page')
      }

      const portalHtml = await fetchTextWithBrowserFallback(CAREERS_PORTAL_URL)
      if (!hasOfficialPortalSignal(portalHtml)) {
        throw new Error('Response is not the verified official InstaSafe careers portal')
      }

      const payload = shouldPreferBrowserJson
        ? await browserJsonFetcher(CAREERS_API_URL, CAREERS_PORTAL_URL)
        : await fetchJsonWithBrowserFallback(CAREERS_API_URL)
      if (payload?.code !== 'success' || !Array.isArray(payload?.data)) {
        throw new Error('InstaSafe public jobs API no longer returns the verified success payload')
      }

      const jobs = extractIndiaJobs(payload)
      const selectedJobs = Number.isInteger(maxJobs) ? jobs.slice(0, maxJobs) : jobs

      return selectedJobs.map((job) => ({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: now(),
      }))
    } finally {
      if (browserSession) {
        await browserSession.close().catch(() => {})
      }
    }
  },
})

export const run = async (options = {}) => createInstaSafeScraper().run(options)

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
