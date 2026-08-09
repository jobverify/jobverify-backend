import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDarwinboxScraper } from '../darwinbox/script.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import HDFC_SECURITIES_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = HDFC_SECURITIES_CATALOG
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const SOURCE = PROVIDER_METADATA.source
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const OFFICIAL_CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const OFFICIAL_CAREERS_HANDOFF_URL = PROVIDER_METADATA.officialCareersHandoffUrl
export const DARWINBOX_ORIGIN = PROVIDER_METADATA.darwinboxOrigin
export const DARWINBOX_COMPANY_ID = PROVIDER_METADATA.darwinboxCompanyId
export const PUBLIC_PORTAL_HOME_URL = PROVIDER_METADATA.publicPortalHomeUrl
export const PUBLIC_ALL_JOBS_URL = PROVIDER_METADATA.publicAllJobsUrl
export const LISTING_API_URL = PROVIDER_METADATA.listingApiUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const darwinboxScraper = createDarwinboxScraper({
  companyName: COMPANY_NAME,
  source: SOURCE,
  companyId: DARWINBOX_COMPANY_ID,
  origin: DARWINBOX_ORIGIN,
})

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeComparableUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return String(value ?? '').replace(/\/$/, '')
  }
}

const sameUrl = (left, right) => normalizeComparableUrl(left) === normalizeComparableUrl(right)

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined
  }

  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: createTimeoutSignal(15000),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const extractTitle = (html = '') => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1])
}

export const extractOfficialDarwinboxUrl = (html = '') => {
  for (const match of String(html ?? '').matchAll(/href=["']([^"']+)["']/gi)) {
    if (sameUrl(match[1], OFFICIAL_CAREERS_HANDOFF_URL)) {
      return OFFICIAL_CAREERS_HANDOFF_URL
    }
  }

  return null
}

export const hasOfficialHomepageSignal = (html = '') => {
  const page = String(html ?? '')

  return extractTitle(page) === 'Open Trading Account Online & Invest in Stock, MF, IPO & More with HDFC Securities'
    && /href=["']https:\/\/www\.hdfcsec\.com\/Careers["']/i.test(page)
    && />\s*Careers\s*</i.test(page)
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')

  return extractTitle(page) === 'Online Stock Market Trading and Investment in India with HDFC securities'
    && /rel=["']canonical["'][^>]*href=["']careers["']/i.test(page)
    && /For more details write us/i.test(page)
    && extractOfficialDarwinboxUrl(page) === OFFICIAL_CAREERS_HANDOFF_URL
}

export const createHdfcSecuritiesScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now: defaultNow = () => new Date().toISOString(),
} = {}) => ({
  async run({
    maxPages = config.maxPages,
    fetchPage = defaultFetchPage,
    fetchListingPage,
    now = defaultNow,
  } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (
      homepage.status !== 200
      || !sameUrl(homepage.url, HOMEPAGE_URL)
      || !hasOfficialHomepageSignal(homepage.html)
    ) {
      throw new Error('HDFC Securities verified official homepage changed materially')
    }

    const careersPage = await fetchPage(OFFICIAL_CAREERS_URL)
    if (
      careersPage.status !== 200
      || !sameUrl(careersPage.url, OFFICIAL_CAREERS_URL)
      || !hasOfficialCareersSignal(careersPage.html)
    ) {
      throw new Error('HDFC Securities verified official careers surface changed materially')
    }

    if (!sameUrl(extractOfficialDarwinboxUrl(careersPage.html), OFFICIAL_CAREERS_HANDOFF_URL)) {
      throw new Error('HDFC Securities verified Darwinbox handoff changed materially')
    }

    const jobs = await darwinboxScraper.run({
      maxPages,
      maxJobs,
      fetchListingPage,
    })
    const scrapedAt = now()

    return jobs.map((job) => ({
      ...job,
      scrapedAt,
    }))
  },
})

export const run = async (options = {}) => createHdfcSecuritiesScraper().run(options)

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
