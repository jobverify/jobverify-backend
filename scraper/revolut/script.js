import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  createOptimizedPage as defaultCreateOptimizedPage,
  launchBrowser as defaultLaunchBrowser,
} from '../../scraper-support/utils/browser.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { enrichJobsWithPublicExperience } from '../../scraper-support/utils/publicExperienceEnrichment.js'

import REVOLUT_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = REVOLUT_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const CAREERS_PAGE_URL = PROVIDER_METADATA.companyCareerPage
export const POSITION_URL_LOCALE = 'en-IN'
// Revolut's Cloudflare-protected detail pages intermittently fail under
// parallel browser fetches, so keep the live enrichment path serialized.
const DEFAULT_EXPERIENCE_ENRICHMENT_CONCURRENCY = 1
const DEFAULT_NAVIGATION_TIMEOUT_MS = 120000

const normalizeWhitespace = (value) => {
  const normalized = String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const unique = (values) => [...new Set(values.filter(Boolean))]

const slugifyPositionTitle = (value) => normalizeWhitespace(value)
  ?.normalize('NFKD')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .replace(/-+/g, '-')
  || null

const isIndiaLocation = (location = {}) =>
  /india/i.test(normalizeWhitespace(location.country) || '')
  || /india/i.test(normalizeWhitespace(location.name) || '')

const getIndiaLocations = (locations) => (Array.isArray(locations) ? locations : [])
  .filter((location) => isIndiaLocation(location))

const isRemoteLocation = (location = {}) =>
  /remote/i.test(normalizeWhitespace(location.type) || '')
  || /remote/i.test(normalizeWhitespace(location.name) || '')

const buildLocationLabel = (locations) => unique(
  locations.map((location) => normalizeWhitespace(location.name)),
).join(', ') || null

const getCity = (locations) => {
  const officeLocation = locations.find((location) => !isRemoteLocation(location))
  const city = normalizeWhitespace(officeLocation?.name)

  return city && !/remote/i.test(city) ? city : null
}

const getRemoteStatus = (locations) => {
  const hasRemote = locations.some((location) => isRemoteLocation(location))
  const hasOffice = locations.some((location) => !isRemoteLocation(location))

  if (hasRemote && hasOffice) return 'Hybrid'
  if (hasRemote) return 'Remote'
  return 'On-site'
}

export const hasOfficialCareersSignal = (html) => {
  const source = String(html ?? '')

  return /<title[^>]*>\s*Careers \| Revolut India\s*<\/title>/i.test(source)
    && /\bopen positions\b/i.test(source)
    && /Join the people creating a one-stop shop for financial freedom/i.test(source)
}

export const buildPositionDetailUrl = (jobId, title = null) => {
  const normalizedId = normalizeWhitespace(jobId)
  if (!normalizedId) return null

  const slug = slugifyPositionTitle(title)
  const baseUrl = `https://www.revolut.com/${POSITION_URL_LOCALE}/careers/position/`

  return slug
    ? `${baseUrl}${slug}-${encodeURIComponent(normalizedId)}/`
    : `${baseUrl}${encodeURIComponent(normalizedId)}/`
}

export const buildPositionApplyUrl = (jobId) => {
  const normalizedId = normalizeWhitespace(jobId)
  if (!normalizedId) return null

  return `https://www.revolut.com/${POSITION_URL_LOCALE}/careers/apply/${encodeURIComponent(normalizedId)}/`
}

export const extractIndiaJobs = (positions) => (Array.isArray(positions) ? positions : [])
  .map((position) => {
    const title = normalizeWhitespace(position?.text)
    const jobId = normalizeWhitespace(position?.id)
    const indiaLocations = getIndiaLocations(position?.locations)

    if (!title || !jobId || indiaLocations.length === 0) {
      return null
    }

    const sourceUrl = buildPositionDetailUrl(jobId, title)
    const applyUrl = buildPositionApplyUrl(jobId)

    if (!sourceUrl || !applyUrl) {
      return null
    }

    return {
      title,
      company: COMPANY,
      department: normalizeWhitespace(position?.team),
      location: buildLocationLabel(indiaLocations),
      city: getCity(indiaLocations),
      state: null,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: normalizeWhitespace(position?.description),
      remoteStatus: getRemoteStatus(indiaLocations),
    }
  })
  .filter(Boolean)

export const createRevolutScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now: defaultNow = () => new Date().toISOString(),
  experienceEnrichmentConcurrency = DEFAULT_EXPERIENCE_ENRICHMENT_CONCURRENCY,
  navigationTimeoutMs = DEFAULT_NAVIGATION_TIMEOUT_MS,
} = {}) => ({
  async run({
    launchBrowser = defaultLaunchBrowser,
    createOptimizedPage = defaultCreateOptimizedPage,
    fetchPublicJobText = null,
    now = defaultNow,
  } = {}) {
    let browser

    try {
      browser = await launchBrowser()
      const page = await createOptimizedPage(browser)

      await page.goto(CAREERS_PAGE_URL, {
        waitUntil: 'networkidle2',
        timeout: navigationTimeoutMs,
      })

      const careersHtml = await page.content()
      if (!hasOfficialCareersSignal(careersHtml)) {
        throw new Error('Response is not the verified official Revolut careers page')
      }

      const positions = await page.evaluate(
        () => globalThis.window?.__NEXT_DATA__?.props?.pageProps?.positions ?? null,
      )

      if (!Array.isArray(positions)) {
        throw new Error('Revolut careers page no longer exposes the verified positions payload')
      }

      const indiaJobs = extractIndiaJobs(positions)
      const selectedJobs = maxJobs ? indiaJobs.slice(0, maxJobs) : indiaJobs
      const shouldEnrichPublicDetails =
        typeof fetchPublicJobText === 'function'
        || (
          launchBrowser === defaultLaunchBrowser
          && createOptimizedPage === defaultCreateOptimizedPage
        )
      const liveBrowserFetchPublicJobText = async (url) => {
        const detailPage = await createOptimizedPage(browser)

        try {
          await detailPage.goto(url, {
            waitUntil: 'networkidle2',
            timeout: navigationTimeoutMs,
          })
          return await detailPage.content()
        } finally {
          await detailPage.close()
        }
      }
      const jobsWithPublicDetails = shouldEnrichPublicDetails
        ? await enrichJobsWithPublicExperience(selectedJobs, {
            fetchText: typeof fetchPublicJobText === 'function'
              ? fetchPublicJobText
              : liveBrowserFetchPublicJobText,
            useBrowserFallback: false,
            concurrency: Math.min(
              experienceEnrichmentConcurrency,
              Math.max(1, selectedJobs.length),
            ),
          })
        : selectedJobs

      return jobsWithPublicDetails.map((job) => ({
        ...job,
        publicExperienceChecked: job.publicExperienceChecked === true,
        source: SOURCE,
        link: job.applyUrl,
        scrapedAt: now(),
        companyCareerPage: CAREERS_PAGE_URL,
        companyDomain: PROVIDER_METADATA.companyDomain,
        atsPlatform: PROVIDER_METADATA.atsPlatform,
      }))
    } finally {
      if (browser) await browser.close()
    }
  },
})

export const run = async (options = {}) => createRevolutScraper(options).run(options)

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
