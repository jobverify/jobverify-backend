import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createBrowserFetchSession } from '../../scraper-support/shared/browserFetch.js'
import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { INDIAGOLD_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = INDIAGOLD_CATALOG.source
export const COMPANY = INDIAGOLD_CATALOG.companyName
export const VERIFIED_ON = INDIAGOLD_CATALOG.verifiedOn
export const HOMEPAGE_URL = INDIAGOLD_CATALOG.homepageUrl
export const CAREERS_PAGE_URL = INDIAGOLD_CATALOG.companyCareerPage
export const CAREERS_API_URL = INDIAGOLD_CATALOG.careersApiUrl
export const CAREERS_PORTAL_URL = 'https://indiagold.zohorecruit.in/jobs/Careers'
export const GENERAL_APPLICATION_FORM_URL = INDIAGOLD_CATALOG.generalApplicationFormUrl
export const PROVIDER_METADATA = INDIAGOLD_CATALOG

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const shouldUseBrowserFallback = (error) =>
  /HTTP (?:403|429)\b|fetch failed|timed out|timeout|could not connect|und_err_connect_timeout|ssl\/tls secure channel|econnreset|unable to/i
    .test(String(error?.message ?? error ?? ''))

const decodeHtmlEntities = (value) =>
  String(value ?? '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')

const stripHtml = (value) => decodeHtmlEntities(String(value ?? '').replace(/<[^>]+>/g, ' '))

const normalizeWhitespace = (value) => {
  const normalized = stripHtml(value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
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

const isPublishedRecord = (record = {}) => record.Publish !== false
const isUnlockedRecord = (record = {}) => record.Is_Locked !== true && record.Locked !== true
const isIndiaJob = (record = {}) => /india/i.test(normalizeWhitespace(record.Country) || '')

const getLocationParts = (record = {}) =>
  [record.City, record.State, record.Country]
    .map(normalizeWhitespace)
    .filter(Boolean)

export const hasOfficialCareersPageSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*indiagold\s*-\s*join us\s*<\/title>/i.test(page)
    && /SEE ALL POSITIONS/i.test(page)
    && /Great Places to Work Certified/i.test(page)
    && /\bJoin Us\b/i.test(page)
}

export const extractIndiaJobs = (payload) =>
  (Array.isArray(payload?.data) ? payload.data : [])
    .filter((record) => isIndiaJob(record) && isPublishedRecord(record) && isUnlockedRecord(record))
    .map((record) => {
      const title = normalizeWhitespace(record.Posting_Title || record.Job_Opening_Name)
      const jobId = normalizeWhitespace(record.id)
      const sourceUrl = normalizeWhitespace(record.$url)
      const locationParts = getLocationParts(record)
      const location = locationParts.join(', ') || null
      const city = normalizeWhitespace(record.City)
      const state = normalizeWhitespace(record.State)
      const country = normalizeWhitespace(record.Country)

      if (!title || !jobId || !sourceUrl || !country || !location) {
        return null
      }

      return {
        title,
        company: COMPANY,
        department: normalizeWhitespace(record.Industry || record.Department),
        location,
        city,
        state,
        country,
        jobId,
        requisitionId: jobId,
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: normalizeEmploymentType(record.Job_Type),
        experienceRequired: normalizeWhitespace(record.Work_Experience || record.Experience),
        minimumQualification: normalizeWhitespace(record.Minimum_Qualification),
        preferredQualification: normalizeWhitespace(record.Preferred_Qualification),
        requiredSkills: String(record.Required_Skills || '')
          .split(',')
          .map(normalizeWhitespace)
          .filter(Boolean),
        postingDate: normalizeWhitespace(record.Date_Opened),
        closingDate: normalizeWhitespace(record.Target_Date_to_Fill),
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

export const createIndiagoldScraper = ({ maxJobs = null } = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    fetchBrowserText,
    fetchBrowserJson,
    now = () => new Date().toISOString(),
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
        throw new Error('Response is not the verified official Indiagold careers page')
      }

      const payload = shouldPreferBrowserJson
        ? await browserJsonFetcher(CAREERS_API_URL, CAREERS_PORTAL_URL)
        : await fetchJsonWithBrowserFallback(CAREERS_API_URL)
      if (payload?.code !== 'success' || !Array.isArray(payload?.data)) {
        throw new Error('Indiagold public jobs API no longer returns the verified success payload')
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

export const run = async (options = {}) => createIndiagoldScraper(options).run(options)

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
