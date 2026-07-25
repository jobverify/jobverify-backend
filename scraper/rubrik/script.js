import path from 'path'
import { fileURLToPath } from 'url'
import { extractJobDetail } from '../detailExtractors/index.js'
import { loadConfig } from '../utils/loadConfig.js'
import { launchBrowser, createOptimizedPage } from '../utils/browser.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const BASE_URL = 'https://www.rubrik.com/company/careers'
const RUBRIK_HOST = new URL(BASE_URL).hostname

const SELECTORS = {
  departmentGridItem: '.careers_departments_grid_item',
  departmentName: '.departments_grid_name',
  departmentLink: '.departments_grid__new-link',
  listingContainer: '.careers_section_listing_container',
  locationTitle: '.careers_section_listing_location_title',
  jobItem: '.careers_section_listing_job_item',
  jobTitle: '.careers_section_listing_job_item_title',
  jobAnchor: '.careers_section_listing_job_item_anchor',
}

const isIndiaLocation = (location) => /\bindia\b/i.test(location || '')

const extractCity = (location) => {
  if (!location) return null
  const loc = location.trim()
  if (/remote/i.test(loc)) return 'Remote'
  const commaParts = loc.split(',')
  if (commaParts.length > 1) return commaParts[0].trim()
  const spaceMatch = loc.match(/^(\S+)\s+India/i)
  if (spaceMatch) return spaceMatch[1].trim()
  return loc.replace(/\s*India\s*$/i, '').trim() || loc
}

const extractJobId = (link) => {
  try {
    return new URL(link).searchParams.get('reqId') ?? null
  } catch {
    return null
  }
}

const getSafeRubrikUrl = (value) => {
  try {
    const url = new URL(value, BASE_URL)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    return url.hostname === RUBRIK_HOST ? url.href : null
  } catch {
    return null
  }
}

/**
 * Scrapes all India-based job listings from Rubrik's careers page.
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

    await page.waitForSelector(SELECTORS.departmentGridItem)

    const departments = await page.$$eval(
      SELECTORS.departmentGridItem,
      (items, selectors) =>
        items
          .map((item) => ({
            name: item.querySelector(selectors.departmentName)?.innerText.trim() ?? null,
            url: item.querySelector(selectors.departmentLink)?.href ?? null,
          }))
          .filter((d) => d.name && d.url),
      SELECTORS,
    )

    const safeDepartments = departments
      .map((department) => ({
        ...department,
        url: getSafeRubrikUrl(department.url),
      }))
      .filter((department) => department.url)

    console.log(`  [rubrik] Found ${departments.length} departments: ${departments.map((d) => d.name).join(', ')}`)

    const allJobs = []
    const seenLinks = new Set()

    for (const department of safeDepartments) {
      currentUrl = department.url
      try {
        await page.goto(department.url, { waitUntil: 'domcontentloaded' })

        try {
          await page.waitForSelector(SELECTORS.listingContainer, {
            timeout: config.jobListingTimeoutMs,
          })
        } catch {
          console.log(`  [rubrik] No listings for "${department.name}" at ${department.url}. Skipping.`)
          continue
        }

        const jobs = await page.$$eval(
          SELECTORS.listingContainer,
          (containers, selectors) => {
            const deptJobs = []
            containers.forEach((container) => {
              const location =
                container.querySelector(selectors.locationTitle)?.innerText.trim() ?? 'Unknown Location'
              container.querySelectorAll(selectors.jobItem).forEach((item) => {
                const titleEl = item.querySelector(selectors.jobTitle)
                const anchorEl = item.querySelector(selectors.jobAnchor)
                if (titleEl && anchorEl) {
                  deptJobs.push({ title: titleEl.innerText.trim(), link: anchorEl.href, location })
                }
              })
            })
            return deptJobs
          },
          SELECTORS,
        )

        let deptCount = 0
        for (const job of jobs) {
          if (!isIndiaLocation(job.location)) continue
          const safeJobUrl = getSafeRubrikUrl(job.link)
          if (!safeJobUrl || seenLinks.has(safeJobUrl)) continue
          seenLinks.add(safeJobUrl)
          deptCount++
          const detail = await (async () => {
            await detailPage.goto(safeJobUrl, { waitUntil: 'domcontentloaded' })
            await detailPage.waitForSelector('body', { timeout: config.jobListingTimeoutMs }).catch(() => null)
            await new Promise((r) => setTimeout(r, config.pageLoadDelayMs))
            return extractJobDetail({
              provider: 'rubrik',
              html: await detailPage.content(),
            })
          })().catch(() => ({
            jobDescription: null,
            minimumQualification: null,
            preferredQualification: null,
            requiredSkills: [],
            experienceRequired: null,
            department: department.name,
          }))
          allJobs.push({
            jobId: extractJobId(safeJobUrl),
            title: job.title,
            company: 'Rubrik',
            department: detail.department || department.name,
            location: job.location,
            city: extractCity(job.location),
            link: safeJobUrl,
            source: 'rubrik',
            jobDescription: detail.jobDescription,
            minimumQualification: detail.minimumQualification,
            preferredQualification: detail.preferredQualification,
            requiredSkills: detail.requiredSkills,
            experienceRequired: detail.experienceRequired,
            scrapedAt: new Date().toISOString(),
          })
        }
        console.log(`  [rubrik] ${department.name}: ${deptCount} India jobs`)
      } catch (err) {
        // Include department URL so the retry log surfaces the exact failing page
        console.error(`  [rubrik] Failed scraping "${department.name}" at ${department.url}: ${err.message}`)
      }
    }

    return allJobs
  } catch (err) {
    throw new Error(`[rubrik] Scraping failed at ${currentUrl} — ${err.message}`)
  } finally {
    if (browser) await browser.close()
  }
}

// Standalone: node scraper/rubrik/script.js [--dry-run]
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Rubrik scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)
  const cities = [...new Set(jobs.map((j) => j.city).filter(Boolean))].sort()
  console.log(`Cities found: ${cities.join(', ')}`)
  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run — wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'rubrik')
    console.log('DB result:', result)
    process.exit(0)
  }
}
