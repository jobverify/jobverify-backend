import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createOptimizedPage, launchBrowser } from '../../scraper-support/utils/browser.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREERS_URL = 'https://cpcdiagnostics.in/career'

const COMPANY = 'Everlife CPC'
const SOURCE = 'everlifecpc'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtml(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const normalizeCity = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const map = new Map([
    ['Hyderbad', 'Hyderabad'],
  ])

  return map.get(normalized) || normalized
}

const parseLocation = (value) => {
  const city = normalizeCity(value)
  if (!city) {
    return {
      location: null,
      city: null,
      country: null,
    }
  }

  return {
    location: `${city}, India`,
    city,
    country: 'India',
  }
}

export const pageIndicatesEverlifeCpcCareers = (html) => {
  const page = String(html ?? '')
  return (
    /Work With Everlife CPC/i.test(page)
    && /hiring@cpcdiagnostics\.in/i.test(page)
    && /Apply Now/i.test(page)
  )
}

export const pageIndicatesCurrentNoPublicJobsShell = (html) => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page) || ''

  return /<title>\s*Medical Laboratory Equipment Supplier in India\s*<\/title>/i.test(page)
    && !/everlife\.darwinbox\.in|Work With Everlife CPC|Apply Now/i.test(page)
    && text.includes('Medical Laboratory Equipment Supplier in India')
}

export const extractJobs = (html) => {
  if (pageIndicatesCurrentNoPublicJobsShell(html)) {
    return []
  }

  if (!pageIndicatesEverlifeCpcCareers(html)) {
    throw new Error('Everlife CPC careers page no longer exposes the expected public openings')
  }

  const matches = [...String(html ?? '').matchAll(
    /<h5[^>]*>\s*(.*?)\s*<\/h5>[\s\S]*?Location:\s*([^<\n]+)[\s\S]*?<a[^>]+href="([^"]*everlife\.darwinbox\.in[^"]*)"[^>]*>\s*Apply Now/gi,
  )]

  const jobs = matches.map((match) => {
    const title = normalizeWhitespace(match[1])
    const applyUrl = normalizeWhitespace(match[3])
    const locationData = parseLocation(match[2])
    const jobId = slugify(`${SOURCE}-${title}-${locationData.city}`)

    if (!title || !applyUrl || !locationData.location || !jobId) return null

    return {
      title,
      company: COMPANY,
      department: null,
      location: locationData.location,
      city: locationData.city,
      country: locationData.country,
      jobId,
      requisitionId: jobId,
      sourceUrl: CAREERS_URL,
      applyUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Apply via the verified Everlife CPC Darwinbox handoff from the official careers page.',
      remoteStatus: 'On-site',
    }
  }).filter(Boolean)

  if (jobs.length === 0) {
    throw new Error('Everlife CPC careers page no longer exposes the expected public openings')
  }

  return jobs
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const createBrowserHtmlFetcher = async ({
  launchBrowserImpl = launchBrowser,
  createOptimizedPageImpl = createOptimizedPage,
} = {}) => {
  const browser = await launchBrowserImpl()

  try {
    const page = await createOptimizedPageImpl(browser)

    return {
      close: async () => browser.close(),
      fetchRenderedHtml: async (url) => {
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        })
        await delay(config.pageLoadDelayMs)
        return page.content()
      },
    }
  } catch (error) {
    await browser.close()
    throw error
  }
}

export const createEverlifeCpcScraper = () => ({
  async run({
    fetchRenderedHtml,
    now = () => new Date().toISOString(),
  } = {}) {
    let browserContext = null

    try {
      if (!fetchRenderedHtml) {
        browserContext = await createBrowserHtmlFetcher()
        fetchRenderedHtml = browserContext.fetchRenderedHtml
      }

      const html = await fetchRenderedHtml(CAREERS_URL)
      const jobs = extractJobs(html)

      return jobs.map((job) => ({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: now(),
      }))
    } finally {
      if (browserContext) {
        await browserContext.close()
      }
    }
  },
})

export const run = async (options = {}) => createEverlifeCpcScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  console.log(`Total Everlife CPC jobs scraped: ${jobs.length}`)
  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
