import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createOptimizedPage, launchBrowser } from '../utils/browser.js'
import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'gadgeon'
export const COMPANY = 'Gadgeon'
export const CAREERS_PAGE_URL = 'https://www.gadgeon.com/joinus/'
export const VERIFIED_PAGE_SIGNAL = 'Current Openings'

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
  const normalized = String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  || null

const extractCity = (location) => normalizeWhitespace(String(location ?? '').split(',')[0])

const isIndiaLocation = (location) => /\bindia\b/i.test(String(location ?? ''))

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

export const hasVerifiedCareersSurface = (pageData) => {
  const title = normalizeWhitespace(pageData?.title)
  const text = String(pageData?.text ?? '')

  return Boolean(title)
    && /gadgeon/i.test(title)
    && text.includes(VERIFIED_PAGE_SIGNAL)
}

export const extractJobsFromPageData = (pageData) => uniqueBy(
  (Array.isArray(pageData?.jobs) ? pageData.jobs : [])
    .map((job) => {
      const title = normalizeWhitespace(job?.title)
      const location = normalizeWhitespace(job?.location)
      const experienceRequired = normalizeWhitespace(job?.experienceRequired)
      const department = normalizeWhitespace(job?.department)
      const jobId = slugify(`${title}-${location}`)

      if (!title || !location || !isIndiaLocation(location) || !jobId) {
        return null
      }

      return {
        title,
        company: COMPANY,
        department,
        location,
        city: extractCity(location),
        country: 'India',
        jobId,
        requisitionId: jobId,
        sourceUrl: CAREERS_PAGE_URL,
        applyUrl: CAREERS_PAGE_URL,
        employmentType: null,
        experienceRequired,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: null,
      }
    })
    .filter(Boolean),
  (job) => job.jobId,
)

const collectPageData = async (page, url) => {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS })
  await page.waitForSelector('body', { timeout: NAVIGATION_TIMEOUT_MS }).catch(() => null)
  await waitForPageSettle(page)

  return page.evaluate(() => {
    const normalize = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()
    const looksLikeLocation = (value) => /\b(?:india|kochi|cochin|bangalore|bengaluru|trivandrum|thiruvananthapuram|hyderabad|chennai|pune|noida|gurugram|mumbai)\b/i.test(value)
    const cards = Array.from(document.querySelectorAll('article, li, .job, .job-card, .opening, .career, .career-item, .vc_row'))
    const jobs = cards
      .map((card) => {
        const textLines = (card.textContent || '')
          .split('\n')
          .map((line) => normalize(line))
          .filter(Boolean)
        const title = normalize(
          card.querySelector('h1, h2, h3, h4, strong, b')?.textContent
          || textLines[0],
        )
        const location = normalize(
          card.querySelector('[class*="location" i]')?.textContent
          || textLines.find((line) => looksLikeLocation(line))
          || null,
        )
        const experienceRequired = normalize(
          card.querySelector('[class*="experience" i]')?.textContent
          || textLines.find((line) => /\byears?\b/i.test(line))
          || null,
        )
        const department = normalize(
          card.querySelector('[class*="department" i], [class*="team" i]')?.textContent
          || textLines.find((line, index) => index > 0 && line !== location && line !== experienceRequired)
          || null,
        )

        return title && location
          ? { title, location, experienceRequired, department }
          : null
      })
      .filter(Boolean)

    return {
      url: window.location.href,
      title: document.title,
      text: document.body?.innerText || '',
      links: Array.from(document.querySelectorAll('a[href]')).map((anchor) => ({
        text: anchor.textContent || '',
        href: anchor.href,
      })),
      jobs,
    }
  })
}

const createBrowserContext = async ({
  launchBrowserImpl = launchBrowser,
  createOptimizedPageImpl = createOptimizedPage,
} = {}) => {
  const browser = await launchBrowserImpl()

  try {
    const page = await createOptimizedPageImpl(browser)

    return {
      browser,
      page,
      close: async () => browser.close(),
    }
  } catch (error) {
    await browser.close()
    throw error
  }
}

export const createGadgeonScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    collectPageDataImpl = collectPageData,
    launchBrowserImpl = launchBrowser,
    createOptimizedPageImpl = createOptimizedPage,
  } = {}) {
    const browserContext = await createBrowserContext({
      launchBrowserImpl,
      createOptimizedPageImpl,
    })

    try {
      const pageData = await collectPageDataImpl(browserContext.page, CAREERS_PAGE_URL)

      if (!hasVerifiedCareersSurface(pageData)) {
        throw new Error('Gadgeon careers page no longer matches the verified public careers surface')
      }

      const jobs = extractJobsFromPageData(pageData)
      const selectedJobs = Number.isInteger(maxJobs) ? jobs.slice(0, maxJobs) : jobs

      return selectedJobs.map((job) => ({
        ...job,
        source: SOURCE,
        link: job.sourceUrl,
        scrapedAt: new Date().toISOString(),
      }))
    } finally {
      await browserContext.close()
    }
  },
})

export const run = async (options = {}) => createGadgeonScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Gadgeon scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
