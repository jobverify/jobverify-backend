import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createOptimizedPage, launchBrowser } from '../../scraper-support/utils/browser.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

import { DELHIVERY_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = DELHIVERY_CATALOG
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const SOURCE = PROVIDER_METADATA.source
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const OFFICIAL_CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const OFFICIAL_CAREERS_HANDOFF_URL = PROVIDER_METADATA.officialCareersHandoffUrl
export const DARWINBOX_JOBS_URL = PROVIDER_METADATA.darwinboxJobsUrl
export const PUBLIC_PORTAL_HOME_URL = PROVIDER_METADATA.publicPortalHomeUrl
export const PUBLIC_ALL_JOBS_URL = PROVIDER_METADATA.publicAllJobsUrl
export const LISTING_API_URL = PROVIDER_METADATA.listingApiUrl
export const DARWINBOX_ORIGIN = PROVIDER_METADATA.darwinboxOrigin
export const COMPANY_ID = PROVIDER_METADATA.darwinboxCompanyId
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const DEFAULT_PAGE_SIZE = 10
const DEFAULT_TIMEOUT_MS = Number.isInteger(config.jobListingTimeoutMs)
  ? config.jobListingTimeoutMs
  : 30000

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

const normalizeText = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const dedupe = (values) => [...new Set(values.filter(Boolean))]

const normalizeLink = (value) => normalizeText(value)

const normalizeLocationValue = (value) => {
  const normalized = normalizeText(value)
  if (!normalized) return null

  const parts = normalized
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length >= 4) {
    return parts.slice(1).join(', ')
  }

  return normalized
}

const locationListFromShowArray = (values = []) => values
  .map((value) => normalizeText(value))
  .filter((value) => value && (/india/i.test(value) || /remote/i.test(value)))
  .map((value) => normalizeLocationValue(value))

const extractNormalizedLocations = (record = {}) => {
  const explicitLocation = normalizeLocationValue(record.locations)

  if (explicitLocation && !/^multiple locations$/i.test(explicitLocation)) {
    return [explicitLocation]
  }

  const structuredLocations = [
    ...(Array.isArray(record.officelocations_without_area)
      ? record.officelocations_without_area.map((value) => normalizeLocationValue(value))
      : []),
    ...(Array.isArray(record.tool_tip_locations)
      ? record.tool_tip_locations.map((value) => normalizeLocationValue(value))
      : []),
    ...locationListFromShowArray(record.officelocation_show_arr_list),
  ]

  return dedupe(structuredLocations)
}

const extractCity = (location) => {
  const normalizedLocation = normalizeText(location)
  if (!normalizedLocation) return null
  if (/remote/i.test(normalizedLocation)) return 'Remote'

  const firstLocation = normalizedLocation
    .split('|')
    .map((part) => part.trim())
    .find(Boolean) || normalizedLocation

  const [city] = firstLocation
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  return city || firstLocation
}

const hasIndiaSignal = (value) => /india/i.test(normalizeText(value) || '')

const isIndiaRecord = (record = {}) => {
  if (hasIndiaSignal(record.country) || hasIndiaSignal(record.locations) || hasIndiaSignal(record.officelocation_show_arr)) {
    return true
  }

  return extractNormalizedLocations(record).some((location) => /india/i.test(location))
}

const buildLinkMap = (surface = {}) => new Map(
  (Array.isArray(surface.links) ? surface.links : [])
    .map((link) => [normalizeText(link?.text), normalizeLink(link?.href)])
    .filter(([text, href]) => text && href),
)

const captureRenderedSurface = async ({ url, waitForTextPattern }) => {
  const browser = await launchBrowser()

  try {
    const page = await createOptimizedPage(browser)
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    })

    if (waitForTextPattern) {
      await page.waitForFunction(
        (source, flags) => new RegExp(source, flags).test(document.body.innerText || ''),
        { timeout: DEFAULT_TIMEOUT_MS },
        waitForTextPattern.source,
        waitForTextPattern.flags,
      ).catch(() => null)
    }

    const title = await page.title()
    const text = await page.evaluate(() => document.body.innerText || '')
    const links = await page.$$eval(
      'a',
      (elements) => elements
        .map((element) => ({
          text: (element.textContent || '').trim(),
          href: element.href,
        }))
        .filter((item) => item.text || item.href),
    )

    return {
      url: page.url(),
      title,
      text,
      links,
    }
  } finally {
    await browser.close()
  }
}

const createBrowserListingContext = async ({ pageSize = DEFAULT_PAGE_SIZE } = {}) => {
  const browser = await launchBrowser()
  const page = await createOptimizedPage(browser)

  await page.goto(DARWINBOX_JOBS_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  })

  await page.waitForFunction(
    () => /open jobs/i.test(document.body.innerText || ''),
    { timeout: DEFAULT_TIMEOUT_MS },
  ).catch(() => null)

  const surface = {
    url: page.url(),
    title: await page.title(),
    text: await page.evaluate(() => document.body.innerText || ''),
    links: await page.$$eval(
      'a',
      (elements) => elements
        .map((element) => ({
          text: (element.textContent || '').trim(),
          href: element.href,
        }))
        .filter((item) => item.text || item.href),
    ),
  }

  const fetchListingPage = async ({ page: pageNumber, pageSize: requestedPageSize = pageSize }) => page.evaluate(
    async ({ companyId, targetPage, targetPageSize }) => {
      const response = await fetch(`/ms/candidateapi/job/alljobs?companyId=${companyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
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
      companyId: COMPANY_ID,
      targetPage: pageNumber,
      targetPageSize: requestedPageSize,
    },
  )

  return {
    surface,
    fetchListingPage,
    close: async () => browser.close(),
  }
}

export const buildJobDetailUrl = (jobId) =>
  `${DARWINBOX_ORIGIN}/ms/candidatev2/${COMPANY_ID}/careers/jobDetails/${normalizeText(jobId) || ''}`

export const transformDelhiveryJob = (record = {}) => {
  if (!isIndiaRecord(record)) return null

  const jobId = normalizeText(record.id)
  const locationParts = extractNormalizedLocations(record)
  const location = locationParts.length > 0 ? locationParts.join(' | ') : null

  if (!jobId || !location) return null

  return {
    title: normalizeText(record.title) || normalizeText(record.designation_name),
    company: COMPANY_NAME,
    department: normalizeText(record.department_name),
    location,
    city: extractCity(location),
    jobId,
    requisitionId: normalizeText(record.internal_job_code) || null,
    sourceUrl: buildJobDetailUrl(jobId),
    applyUrl: buildJobDetailUrl(jobId),
    employmentType: normalizeText(record.emp_type_name),
    experienceRequired: normalizeText(record.experience),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: normalizeText(record.posted_on),
    closingDate: null,
    jobDescription: normalizeText(record.jd),
  }
}

export const extractSearchResults = (payload = {}) =>
  Array.isArray(payload?.data)
    ? payload.data
      .map((record) => transformDelhiveryJob(record))
      .filter(Boolean)
    : []

export const hasOfficialDelhiveryCareersSignals = (surface = {}) => {
  const title = normalizeText(surface.title)
  const text = normalizeText(surface.text) || ''
  const linkMap = buildLinkMap(surface)

  return title === "Build Your Career with Delhivery – Join India's Leading Logistics Innovator"
    && text.includes('Build a career at Delhivery')
    && text.includes('Jobs at Delhivery')
    && linkMap.get('Jobs at Delhivery') === OFFICIAL_CAREERS_HANDOFF_URL
    && linkMap.get('Corporate Jobs') === OFFICIAL_CAREERS_HANDOFF_URL
}

export const hasPublicDarwinboxHomeSignal = (surface = {}) => {
  const title = normalizeText(surface.title)
  const text = normalizeText(surface.text) || ''
  const links = Array.isArray(surface.links) ? surface.links : []

  return title === OFFICIAL_BRAND_NAME
    && text.includes('Thank you for choosing us for your next chapter!')
    && /We Have\s+\d+\s+Open Jobs/i.test(text)
    && text.includes('Powered by: darwinbox')
    && links.some((link) => normalizeLink(link?.href) === PUBLIC_ALL_JOBS_URL)
}

export const createDelhiveryScraper = ({
  now = () => new Date().toISOString(),
  pageSize = DEFAULT_PAGE_SIZE,
} = {}) => ({
  async run({
    maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY,
    maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
    getOfficialCareersSurface = () => captureRenderedSurface({
      url: OFFICIAL_CAREERS_URL,
      waitForTextPattern: /Jobs at Delhivery/i,
    }),
    getBrowserListingContext = () => createBrowserListingContext({ pageSize }),
  } = {}) {
    const officialSurface = await getOfficialCareersSurface()
    if (!hasOfficialDelhiveryCareersSignals(officialSurface)) {
      throw new Error('Delhivery verified official careers page no longer matches the verified public surface')
    }

    const browserListingContext = await getBrowserListingContext()

    try {
      if (!hasPublicDarwinboxHomeSignal(browserListingContext.surface)) {
        throw new Error('Delhivery verified public Darwinbox home surface no longer matches the verified public surface')
      }

      const jobs = []
      let pageNumber = 1

      while (pageNumber <= maxPages) {
        const payload = await browserListingContext.fetchListingPage({
          page: pageNumber,
          pageSize,
          companyId: COMPANY_ID,
        })

        const results = extractSearchResults(payload)

        for (const job of results) {
          jobs.push({
            ...job,
            source: SOURCE,
            link: job.applyUrl || job.sourceUrl,
            scrapedAt: now(),
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
      await browserListingContext.close()
    }
  },
})

export const run = async (options = {}) => createDelhiveryScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
