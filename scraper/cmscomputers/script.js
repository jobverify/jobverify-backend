import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createOptimizedPage, launchBrowser } from '../utils/browser.js'
import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREERS_PAGE_URL = 'https://www.cms.com/careers'
export const FOUNTAIN_BOARD_URL = 'https://careers.ap-1.fountain.com/cms/a9218256-8fbf-40ab-936b-49ff5ff7c900'

const FOUNTAIN_HOST = new URL(FOUNTAIN_BOARD_URL).hostname
const FOUNTAIN_BOARD_PATH = new URL(FOUNTAIN_BOARD_URL).pathname.replace(/\/$/, '')
const JOB_CARD_SELECTOR = '[data-testid="job-card"], a[href*="/jobs/"]'

const normalizeWhitespace = (value) => {
  const normalized = String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeVisibleText = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Jobify/1.0)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const hasCmsCareersSignal = (html) => {
  const source = String(html ?? '')
  const visibleText = normalizeVisibleText(source)
  const boardUrlPattern = new RegExp(
    FOUNTAIN_BOARD_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\//g, '\\/'),
    'i',
  )

  return /<title>\s*Business Services Company \| Careers \| CMS Info Systems\s*<\/title>/i.test(source)
    && /Where talent meets\s+Passion\.\s+Performance\.\s+Pride\./i.test(visibleText || '')
    && boardUrlPattern.test(source)
}

const isSafeFountainJobUrl = (value) => {
  try {
    const url = new URL(value, FOUNTAIN_BOARD_URL)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    if (url.hostname !== FOUNTAIN_HOST) return null
    if (!url.pathname.startsWith(`${FOUNTAIN_BOARD_PATH}/`)) return null
    return url.href.split('#')[0]
  } catch {
    return null
  }
}

const getJobId = (url) => {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).at(-1)) || null
  } catch {
    return null
  }
}

const getCity = (location) => normalizeWhitespace(location)?.split(',')[0] || null

const isIndiaLocation = (location) => /\bindia\b/i.test(location || '')

export const extractFountainJobs = (cards) => {
  const seenUrls = new Set()

  return (Array.isArray(cards) ? cards : [])
    .map((card) => {
      const title = normalizeWhitespace(card?.title)
      const location = normalizeWhitespace(card?.location)
      const sourceUrl = isSafeFountainJobUrl(card?.href)
      const jobId = sourceUrl ? getJobId(sourceUrl) : null

      if (!title || !location || !isIndiaLocation(location) || !sourceUrl || !jobId || seenUrls.has(sourceUrl)) {
        return null
      }

      seenUrls.add(sourceUrl)
      return {
        title,
        company: 'CMS Info Systems',
        department: normalizeWhitespace(card?.department),
        location,
        city: getCity(location),
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
        postingDate: null,
        closingDate: null,
        jobDescription: null,
      }
    })
    .filter(Boolean)
}

const readRenderedFountainCards = async (page) => page.$$eval(JOB_CARD_SELECTOR, (elements) => elements
  .map((element) => {
    const card = element.closest('[data-testid="job-card"], article, li, [role="listitem"]') || element
    const link = element.matches('a[href]') ? element : card.querySelector('a[href]')
    const textLines = (card.innerText || '')
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
    const title = card.querySelector('h1, h2, h3, h4, [data-testid="job-title"]')?.textContent?.trim()
      || link?.textContent?.trim()
      || textLines[0]
    const location = card.querySelector('[data-testid="job-location"], [class*="location" i]')?.textContent?.trim()
      || textLines.find((line) => /\bindia\b/i.test(line))
      || null
    const department = card.querySelector('[data-testid="job-department"], [class*="department" i]')?.textContent?.trim()
      || null

    return { title, location, department, href: link?.href || null }
  })
  .filter((card) => card.href),
)

export const createCmsComputersScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const browserFactory = options.launchBrowser || launchBrowser
    const pageFactory = options.createPage || createOptimizedPage
    const careersHtml = await fetchText(CAREERS_PAGE_URL)

    if (!hasCmsCareersSignal(careersHtml)) {
      throw new Error('CMS careers page does not match the expected official CMS careers page structure')
    }

    let browser
    try {
      browser = await browserFactory()
      const page = await pageFactory(browser)
      await page.goto(FOUNTAIN_BOARD_URL, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector(JOB_CARD_SELECTOR, {
        timeout: config.jobListingTimeoutMs || 30000,
      })
      const jobs = extractFountainJobs(await readRenderedFountainCards(page))
      const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

      return selectedJobs.map((job) => ({
        ...job,
        source: 'cmscomputers',
        link: job.applyUrl,
        scrapedAt: new Date().toISOString(),
      }))
    } finally {
      if (browser) await browser.close()
    }
  },
})

export const run = async () => createCmsComputersScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running CMS Computers scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'cmscomputers')
    console.log('DB result:', result)
    process.exit(0)
  }
}
