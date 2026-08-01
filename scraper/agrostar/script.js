import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDarwinboxScraper } from '../darwinbox/script.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

import { AGROSTAR_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const COMPANY_NAME = AGROSTAR_CATALOG.companyName
export const SOURCE = AGROSTAR_CATALOG.source
export const DARWINBOX_COMPANY_ID = AGROSTAR_CATALOG.darwinboxCompanyId
export const DARWINBOX_ORIGIN = AGROSTAR_CATALOG.darwinboxOrigin
export const OFFICIAL_CAREERS_URL = AGROSTAR_CATALOG.companyCareerPage
export const OFFICIAL_CAREERS_HANDOFF_URL = AGROSTAR_CATALOG.officialCareersHandoffUrl
export const PUBLIC_PORTAL_URL =
  `${DARWINBOX_ORIGIN}/ms/candidatev2/${DARWINBOX_COMPANY_ID}/careers/allJobs`
export const VERIFIED_ON = AGROSTAR_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = AGROSTAR_CATALOG.verifiedSurfaceSummary
export const PROVIDER_METADATA = AGROSTAR_CATALOG

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'
const AGROSTAR_DARWINBOX_NAVIGATION_TIMEOUT_MS = 60_000

const darwinboxScraper = createDarwinboxScraper({
  companyName: COMPANY_NAME,
  source: SOURCE,
  companyId: DARWINBOX_COMPANY_ID,
  origin: DARWINBOX_ORIGIN,
})

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const extractTitle = (html) => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1])
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let browserUtilsPromise

const loadBrowserUtils = async () => {
  browserUtilsPromise ||= import('../../scraper-support/utils/browser.js')
  return browserUtilsPromise
}

export const extractOfficialDarwinboxUrl = (html = '') => {
  const match = String(html ?? '').match(
    /https:\/\/agrostar\.darwinbox\.in\/ms\/candidatev2\/main\/careers\/allJobs/i,
  )

  return normalizeWhitespace(match?.[0])
}

export const hasOfficialAgroStarCareersSignals = (html = '') => {
  const page = String(html ?? '')
  const text = (normalizeWhitespace(page) || '').toLowerCase()
  const hasLegacyTalentCopy = text.includes("we're always looking for great talent")
  const hasCurrentPerksCopy = text.includes('the perks of being an agstar')

  return extractTitle(page) === 'Join Us | Build Your Career at AgroStar & Transform Indian Agriculture'
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/corporate\.agrostar\.in\/join-us["']/i.test(page)
    && text.includes('build an institution that feeds the nation, and saves the planet.')
    && (hasLegacyTalentCopy || hasCurrentPerksCopy)
    && text.includes("if you're ready to make an impact, we'd love to meet you!")
    && extractOfficialDarwinboxUrl(page) === OFFICIAL_CAREERS_HANDOFF_URL
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'agrostar-official',
  timeoutMs: 15000,
})

const createAgroStarBrowserListingFetcher = async () => {
  const { launchBrowser, createOptimizedPage } = await loadBrowserUtils()
  const browser = await launchBrowser()
  const page = await createOptimizedPage(browser)

  page.setDefaultNavigationTimeout?.(AGROSTAR_DARWINBOX_NAVIGATION_TIMEOUT_MS)

  try {
    try {
      await page.goto(PUBLIC_PORTAL_URL, {
        waitUntil: 'domcontentloaded',
        timeout: AGROSTAR_DARWINBOX_NAVIGATION_TIMEOUT_MS,
      })
    } catch (err) {
      if (!/Navigation timeout/i.test(String(err?.message || err))) {
        throw err
      }
    }

    await page.waitForSelector('body', { timeout: config.jobListingTimeoutMs }).catch(() => null)
    await delay(config.pageLoadDelayMs)

    return {
      fetchListingPage: async ({ page: pageNumber, pageSize = 10, companyId = DARWINBOX_COMPANY_ID }) =>
        page.evaluate(
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
            targetCompanyId: companyId,
            targetPage: pageNumber,
            targetPageSize: pageSize,
          },
        ),
      close: async () => browser.close(),
    }
  } catch (err) {
    await browser.close().catch(() => null)
    throw err
  }
}

export const createAgroStarScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    maxPages = config.maxPages,
    fetchText = defaultFetchText,
    fetchListingPage,
    createListingFetcher = createAgroStarBrowserListingFetcher,
  } = {}) {
    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)

    if (!hasOfficialAgroStarCareersSignals(careersHtml)) {
      throw new Error('AgroStar verified official careers page no longer matches the verified public surface')
    }

    let listingFetcher = null

    try {
      if (!fetchListingPage) {
        listingFetcher = await createListingFetcher()
        fetchListingPage = listingFetcher.fetchListingPage
      }

      const jobs = await darwinboxScraper.run({
        maxPages,
        maxJobs,
        fetchListingPage,
      })
      const scrapedAt = now()

      return jobs.map((job) => ({
        ...job,
        scrapedAt,
      }))
    } finally {
      if (listingFetcher) {
        await listingFetcher.close()
      }
    }
  },
})

export const run = async (options = {}) => createAgroStarScraper().run(options)

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
