import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDarwinboxScraper } from '../darwinbox/script.js'
import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

import { IIFL_FINANCE_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const COMPANY_NAME = IIFL_FINANCE_CATALOG.companyName
export const SOURCE = IIFL_FINANCE_CATALOG.source
export const DARWINBOX_COMPANY_ID = IIFL_FINANCE_CATALOG.darwinboxCompanyId
export const DARWINBOX_ORIGIN = IIFL_FINANCE_CATALOG.darwinboxOrigin
export const OFFICIAL_CAREERS_URL = IIFL_FINANCE_CATALOG.companyCareerPage
export const OFFICIAL_CAREERS_HANDOFF_URL = IIFL_FINANCE_CATALOG.officialCareersHandoffUrl
export const OFFICIAL_RESUME_SUBMISSION_URL =
  IIFL_FINANCE_CATALOG.officialResumeSubmissionUrl
export const PUBLIC_PORTAL_URL = IIFL_FINANCE_CATALOG.publicPortalUrl
export const LISTING_API_URL = IIFL_FINANCE_CATALOG.darwinboxListingApiUrl
export const VERIFIED_ON = IIFL_FINANCE_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = IIFL_FINANCE_CATALOG.verifiedSurfaceSummary
export const PROVIDER_METADATA = IIFL_FINANCE_CATALOG

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
    /href=["'](https:\/\/iifl\.darwinbox\.in\/ms\/candidate\/careers)["']/i,
  )
  return normalizeWhitespace(match?.[1])
}

export const extractUploadResumeUrl = (html = '') => {
  const match = String(html ?? '').match(
    /href=["'](https:\/\/iifl\.darwinbox\.in\/ms\/candidate\/careers\/others\?apply=1)["']/i,
  )
  return normalizeWhitespace(match?.[1])
}

export const hasOfficialIiflCareersSignals = (html = '') => {
  const page = String(html ?? '')
  const text = (normalizeWhitespace(page) || '').toLowerCase()

  return extractTitle(page) === 'Careers with IIFL - Leading Finance Company | IIFL Finance'
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.iifl\.com\/finance\/career["']/i.test(page)
    && text.includes('find your next great career')
    && text.includes('find jobs')
    && text.includes('upload resume')
    && extractOfficialDarwinboxUrl(page) === OFFICIAL_CAREERS_HANDOFF_URL
    && extractUploadResumeUrl(page) === OFFICIAL_RESUME_SUBMISSION_URL
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createIiflFinanceScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    maxPages = config.maxPages,
    fetchText = defaultFetchText,
    fetchListingPage,
  } = {}) {
    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)

    if (!hasOfficialIiflCareersSignals(careersHtml)) {
      throw new Error('IIFL Finance verified official careers page no longer matches the verified public surface')
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

export const run = async (options = {}) => createIiflFinanceScraper().run(options)

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
