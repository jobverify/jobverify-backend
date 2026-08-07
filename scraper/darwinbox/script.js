import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const DEFAULT_COMPANY_NAME = 'Darwinbox'
const DEFAULT_SOURCE = 'darwinbox'
const DEFAULT_COMPANY_ID = 'main'
const DEFAULT_PAGE_SIZE = 10
const DEFAULT_ORIGIN = 'https://dbx.darwinbox.in'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&amp;/gi, '&')

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || null
}

const normalizeOrigin = (value) =>
  (normalizeWhitespace(value) || DEFAULT_ORIGIN).replace(/\/+$/g, '')

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  if (/remote/i.test(normalized)) return 'Remote'

  const parts = normalized
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  const firstPart = parts[0] || normalized
  const secondPart = parts[1] || null
  const looksLikeOfficeCode = /^[A-Z0-9]{2,5}$/.test(firstPart)

  if (looksLikeOfficeCode && secondPart && !/india/i.test(secondPart)) {
    return secondPart
  }

  return firstPart
}

const isIndiaJob = (record) => {
  const location = normalizeWhitespace(record?.locations)
  const country = normalizeWhitespace(record?.country)
  return /india/i.test(location || '') || /india/i.test(country || '')
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let browserUtilsPromise

const loadBrowserUtils = async () => {
  browserUtilsPromise ||= import('../../scraper-support/utils/browser.js')
  return browserUtilsPromise
}

export const createDarwinboxScraper = ({
  companyName = DEFAULT_COMPANY_NAME,
  source = DEFAULT_SOURCE,
  companyId = DEFAULT_COMPANY_ID,
  pageSize = DEFAULT_PAGE_SIZE,
  origin = DEFAULT_ORIGIN,
} = {}) => {
  const portalOrigin = normalizeOrigin(origin)

  const buildCareersPageUrl = (targetCompanyId = companyId) =>
    `${portalOrigin}/ms/candidatev2/${targetCompanyId}/careers/allJobs`

  const buildListingApiUrl = (targetCompanyId = companyId) =>
    `${portalOrigin}/ms/candidateapi/job/alljobs?companyId=${targetCompanyId}`

  const buildJobDetailUrl = (jobId, targetCompanyId = companyId) =>
    `${portalOrigin}/ms/candidatev2/${targetCompanyId}/careers/jobDetails/${normalizeWhitespace(jobId) || ''}`

  const extractSearchResults = (payload = {}) => (
    Array.isArray(payload?.data)
      ? payload.data
        .filter((record) => isIndiaJob(record))
        .map((record) => {
          const jobId = normalizeWhitespace(record.id)
          const location = normalizeWhitespace(record.locations)
          const jobDescription = normalizeWhitespace(record.jd)
          const experienceRequired = normalizeWhitespace(record.experience)

          if (!jobId || !location) return null

          return {
            title: normalizeWhitespace(record.title),
            company: companyName,
            department: normalizeWhitespace(record.department_name),
            location,
            city: extractCity(location),
            jobId,
            requisitionId: null,
            sourceUrl: buildJobDetailUrl(jobId),
            applyUrl: buildJobDetailUrl(jobId),
            employmentType: normalizeWhitespace(record.emp_type_name),
            experienceRequired,
            minimumQualification: null,
            preferredQualification: null,
            requiredSkills: [],
            postingDate: normalizeWhitespace(record.posted_on),
            closingDate: null,
            jobDescription,
            publicExperienceChecked: Boolean(jobDescription && !experienceRequired),
          }
        })
        .filter(Boolean)
      : []
  )

  const createBrowserListingFetcher = async () => {
    const { launchBrowser, createOptimizedPage } = await loadBrowserUtils()
    const browser = await launchBrowser()
    const page = await createOptimizedPage(browser)

    try {
      await page.goto(buildCareersPageUrl(), {
        waitUntil: 'domcontentloaded',
        timeout: Math.max(Number(config.jobListingTimeoutMs) || 0, 60000),
      })
    } catch (error) {
      if (!/Navigation timeout/i.test(String(error?.message || error))) {
        throw error
      }
    }
    await page.waitForSelector('body', { timeout: config.jobListingTimeoutMs }).catch(() => null)
    await delay(config.pageLoadDelayMs)

    const fetchListingPage = async ({ page: pageNumber }) => page.evaluate(
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
  }

  const run = async ({
    maxPages = config.maxPages,
    maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
    fetchListingPage,
  } = {}) => {
    let browserContext = null

    try {
      if (!fetchListingPage) {
        browserContext = await createBrowserListingFetcher()
        fetchListingPage = browserContext.fetchListingPage
      }

      const jobs = []
      let pageNumber = 1

      while (pageNumber <= maxPages) {
        const payload = await fetchListingPage({ page: pageNumber, pageSize, companyId })
        const results = extractSearchResults(payload)

        for (const job of results) {
          jobs.push({
            ...job,
            source,
            link: job.applyUrl || job.sourceUrl,
            scrapedAt: new Date().toISOString(),
          })

          if (maxJobs && jobs.length >= maxJobs) {
            return jobs
          }
        }

        const totalJobCount = Number.parseInt(String(payload?.job_counts ?? ''), 10)
        const hasMore = Number.isFinite(totalJobCount)
          ? pageNumber * pageSize < totalJobCount
          : Array.isArray(payload?.data) && payload.data.length === pageSize

        if (!hasMore) break
        pageNumber += 1
      }

      return jobs
    } finally {
      if (browserContext) {
        await browserContext.close()
      }
    }
  }

  return {
    buildCareersPageUrl,
    buildListingApiUrl,
    buildJobDetailUrl,
    extractSearchResults,
    run,
  }
}

const scraper = createDarwinboxScraper()

export const {
  buildCareersPageUrl,
  buildListingApiUrl,
  buildJobDetailUrl,
  extractSearchResults,
  run,
} = scraper

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Darwinbox scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)
  const cities = [...new Set(jobs.map((job) => job.city).filter(Boolean))].sort()
  console.log(`Cities found: ${cities.join(', ')}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, DEFAULT_SOURCE)
    console.log('DB result:', result)
    process.exit(0)
  }
}
