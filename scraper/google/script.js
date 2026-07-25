import path from 'path'
import { fileURLToPath } from 'url'
import { extractJobDetail } from '../detailExtractors/index.js'
import { loadConfig } from '../utils/loadConfig.js'
import { launchBrowser, createOptimizedPage } from '../utils/browser.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const COUNTRY_NAME = 'India'
const BASE_URL = `https://www.google.com/about/careers/applications/jobs/results?location=${COUNTRY_NAME}`
const GOOGLE_HOST = new URL(BASE_URL).hostname

const SELECTORS = {
  jobList: 'ul.spHGqe',
  jobItem: 'li.lLd3Je',
  jobTitle: 'h3.QJPWVe',
  jobCompany: '.RP7SMd span',
  jobLocation: '.pwO9Dc span.r0wTof',
  jobLink: 'a.WpHeLc[href]',
  nextButton: 'button[aria-label="Go to next page"]',
  paginationNext: 'a[aria-label="Go to next page"]',
}

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

/**
 * Scrapes India-based job listings from Google Careers.
 * @returns {Promise<object[]>} Array of normalised job objects
 */
export const run = async () => {
  let browser
  let currentUrl = BASE_URL

  try {
    browser = await launchBrowser()
    const page = await createOptimizedPage(browser)
    const detailPage = await createOptimizedPage(browser)
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })

    await new Promise((r) => setTimeout(r, config.pageLoadDelayMs))

    try {
      await page.waitForSelector(SELECTORS.jobList, { timeout: config.jobListingTimeoutMs })
    } catch {
      console.log('  [google] Job list not found on initial load. Attempting to continue...')
    }

    const allJobs = []
    const seenLinks = new Set()
    let hasNextPage = true
    let pageNum = 1

    while (hasNextPage && pageNum <= config.maxPages) {
      currentUrl = page.url()
      console.log(`  [google] Scraping page ${pageNum} — ${currentUrl}`)

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

      for (const job of jobs) {
        const clean = toCanonicalLink(job.link)
        if (clean && !seenLinks.has(clean)) {
          seenLinks.add(clean)
          const detail = await (async () => {
            await detailPage.goto(clean, { waitUntil: 'domcontentloaded' })
            await detailPage.waitForSelector('body', { timeout: config.jobListingTimeoutMs }).catch(() => null)
            await new Promise((r) => setTimeout(r, config.pageLoadDelayMs))
            return extractJobDetail({
              provider: 'google',
              html: await detailPage.content(),
            })
          })().catch(() => ({
            jobDescription: null,
            minimumQualification: null,
            preferredQualification: null,
            requiredSkills: [],
            experienceRequired: null,
            department: null,
          }))

          allJobs.push({
            jobId: extractJobId(clean),
            title: job.title,
            company: job.company,
            department: detail.department,
            location: job.location,
            city: extractCity(job.location),
            link: clean,
            source: 'google',
            jobDescription: detail.jobDescription,
            minimumQualification: detail.minimumQualification,
            preferredQualification: detail.preferredQualification,
            requiredSkills: detail.requiredSkills,
            experienceRequired: detail.experienceRequired,
            scrapedAt: new Date().toISOString(),
          })
        }
      }

      // --- Pagination ---
      let nextBtn = await page.$(SELECTORS.nextButton)
      if (!nextBtn) nextBtn = await page.$(SELECTORS.paginationNext)

      if (nextBtn) {
        const isDisabled = await page.evaluate(
          (el) => el.disabled || el.getAttribute('aria-disabled') === 'true',
          nextBtn,
        )
        if (!isDisabled) {
          try {
            await Promise.all([
              nextBtn.click(),
              page
                .waitForNavigation({ waitUntil: 'networkidle2', timeout: config.jobListingTimeoutMs })
                .catch(() => { }),
            ])
            await new Promise((r) => setTimeout(r, config.pageLoadDelayMs))
            pageNum++
          } catch (navError) {
            console.log(`  [google] Navigation error at ${currentUrl}:`, navError.message)
            hasNextPage = false
          }
        } else {
          console.log('  [google] Next button disabled. End of results.')
          hasNextPage = false
        }
      } else {
        console.log('  [google] No next button. End of results.')
        hasNextPage = false
      }
    }

    return allJobs
  } catch (err) {
    throw new Error(`[google] Scraping failed at ${currentUrl} — ${err.message}`)
  } finally {
    if (browser) await browser.close()
  }
}

// Standalone: node scraper/google/script.js [--dry-run]
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Google scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)
  const cities = [...new Set(jobs.map((j) => j.city).filter(Boolean))].sort()
  console.log(`Cities found: ${cities.join(', ')}`)
  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run — wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'google')
    console.log('DB result:', result)
    process.exit(0)
  }
}
