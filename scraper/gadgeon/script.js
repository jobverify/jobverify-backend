import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

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

const extractTitle = (html = '') => normalizeWhitespace(
  String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
)

const extractVisibleText = (html = '') => normalizeWhitespace(
  String(html ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const extractListingJobsFromHtml = (html = '') => {
  const jobs = []

  for (const match of String(html ?? '').matchAll(
    /<div class="border my-3 p-3 v-box">([\s\S]*?)<div class="modal fade" id="jobModal-\d+"/gi,
  )) {
    const block = match[1]
    const title = normalizeWhitespace(
      block.match(/<span class="fs-6 fw-medium caret-right">([\s\S]*?)<\/span>/i)?.[1],
    )
    const location = normalizeWhitespace(
      block.match(/<div class="col-md-3 mb-3 mb-md-0">([\s\S]*?)<\/div>/i)?.[1],
    )

    if (!title || !location) continue

    jobs.push({
      title,
      location,
      experienceRequired: null,
      department: null,
    })
  }

  return jobs
}

export const hasVerifiedCareersSurface = (pageData) => {
  const title = normalizeWhitespace(pageData?.title)
  const text = String(pageData?.text ?? '')

  return Boolean(title)
    && /gadgeon/i.test(title)
    && new RegExp(VERIFIED_PAGE_SIGNAL, 'i').test(text)
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

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  attempts: 1,
  label: SOURCE,
  timeoutMs: NAVIGATION_TIMEOUT_MS,
})

export const buildPageDataFromHtml = (html = '', url = CAREERS_PAGE_URL) => ({
  url,
  title: extractTitle(html),
  text: extractVisibleText(html) || '',
  jobs: extractListingJobsFromHtml(html),
})

export const createGadgeonScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    collectPageDataImpl,
  } = {}) {
    if (!collectPageDataImpl) {
      collectPageDataImpl = async (url) => buildPageDataFromHtml(await fetchText(url), url)
    }

    const pageData = await collectPageDataImpl(CAREERS_PAGE_URL)

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
  },
})

export const run = async (options = {}) => createGadgeonScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
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
