import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDarwinboxScraper } from '../darwinbox/script.js'
import { launchBrowser, createOptimizedPage } from '../utils/browser.js'
import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const OFFICIAL_CAREERS_URL = 'https://careers.cardekho.com/'
export const DARWINBOX_ORIGIN = 'https://cardekho.darwinbox.in'
export const DARWINBOX_COMPANY_ID = '606876f7e2c79'
export const DARWINBOX_CAREERS_URL =
  'https://cardekho.darwinbox.in/ms/candidate/606876f7e2c79/careers'

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'
const PAGE_SIZE = 10

const darwinboxScraper = createDarwinboxScraper({
  companyName: 'CarDekho',
  source: 'cardekho',
  companyId: DARWINBOX_COMPANY_ID,
  origin: DARWINBOX_ORIGIN,
  pageSize: PAGE_SIZE,
})

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&#8217;|&apos;|&rsquo;/gi, "'")
  .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/gi, '"')
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

const stripHtml = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

export const extractDarwinboxCareersUrl = (html) => {
  const match = String(html ?? '').match(
    /https:\/\/cardekho\.darwinbox\.in\/ms\/candidate\/606876f7e2c79\/careers/i,
  )

  return normalizeWhitespace(match?.[0])
}

export const hasOfficialCarDekhoCareersSignals = (html) => {
  const page = String(html ?? '')
  const text = stripHtml(page) || ''

  return /<title[^>]*>[\s\S]*(?:Career|CarDekho)[\s\S]*<\/title>/i.test(page)
    && /(?:View Openings|Join Our Team|Join CarDekho Group|start something big together)/i.test(text)
    && extractDarwinboxCareersUrl(page) === DARWINBOX_CAREERS_URL
}

const assertOfficialCareersSurface = (html) => {
  if (!hasOfficialCarDekhoCareersSignals(html)) {
    throw new Error('CarDekho verified official careers page no longer matches the verified public surface')
  }

  const darwinboxUrl = extractDarwinboxCareersUrl(html)
  if (darwinboxUrl !== DARWINBOX_CAREERS_URL) {
    throw new Error('CarDekho official careers page no longer points to the verified Darwinbox public careers URL')
  }

  return darwinboxUrl
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'cardekho-official',
  timeoutMs: 15000,
})

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const createBrowserListingFetcher = async ({
  careersUrl = DARWINBOX_CAREERS_URL,
  launchBrowserImpl = launchBrowser,
  createOptimizedPageImpl = createOptimizedPage,
} = {}) => {
  const browser = await launchBrowserImpl()

  try {
    const page = await createOptimizedPageImpl(browser)

    await page.goto(careersUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('body', { timeout: config.jobListingTimeoutMs }).catch(() => null)
    await delay(config.pageLoadDelayMs)

    const fetchListingPage = async ({
      page: pageNumber,
      pageSize = PAGE_SIZE,
      companyId = DARWINBOX_COMPANY_ID,
    }) => page.evaluate(
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
    )

    return {
      fetchListingPage,
      close: async () => browser.close(),
    }
  } catch (error) {
    await browser.close()
    throw error
  }
}

export const createCarDekhoScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    maxPages = config.maxPages,
    fetchText = defaultFetchText,
    fetchListingPage,
  } = {}) {
    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)
    assertOfficialCareersSurface(careersHtml)

    if (!fetchListingPage) {
      return darwinboxScraper.run({
        maxPages,
        maxJobs,
      })
    }

    return darwinboxScraper.run({
      maxPages,
      maxJobs,
      fetchListingPage,
    })
  },
})

export const run = async (options = {}) => createCarDekhoScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, 'cardekho')
  }
}
