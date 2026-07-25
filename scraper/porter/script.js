import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDarwinboxScraper } from '../darwinbox/script.js'
import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

import { PORTER_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = PORTER_CATALOG.source
export const COMPANY_NAME = PORTER_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = PORTER_CATALOG.officialBrandName
export const OFFICIAL_CAREERS_URL = PORTER_CATALOG.companyCareerPage
export const OFFICIAL_CAREERS_HANDOFF_URL = PORTER_CATALOG.officialCareersHandoffUrl
export const DARWINBOX_ORIGIN = PORTER_CATALOG.darwinboxOrigin
export const DARWINBOX_COMPANY_ID = PORTER_CATALOG.darwinboxCompanyId
export const PUBLIC_PORTAL_URL =
  `${DARWINBOX_ORIGIN}/ms/candidatev2/${DARWINBOX_COMPANY_ID}/careers/allJobs`
export const VERIFIED_ON = PORTER_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PORTER_CATALOG.verifiedSurfaceSummary
export const PROVIDER_METADATA = PORTER_CATALOG

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
  const match = String(html ?? '').match(/https:\/\/porter\.darwinbox\.in\/ms\/candidate\/careers/i)
  return normalizeWhitespace(match?.[0])
}

export const hasOfficialPorterCareersSignals = (html = '') => {
  const page = String(html ?? '')
  const text = (normalizeWhitespace(page) || '').toLowerCase()
  const title = extractTitle(page) || ''

  return /porter/i.test(title)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/porter\.in\/careers["']/i.test(page)
    && text.includes('join porter')
    && text.includes('see open positions')
    && text.includes('current openings')
    && extractOfficialDarwinboxUrl(page) === OFFICIAL_CAREERS_HANDOFF_URL
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'porter-official',
  timeoutMs: 15000,
})

export const createPorterScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    maxPages = config.maxPages,
    fetchText = defaultFetchText,
    fetchListingPage,
  } = {}) {
    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)

    if (!hasOfficialPorterCareersSignals(careersHtml)) {
      throw new Error('Porter verified official careers page no longer matches the verified public surface')
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

export const run = async (options = {}) => createPorterScraper().run(options)

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
