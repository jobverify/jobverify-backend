import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createOptimizedPage, launchBrowser } from '../../scraper-support/utils/browser.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'envestnet'
export const COMPANY = 'Envestnet'
export const INDIA_SEARCH_URL = 'https://careers.envestnet.com/search/jobs/in/country/india'
export const SEARCH_URL = 'https://careers.envestnet.com/search/jobs'
export const DETAIL_URL_PATTERN = /^https:\/\/careers\.envestnet\.com\/jobs\/(\d+)-/i
export const VERIFIED_LISTING_TITLE = 'India Careers'
export const VERIFIED_LISTING_SIGNALS = [
  'Job Search Results',
  'Set up job alerts',
  'Showing 1-',
  'of',
  'result(s)',
]
export const VERIFIED_DETAIL_SIGNAL = 'Description'

const NAVIGATION_TIMEOUT_MS = 45000
const PAGE_SETTLE_MS = 2500

const waitForPageSettle = async (page, timeoutMs = PAGE_SETTLE_MS) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return

  if (typeof page?.waitForTimeout === 'function') {
    await page.waitForTimeout(timeoutMs)
    return
  }

  await new Promise((resolve) => setTimeout(resolve, timeoutMs))
}

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const splitLines = (value) => String(value ?? '')
  .split(/\r?\n/)
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const uniqueBy = (items, getKey) => {
  const seen = new Set()
  const results = []

  for (const item of items) {
    const key = getKey(item)
    if (!key || seen.has(key)) continue
    seen.add(key)
    results.push(item)
  }

  return results
}

const buildListingPageUrl = (pageNumber = 1) => (
  pageNumber <= 1
    ? INDIA_SEARCH_URL
    : `${INDIA_SEARCH_URL}?page=${pageNumber}`
)

const extractJobIdFromUrl = (value) => normalizeWhitespace(
  String(value ?? '').match(DETAIL_URL_PATTERN)?.[1],
)

const extractCity = (location) => normalizeWhitespace(
  String(location ?? '').split(',')[0],
)

const parseTotalResults = (text) => {
  const match = String(text ?? '').match(/Showing\s+\d+\s*-\s*\d+\s+of\s+(\d+)\s+result\(s\)/i)
  return match ? Number.parseInt(match[1], 10) : null
}

export const hasVerifiedIndiaListingSurface = (pageData) => {
  const title = normalizeWhitespace(pageData?.title)
  const text = String(pageData?.text ?? '')
  const jobLinks = extractListingJobLinks(pageData)

  return title === VERIFIED_LISTING_TITLE
    && VERIFIED_LISTING_SIGNALS.every((signal) => text.includes(signal))
    && jobLinks.length > 0
}

export const extractListingJobLinks = (pageData) => uniqueBy(
  (Array.isArray(pageData?.links) ? pageData.links : [])
    .map((link) => ({
      title: normalizeWhitespace(link?.text),
      url: normalizeWhitespace(link?.href),
    }))
    .filter((link) => link.title && DETAIL_URL_PATTERN.test(link.url || '')),
  (link) => link.url,
)

export const hasVerifiedDetailSurface = (pageData) => {
  const title = normalizeWhitespace(pageData?.title)
  const text = String(pageData?.text ?? '')

  return Boolean(title)
    && title.includes(' in ')
    && text.includes(VERIFIED_DETAIL_SIGNAL)
    && text.includes('Apply Now')
}

const extractSectionText = ({ lines, startLabel, endLabels = [] }) => {
  const startIndex = lines.findIndex((line) => line === startLabel)
  if (startIndex < 0) return null

  const collected = []
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (endLabels.includes(line)) break
    collected.push(line)
  }

  return normalizeWhitespace(collected.join(' '))
}

export const extractJobFromDetailPage = (pageData) => {
  if (!hasVerifiedDetailSurface(pageData)) {
    throw new Error('Envestnet job detail page no longer matches the verified public surface')
  }

  const sourceUrl = normalizeWhitespace(pageData?.url)
  const title = normalizeWhitespace(
    String(pageData?.title ?? '').replace(/\s+in\s+.+$/i, ''),
  )
  const lines = splitLines(pageData?.text)
  const location = normalizeWhitespace(
    lines.find((line) => line.startsWith('Location:'))?.replace(/^Location:\s*/i, ''),
  )
  const postingDate = normalizeWhitespace(
    lines.find((line) => line.startsWith('Date Posted:'))?.replace(/^Date Posted:\s*/i, ''),
  )
  const jobId = extractJobIdFromUrl(sourceUrl)
  const description = extractSectionText({
    lines,
    startLabel: 'Description',
    endLabels: [
      'Share:',
      'Apply Now',
      'Save Job',
      'Our Investment in You',
      'Our Commitment to Inclusion & Belonging',
      'Join our Talent Network',
    ],
  })

  if (!title || !location || !jobId) {
    throw new Error('Envestnet job detail page is missing required job fields')
  }

  if (!/india/i.test(location)) {
    return null
  }

  return {
    title,
    company: COMPANY,
    department: null,
    location,
    city: extractCity(location),
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
    postingDate,
    closingDate: null,
    jobDescription: description,
  }
}

const collectPageData = async (page, url) => {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS })
  await page.waitForSelector('body', { timeout: NAVIGATION_TIMEOUT_MS }).catch(() => null)
  await waitForPageSettle(page)

  return page.evaluate(() => ({
    url: window.location.href,
    title: document.title,
    text: document.body?.innerText || '',
    links: Array.from(document.querySelectorAll('a[href]')).map((anchor) => ({
      text: anchor.textContent || '',
      href: anchor.href,
    })),
  }))
}

const createBrowserContext = async ({
  launchBrowserImpl = launchBrowser,
  createOptimizedPageImpl = createOptimizedPage,
} = {}) => {
  const browser = await launchBrowserImpl()

  try {
    const listingPage = await createOptimizedPageImpl(browser)
    const detailPage = await createOptimizedPageImpl(browser)

    return {
      browser,
      listingPage,
      detailPage,
      close: async () => browser.close(),
    }
  } catch (error) {
    await browser.close()
    throw error
  }
}

export const createEnvestnetScraper = ({
  maxJobs = null,
} = {}) => ({
  async run({
    maxPages = 5,
    collectPageDataImpl = collectPageData,
    launchBrowserImpl = launchBrowser,
    createOptimizedPageImpl = createOptimizedPage,
  } = {}) {
    const browserContext = await createBrowserContext({
      launchBrowserImpl,
      createOptimizedPageImpl,
    })

    try {
      const listingLinks = []

      for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
        const pageData = await collectPageDataImpl(
          browserContext.listingPage,
          buildListingPageUrl(pageNumber),
        )

        if (!hasVerifiedIndiaListingSurface(pageData)) {
          throw new Error('Envestnet India jobs page no longer matches the verified public surface')
        }

        const pageLinks = extractListingJobLinks(pageData)
        if (pageLinks.length === 0) break

        listingLinks.push(...pageLinks)

        const totalResults = parseTotalResults(pageData.text)
        if (Number.isInteger(totalResults) && listingLinks.length >= totalResults) {
          break
        }

        if (pageLinks.length < 25) {
          break
        }
      }

      const uniqueLinks = uniqueBy(listingLinks, (job) => job.url)
      const selectedLinks = Number.isInteger(maxJobs)
        ? uniqueLinks.slice(0, maxJobs)
        : uniqueLinks

      const jobs = []

      for (const listing of selectedLinks) {
        const detailPageData = await collectPageDataImpl(browserContext.detailPage, listing.url)
        const job = extractJobFromDetailPage(detailPageData)
        if (!job) continue

        jobs.push({
          ...job,
          source: SOURCE,
          link: job.applyUrl || job.sourceUrl,
          scrapedAt: new Date().toISOString(),
        })
      }

      return jobs
    } finally {
      await browserContext.close()
    }
  },
})

export const run = async (options = {}) => createEnvestnetScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Envestnet scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, SOURCE)
    console.log('DB result:', result)
    process.exit(0)
  }
}
