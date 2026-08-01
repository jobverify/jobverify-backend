import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDarwinboxScraper } from '../darwinbox/script.js'
import { launchBrowser } from '../../scraper-support/utils/browser.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const OFFICIAL_CAREERS_URL = 'https://www.elgi.com/careers/'
export const OFFICIAL_PAGE_TITLE = 'Careers in ELGi'
export const DARWINBOX_ORIGIN = 'https://elgi.darwinbox.in'
export const DARWINBOX_COMPANY_ID = 'a61e65404e890b'
export const DARWINBOX_CAREERS_URL =
  'https://elgi.darwinbox.in/ms/candidate/a61e65404e890b/careers'
export const DARWINBOX_PUBLIC_ALL_JOBS_URL =
  'https://elgi.darwinbox.in/ms/candidatev2/a61e65404e890b/careers/allJobs'
export const DARWINBOX_LISTING_API_URL =
  'https://elgi.darwinbox.in/ms/candidateapi/job/alljobs?companyId=a61e65404e890b'

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'
const PAGE_SIZE = 10
const BROWSER_NAVIGATION_TIMEOUT_MS = Math.max(config.jobListingTimeoutMs, 60000)
const OFFICIAL_PROMISE_TEXT = "WE'RE ALWAYS BETTER. AND THAT'S A PROMISE"
const OFFICIAL_FIT_TEXT = 'ARE YOU RIGHT FOR US?'
const OFFICIAL_JOBS_TEXT = 'EXPLORE OUR JOBS'

const darwinboxScraper = createDarwinboxScraper({
  companyName: 'ELGi',
  source: 'elgi',
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

const extractTitle = (html) => {
  const match = String(html ?? '').match(/<title>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1])
}

export const extractDarwinboxCareersUrl = (html) => {
  const match = String(html ?? '').match(
    /https:\/\/elgi\.darwinbox\.in\/ms\/candidate\/a61e65404e890b\/careers/i,
  )

  return normalizeWhitespace(match?.[0])
}

export const hasOfficialElgiCareersSignals = (html) => {
  const page = String(html ?? '')
  const text = stripHtml(page) || ''

  return extractTitle(page) === OFFICIAL_PAGE_TITLE
    && text.includes(OFFICIAL_PROMISE_TEXT)
    && text.includes(OFFICIAL_FIT_TEXT)
    && text.includes(OFFICIAL_JOBS_TEXT)
    && extractDarwinboxCareersUrl(page) === DARWINBOX_CAREERS_URL
}

const assertOfficialCareersSurface = (html) => {
  if (!hasOfficialElgiCareersSignals(html)) {
    throw new Error('ELGi verified official careers page no longer matches the verified public surface')
  }

  const darwinboxUrl = extractDarwinboxCareersUrl(html)

  if (darwinboxUrl !== DARWINBOX_CAREERS_URL) {
    throw new Error('ELGi official careers page no longer points to the verified Darwinbox public careers URL')
  }

  return darwinboxUrl
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'elgi-official',
  timeoutMs: 15000,
})

const BLOCKED_RESOURCE_TYPES = new Set(['script', 'image', 'stylesheet', 'font', 'media'])

const isTargetClosedError = (error) =>
  /Target closed/i.test(String(error?.message || error))

const closeBrowserContext = async (browserContext) => {
  try {
    await browserContext.close()
  } catch (error) {
    if (!isTargetClosedError(error)) {
      throw error
    }
  }
}

const buildListingApiUrl = (companyId = DARWINBOX_COMPANY_ID) =>
  `${DARWINBOX_ORIGIN}/ms/candidateapi/job/alljobs?companyId=${encodeURIComponent(companyId)}`

const createElgiListingPage = async (browser) => {
  const page = await browser.newPage()

  await page.setJavaScriptEnabled(false)
  await page.setRequestInterception(true)
  page.on('request', async (request) => {
    try {
      if (BLOCKED_RESOURCE_TYPES.has(request.resourceType())) {
        await request.abort()
        return
      }

      await request.continue()
    } catch {
      await request.abort().catch(() => null)
    }
  })

  return page
}

export const createBrowserListingFetcher = async ({
  careersUrl = DARWINBOX_PUBLIC_ALL_JOBS_URL,
  launchBrowserImpl = launchBrowser,
  createPageImpl = createElgiListingPage,
} = {}) => {
  const browser = await launchBrowserImpl()

  try {
    const page = await createPageImpl(browser)

    await page.goto(careersUrl, {
      waitUntil: 'domcontentloaded',
      timeout: BROWSER_NAVIGATION_TIMEOUT_MS,
    })

    const fetchListingPage = async ({ page: pageNumber, pageSize = PAGE_SIZE, companyId = DARWINBOX_COMPANY_ID }) =>
    {
      const apiUrl = buildListingApiUrl(companyId)
      const requestBody = {
        companyId,
        sort_option: 'new',
        limit: pageSize,
        page: pageNumber,
      }

      const response = await page.evaluate(
        async ({ targetApiUrl, body }) => {
          const listingResponse = await fetch(targetApiUrl, {
            method: 'POST',
            headers: {
              Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          })
          const text = await listingResponse.text()

          return {
            status: listingResponse.status,
            text,
          }
        },
        {
          targetApiUrl: apiUrl,
          body: requestBody,
        },
      )

      if (!Number.isInteger(response.status) || response.status < 200 || response.status >= 300) {
        throw new Error(`HTTP ${response.status} for ELGi Darwinbox listing API`)
      }

      try {
        return JSON.parse(response.text)
      } catch {
        throw new Error('ELGi Darwinbox listing API returned a non-JSON response')
      }
    }

    return {
      fetchListingPage,
      close: async () => browser.close(),
    }
  } catch (error) {
    await browser.close()
    throw error
  }
}

export const createElgiScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  createBrowserListingFetcherImpl = createBrowserListingFetcher,
} = {}) => ({
  async run({
    maxPages = config.maxPages,
    fetchText = defaultFetchText,
    fetchListingPage,
  } = {}) {
    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)
    assertOfficialCareersSurface(careersHtml)

    let browserContext = null

    try {
      if (!fetchListingPage) {
        browserContext = await createBrowserListingFetcherImpl()
        fetchListingPage = browserContext.fetchListingPage
      }

      return await darwinboxScraper.run({
        maxPages,
        maxJobs,
        fetchListingPage,
      })
    } finally {
      if (browserContext) {
        await closeBrowserContext(browserContext)
      }
    }
  },
})

export const run = async (options = {}) => createElgiScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running ELGi scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'elgi')
    console.log('DB result:', result)
    process.exit(0)
  }
}
