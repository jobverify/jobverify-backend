import path from 'path'
import { fileURLToPath } from 'url'

import { extractJobDetail } from '../../scraper-support/detailExtractors/index.js'
import { launchBrowser, createOptimizedPage } from '../../scraper-support/utils/browser.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { mapWithConcurrency } from '../../scraper-support/utils/mapWithConcurrency.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const COUNTRY_NAME = 'India'
const BASE_URL = `https://www.google.com/about/careers/applications/jobs/results?location=${COUNTRY_NAME}`
const GOOGLE_HOST = new URL(BASE_URL).hostname
const DEFAULT_DETAIL_CONCURRENCY = 8

const SELECTORS = {
  jobList: 'ul.spHGqe',
  jobItem: 'li.lLd3Je',
  jobTitle: 'h3.QJPWVe',
  jobCompany: '.RP7SMd span',
  jobLocation: '.pwO9Dc span.r0wTof',
  jobLink: 'a.WpHeLc[href]',
  paginationNext: 'a[aria-label="Go to next page"]',
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const extractCity = (location) => {
  if (!location) return null
  const loc = location.trim()
  if (/remote/i.test(loc)) return 'Remote'
  return loc.split(',')[0].trim() || null
}

const extractJobId = (link) => {
  const match = link.match(/\/results\/(\d+)-/)
  return match ? match[1] : null
}

const toCanonicalLink = (href) => {
  try {
    const url = new URL(href, BASE_URL)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    return url.hostname === GOOGLE_HOST ? url.href.split('?')[0] : null
  } catch {
    return null
  }
}

const defaultFetchText = (url) =>
  fetchTextWithRetry(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    attempts: config.retryAttempts,
    baseDelayMs: config.retryBaseDelayMs,
    timeoutMs: Math.max(config.jobListingTimeoutMs || 0, 30000),
    label: 'google',
  })

export const createGoogleScraper = ({
  detailConcurrency = DEFAULT_DETAIL_CONCURRENCY,
} = {}) => ({
  async run({
    launchBrowserImpl = launchBrowser,
    createOptimizedPageImpl = createOptimizedPage,
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    let browser
    let currentUrl = BASE_URL

    try {
      browser = await launchBrowserImpl()
      const page = await createOptimizedPageImpl(browser)
      const allJobs = []
      const seenLinks = new Set()
      let pageNum = 1

      while (currentUrl && pageNum <= config.maxPages) {
        await page.goto(currentUrl, { waitUntil: 'domcontentloaded' })
        await sleep(config.pageLoadDelayMs)
        console.log(`  [google] Scraping page ${pageNum} - ${currentUrl}`)

        try {
          await page.waitForSelector(SELECTORS.jobList, { timeout: config.jobListingTimeoutMs })
        } catch {
          throw new Error(`Job list selector not found at: ${currentUrl}`)
        }

        const jobs = await page
          .$$eval(
            SELECTORS.jobItem,
            (items, selectors) =>
              items
                .map((item) => {
                  const titleEl = item.querySelector(selectors.jobTitle)
                  const companyEl = item.querySelector(selectors.jobCompany)
                  const locationEl = item.querySelector(selectors.jobLocation)
                  const linkEl = item.querySelector(selectors.jobLink)
                  if (!titleEl || !linkEl) return null
                  return {
                    title: titleEl.innerText.trim(),
                    company: companyEl?.innerText.trim() || 'Google',
                    location: locationEl?.innerText.trim() || 'Unknown',
                    link: linkEl.href,
                  }
                })
                .filter((job) => job !== null),
            SELECTORS,
          )
          .catch(() => [])

        console.log(`  [google] Found ${jobs.length} jobs on page ${pageNum}`)

        const freshJobs = []
        for (const job of jobs) {
          const cleanLink = toCanonicalLink(job.link)
          if (!cleanLink || seenLinks.has(cleanLink)) continue
          seenLinks.add(cleanLink)
          freshJobs.push({
            ...job,
            link: cleanLink,
          })
        }

        const pageJobs = await mapWithConcurrency(
          freshJobs,
          detailConcurrency,
          async (job) => {
            const detail = await (async () => {
              const detailHtml = await fetchText(job.link)
              return extractJobDetail({
                provider: 'google',
                html: detailHtml,
              })
            })().catch(() => ({
              jobDescription: null,
              minimumQualification: null,
              preferredQualification: null,
              requiredSkills: [],
              experienceRequired: null,
              department: null,
            }))

            return {
              jobId: extractJobId(job.link),
              title: job.title,
              company: job.company,
              department: detail.department,
              location: job.location,
              city: extractCity(job.location),
              country: COUNTRY_NAME,
              sourceUrl: job.link,
              applyUrl: job.link,
              link: job.link,
              source: 'google',
              jobDescription: detail.jobDescription,
              minimumQualification: detail.minimumQualification,
              preferredQualification: detail.preferredQualification,
              requiredSkills: detail.requiredSkills,
              experienceRequired: detail.experienceRequired,
              scrapedAt: now(),
            }
          },
        )

        allJobs.push(...pageJobs)

        const nextUrl = await page.evaluate(
          (selector) => document.querySelector(selector)?.href || null,
          SELECTORS.paginationNext,
        )
        if (!nextUrl || nextUrl === currentUrl) break

        currentUrl = nextUrl
        pageNum += 1
      }

      return allJobs
    } catch (err) {
      throw new Error(`[google] Scraping failed at ${currentUrl} - ${err.message}`)
    } finally {
      if (browser) await browser.close()
    }
  },
})

/**
 * Scrapes India-based job listings from Google Careers.
 * @returns {Promise<object[]>} Array of normalised job objects
 */
export const run = async (options = {}) => createGoogleScraper(options).run(options)

// Standalone: node scraper/google/script.js [--dry-run]
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Google scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)
  const cities = [...new Set(jobs.map((job) => job.city).filter(Boolean))].sort()
  console.log(`Cities found: ${cities.join(', ')}`)
  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'google')
    console.log('DB result:', result)
    process.exit(0)
  }
}
