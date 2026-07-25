import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDarwinboxScraper } from '../darwinbox/script.js'
import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

import { MAHINDRA_LOGISTICS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const COMPANY_NAME = MAHINDRA_LOGISTICS_CATALOG.companyName
export const SOURCE = MAHINDRA_LOGISTICS_CATALOG.source
export const DARWINBOX_COMPANY_ID = MAHINDRA_LOGISTICS_CATALOG.darwinboxCompanyId
export const DARWINBOX_ORIGIN = MAHINDRA_LOGISTICS_CATALOG.darwinboxOrigin
export const OFFICIAL_CAREERS_URL = MAHINDRA_LOGISTICS_CATALOG.companyCareerPage
export const OFFICIAL_CAREERS_HANDOFF_URL =
  MAHINDRA_LOGISTICS_CATALOG.officialCareersHandoffUrl
export const PUBLIC_PORTAL_URL = MAHINDRA_LOGISTICS_CATALOG.publicPortalUrl
export const LISTING_API_URL = MAHINDRA_LOGISTICS_CATALOG.darwinboxListingApiUrl
export const VERIFIED_ON = MAHINDRA_LOGISTICS_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = MAHINDRA_LOGISTICS_CATALOG.verifiedSurfaceSummary
export const PROVIDER_METADATA = MAHINDRA_LOGISTICS_CATALOG

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

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

const extractTitle = (html) => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1])
}

export const extractOfficialDarwinboxUrl = (html = '') => {
  const match = String(html ?? '').match(
    /href=["'](https:\/\/nectar\.darwinbox\.in\/ms\/candidate\/careers)["']/i,
  )
  return normalizeWhitespace(match?.[1])
}

export const hasOfficialMahindraLogisticsCareersSignals = (html = '') => {
  const page = String(html ?? '')
  const text = (normalizeWhitespace(page) || '').toLowerCase()

  return extractTitle(page) === 'Work With Us - Mahindra Logistics'
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/mahindralogistics\.com\/work-with-us\/["']/i.test(page)
    && text.includes('igniting mutual success & growth')
    && text.includes('join our ignited minds')
    && text.includes('explore opportunities')
    && extractOfficialDarwinboxUrl(page) === OFFICIAL_CAREERS_HANDOFF_URL
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createMahindraLogisticsScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    maxPages = config.maxPages,
    fetchText = defaultFetchText,
    fetchListingPage,
  } = {}) {
    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)

    if (!hasOfficialMahindraLogisticsCareersSignals(careersHtml)) {
      throw new Error('Mahindra Logistics verified official careers page no longer matches the verified public surface')
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

export const {
  buildCareersPageUrl,
  buildListingApiUrl,
  buildJobDetailUrl,
  extractSearchResults,
} = darwinboxScraper

export const run = async (options = {}) => createMahindraLogisticsScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
