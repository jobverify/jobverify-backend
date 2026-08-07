import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDarwinboxScraper } from '../darwinbox/script.js'
import { launchBrowser, createOptimizedPage } from '../../scraper-support/utils/browser.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

import { REDBUS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = REDBUS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const CAREERS_PAGE_URL = PROVIDER_METADATA.companyCareerPage
export const JOBS_PAGE_URL = PROVIDER_METADATA.jobListingsUrl
export const DARWINBOX_ORIGIN = PROVIDER_METADATA.darwinboxOrigin
export const DARWINBOX_COMPANY_ID = PROVIDER_METADATA.darwinboxCompanyId
export const DEFAULT_PAGE_SIZE = 20

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const darwinboxScraper = createDarwinboxScraper({
  companyName: COMPANY,
  source: SOURCE,
  companyId: DARWINBOX_COMPANY_ID,
  origin: DARWINBOX_ORIGIN,
  pageSize: DEFAULT_PAGE_SIZE,
})

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const decodePercentEncodedText = (value) => {
  if (value == null) return null

  const normalized = String(value).trim()
  if (!normalized) return null

  const sanitized = normalized
    .replace(/\+/g, '%20')
    .replace(/%(?![0-9a-f]{2})/gi, '%25')

  try {
    return decodeURIComponent(sanitized)
  } catch {
    return sanitized.replace(
      /%([0-9a-f]{2})/gi,
      (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)),
    )
  }
}

const extractTitle = (html = '') => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1])
}

export const extractInlinePageData = (html = '') => {
  const match = String(html ?? '').match(/\b(?:let|var)\s+data\s*=\s*(["'])([\s\S]*?)\1/i)
  return match ? decodePercentEncodedText(match[2]) : null
}

const buildVerifiedSurfaceText = (html = '') =>
  normalizeWhitespace([String(html ?? ''), extractInlinePageData(html)].filter(Boolean).join(' ')) || ''

const buildVerifiedSurfaceSource = (html = '') =>
  [String(html ?? ''), extractInlinePageData(html)].filter(Boolean).join('\n')

export const buildDarwinboxAllJobsUrl = () => darwinboxScraper.buildCareersPageUrl()
export const buildDarwinboxJobDetailUrl = (jobId) => darwinboxScraper.buildJobDetailUrl(jobId)

export const extractJobsBundleUrl = (html = '') => {
  const match = String(html ?? '').match(
    /<script[^>]+src=["']([^"']*\/careers\/scripts\/jobs\.bundle\.js[^"']*)["']/i,
  )

  return match ? new URL(match[1], JOBS_PAGE_URL).toString() : null
}

export const hasOfficialCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = buildVerifiedSurfaceText(page)
  const source = buildVerifiedSurfaceSource(page)

  return extractTitle(page) === 'redBus Careers'
    && text.includes('Explore open roles')
    && /["']\/careers\/jobs["']/i.test(source)
}

export const hasJobsPageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = buildVerifiedSurfaceText(page)

  return extractTitle(page) === 'redBus Careers'
    && extractJobsBundleUrl(page) !== null
    && text.includes('Open roles')
    && text.includes('Search job title, skills or keyword')
}

export const hasDarwinboxApplyHandoffSignal = (bundle = '') => {
  const text = String(bundle ?? '')

  return /\/careers\/api\/getJobsList\?timestamp=/i.test(text)
    && /https:\/\/gommt\.darwinbox\.in\/ms\/candidatev2\/main\/careers\/jobDetails\//i.test(text)
    && /\?from=all/i.test(text)
}

export const hasDarwinboxShellSignal = (html = '') => {
  const page = String(html ?? '')

  return /<base[^>]+href=["']\/ms\/candidatev2\/["'][^>]*>/i.test(page)
    && /db-components\.esm\.js/i.test(page)
    && /\/ms\/formbuilder\/assets\/db-form\/db-form\.js/i.test(page)
    && /<app-root\b/i.test(page)
}

export const isRedBusRecord = (record = {}) => {
  const subtype = normalizeWhitespace(record.emp_sub_type_name) || ''
  if (/\bRB\s*-\s*Employee\b/i.test(subtype)) return true

  const jd = normalizeWhitespace(record.jd) || ''
  if (/\bredbus\b/i.test(jd)) return true

  const department = normalizeWhitespace(record.department_name) || ''
  return /(?:^|[_( -])RBM(?:$|[_) -])/i.test(department)
}

export const filterRedBusRecords = (records = []) => {
  const seenIds = new Set()

  return (Array.isArray(records) ? records : [])
    .filter((record) => isRedBusRecord(record))
    .filter((record) => {
      const jobId = normalizeWhitespace(record.id)
      if (!jobId || seenIds.has(jobId)) return false
      seenIds.add(jobId)
      return true
    })
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'redbus-official',
  timeoutMs: 15000,
})

const createBrowserListingFetcher = async ({ pageSize = DEFAULT_PAGE_SIZE } = {}) => {
  const browser = await launchBrowser()
  const page = await createOptimizedPage(browser)

  await page.goto(buildDarwinboxAllJobsUrl(), { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('body', { timeout: config.jobListingTimeoutMs }).catch(() => null)

  const fetchListingPage = async ({ page: pageNumber }) => page.evaluate(
    async ({ targetCompanyId, targetPage, targetPageSize }) => {
      const response = await fetch(`/ms/candidateapi/job/alljobs?companyId=${targetCompanyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: targetCompanyId,
          sort_option: 'new',
          limit: targetPageSize,
          page: targetPage,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return response.json()
    },
    {
      targetCompanyId: DARWINBOX_COMPANY_ID,
      targetPage: pageNumber,
      targetPageSize: pageSize,
    },
  )

  return {
    fetchListingPage,
    close: async () => browser.close(),
  }
}

export const createRedBusScraper = ({
  now: defaultNow = () => new Date().toISOString(),
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    maxPages = config.maxPages,
    pageSize = DEFAULT_PAGE_SIZE,
    fetchText = defaultFetchText,
    fetchListingPage,
    now = defaultNow,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_PAGE_URL)
    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('RedBus verified official careers page no longer matches the verified public surface')
    }

    const jobsPageHtml = await fetchText(JOBS_PAGE_URL)
    if (!hasJobsPageSignal(jobsPageHtml)) {
      throw new Error('RedBus verified jobs page no longer matches the verified public surface')
    }

    const jobsBundleUrl = extractJobsBundleUrl(jobsPageHtml)
    const jobsBundleJs = await fetchText(jobsBundleUrl)
    if (!hasDarwinboxApplyHandoffSignal(jobsBundleJs)) {
      throw new Error('RedBus verified jobs bundle no longer exposes the known Darwinbox handoff')
    }

    const darwinboxShellHtml = await fetchText(buildDarwinboxAllJobsUrl())
    if (!hasDarwinboxShellSignal(darwinboxShellHtml)) {
      throw new Error('RedBus verified Darwinbox shell no longer matches the known public surface')
    }

    let browserContext = null

    try {
      if (!fetchListingPage) {
        browserContext = await createBrowserListingFetcher({ pageSize })
        fetchListingPage = browserContext.fetchListingPage
      }

      const jobs = []

      for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
        const payload = await fetchListingPage({
          page: pageNumber,
          pageSize,
          companyId: DARWINBOX_COMPANY_ID,
        })

        const filteredPayload = {
          ...payload,
          data: filterRedBusRecords(payload?.data),
        }

        const pageJobs = darwinboxScraper.extractSearchResults(filteredPayload)
        const scrapedAt = now()

        for (const job of pageJobs) {
          jobs.push({
            ...job,
            source: SOURCE,
            link: job.applyUrl || job.sourceUrl,
            scrapedAt,
          })

          if (maxJobs && jobs.length >= maxJobs) {
            return jobs
          }
        }

        const totalJobCount = Number.parseInt(String(payload?.job_counts ?? ''), 10)
        const rawCount = Array.isArray(payload?.data) ? payload.data.length : 0
        const hasMore = Number.isFinite(totalJobCount)
          ? pageNumber * pageSize < totalJobCount
          : rawCount === pageSize

        if (!hasMore) break
      }

      return jobs
    } finally {
      if (browserContext) {
        await browserContext.close()
      }
    }
  },
})

export const run = async (options = {}) => createRedBusScraper().run(options)

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
