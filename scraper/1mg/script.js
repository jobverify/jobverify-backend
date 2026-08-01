import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDarwinboxScraper } from '../darwinbox/script.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

import { ONE_MG_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const COMPANY_NAME = ONE_MG_CATALOG.companyName
export const SOURCE = ONE_MG_CATALOG.source
export const DARWINBOX_COMPANY_ID = ONE_MG_CATALOG.darwinboxCompanyId
export const DARWINBOX_ORIGIN = ONE_MG_CATALOG.darwinboxOrigin
export const OFFICIAL_CAREERS_URL = ONE_MG_CATALOG.companyCareerPage
export const OFFICIAL_CAREERS_HANDOFF_URL = ONE_MG_CATALOG.officialCareersHandoffUrl
export const PUBLIC_PORTAL_URL =
  `${DARWINBOX_ORIGIN}/ms/candidatev2/${DARWINBOX_COMPANY_ID}/careers/allJobs`
export const VERIFIED_ON = ONE_MG_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = ONE_MG_CATALOG.verifiedSurfaceSummary
export const PROVIDER_METADATA = ONE_MG_CATALOG

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
  const match = String(html ?? '').match(/https:\/\/1mg\.darwinbox\.in\/jobs/i)
  return normalizeWhitespace(match?.[0])
}

export const hasOfficialOneMgCareersSignals = (html = '') => {
  const page = String(html ?? '')
  const text = (normalizeWhitespace(page) || '').toLowerCase()

  return extractTitle(page) === 'Careers@Tata1mg'
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.1mg\.com\/jobs["']/i.test(page)
    && text.includes('make your mark in healthcare.')
    && text.includes('we are a team of 4000+ folks')
    && text.includes('explore jobs')
    && extractOfficialDarwinboxUrl(page) === OFFICIAL_CAREERS_HANDOFF_URL
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: '1mg-official',
  timeoutMs: 15000,
})

export const createOneMgScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    maxPages = config.maxPages,
    fetchText = defaultFetchText,
    fetchListingPage,
  } = {}) {
    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)

    if (!hasOfficialOneMgCareersSignals(careersHtml)) {
      throw new Error('1mg verified official careers page no longer matches the verified public surface')
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

export const run = async (options = {}) => createOneMgScraper().run(options)

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
