import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  createOptimizedPage as defaultCreateOptimizedPage,
  launchBrowser as defaultLaunchBrowser,
} from '../../scraper-support/utils/browser.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

import REVOLUT_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = REVOLUT_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const CAREERS_PAGE_URL = PROVIDER_METADATA.companyCareerPage
export const POSITION_URL_LOCALE = 'en-US'

const normalizeWhitespace = (value) => {
  const normalized = String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const unique = (values) => [...new Set(values.filter(Boolean))]

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

export const buildPositionDetailUrl = (jobId) =>
  `${PROVIDER_METADATA.officialCareersGlobalUrl}position/${encodeURIComponent(String(jobId ?? ''))}/`

export const extractIndiaJobs = (positions) => (Array.isArray(positions) ? positions : [])
  .map((position) => {
    const title = normalizeWhitespace(position?.text)
    const jobId = normalizeWhitespace(position?.id)
    const indiaLocations = getIndiaLocations(position?.locations)

    if (!title || !jobId || indiaLocations.length === 0) {
      return null
    }

    const sourceUrl = buildPositionDetailUrl(jobId)

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
      applyUrl: sourceUrl,
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
} = {}) => ({
  async run({
    launchBrowser = defaultLaunchBrowser,
    createOptimizedPage = defaultCreateOptimizedPage,
    now = defaultNow,
  } = {}) {
    let browser

    try {
      browser = await launchBrowser()
      const page = await createOptimizedPage(browser)

      await page.goto(CAREERS_PAGE_URL, { waitUntil: 'networkidle2' })

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

      return selectedJobs.map((job) => ({
        ...job,
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
