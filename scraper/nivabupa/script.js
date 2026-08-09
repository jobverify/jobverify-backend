import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDarwinboxScraper } from '../darwinbox/script.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

import { NIVABUPA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const COMPANY_NAME = NIVABUPA_CATALOG.companyName
export const SOURCE = NIVABUPA_CATALOG.source
export const OFFICIAL_BRAND_NAME = NIVABUPA_CATALOG.officialBrandName
export const DARWINBOX_COMPANY_ID = NIVABUPA_CATALOG.darwinboxCompanyId
export const DARWINBOX_ORIGIN = NIVABUPA_CATALOG.darwinboxOrigin
export const OFFICIAL_CAREERS_URL = NIVABUPA_CATALOG.companyCareerPage
export const OFFICIAL_CAREERS_HANDOFF_URL = NIVABUPA_CATALOG.officialCareersHandoffUrl
export const PUBLIC_ALL_JOBS_URL = NIVABUPA_CATALOG.publicAllJobsUrl
export const VERIFIED_ON = NIVABUPA_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = NIVABUPA_CATALOG.verifiedSurfaceSummary
export const PROVIDER_METADATA = NIVABUPA_CATALOG

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobverify scraper)'

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
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
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

export const extractMetaDescription = (html = '') => {
  const match = String(html ?? '').match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i,
  )
  return normalizeWhitespace(match?.[1])
}

export const extractOfficialDarwinboxUrl = (html = '') => {
  const match = String(html ?? '').match(/https:\/\/disha\.darwinbox\.in\/ms\/candidate\/careers/i)
  return normalizeWhitespace(match?.[0])
}

export const extractLegacyTalentRecruitUrl = (html = '') => {
  const match = String(html ?? '').match(/https:\/\/nivabupa\.talentrecruit\.com\/career-page/i)
  return normalizeWhitespace(match?.[0])
}

export const hasOfficialNivaBupaCareersSignals = (html = '') => {
  const page = String(html ?? '')
  const text = (normalizeWhitespace(page) || '').toLowerCase()
  const metaDescription = (extractMetaDescription(page) || '').toLowerCase()

  return extractTitle(page) === 'Niva Bupa Careers'
    && (
      text.includes('careers with niva bupa')
      || metaDescription === 'careers with niva bupa'
    )
    && text.includes('message from our ceo')
    && text.includes('employee recognition')
    && extractOfficialDarwinboxUrl(page) === OFFICIAL_CAREERS_HANDOFF_URL
    && extractLegacyTalentRecruitUrl(page) === 'https://nivabupa.talentrecruit.com/career-page'
  }

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'nivabupa-official',
  timeoutMs: 15000,
})

export const createNivaBupaScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    maxPages = config.maxPages,
    fetchText = defaultFetchText,
    fetchListingPage,
  } = {}) {
    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)

    if (!hasOfficialNivaBupaCareersSignals(careersHtml)) {
      throw new Error('Niva Bupa verified official careers page no longer matches the verified public surface')
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

export const run = async (options = {}) => createNivaBupaScraper().run(options)

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
