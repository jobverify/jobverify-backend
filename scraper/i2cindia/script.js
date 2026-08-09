import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { I2C_INDIA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = I2C_INDIA_CATALOG.source
export const COMPANY = I2C_INDIA_CATALOG.companyName
export const PROVIDER_METADATA = I2C_INDIA_CATALOG
export const CAREERS_LANDING_URL = I2C_INDIA_CATALOG.officialCareersLandingUrl
export const JOBS_LIST_URL = I2C_INDIA_CATALOG.officialJobsListUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&#39;|&apos;|&#x27;|&#8217;|&rsquo;/gi, "'")
  .replace(/&#8211;|&#8212;|&ndash;|&mdash;/gi, '-')
  .replace(/&amp;|&#038;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeText = (value) => normalizeWhitespace(value).toLowerCase()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersLandingSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeText(rawHtml)

  return /careers\s*-\s*be a part of i2c\s*-\s*current openings/i.test(rawHtml)
    && normalized.includes('race ahead make your mark')
    && normalized.includes('the future won')
    && /https:\/\/careers\.i2cinc\.com\/careers\/?/i.test(rawHtml)
}

export const extractVerifiedJobsListUrl = (html) => {
  const match = String(html ?? '').match(/https:\/\/careers\.i2cinc\.com\/careers\/?/i)
  return match ? match[0] : null
}

export const hasOfficialJobsListSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeText(rawHtml)

  return /i2c recruitment portal\s*\|\s*jobs list/i.test(rawHtml)
    && normalized.includes('power your career accelerate your future')
    && normalized.includes('open positions')
    && normalized.includes('all locations')
    && normalized.includes('united states')
    && normalized.includes('pakistan')
}

export const extractLocationFacetSegment = (html) => {
  const page = String(html ?? '')
  const patterns = [
    /all locations([\s\S]*?)learn more about i2c/i,
    /all locations([\s\S]*?)<\/section>/i,
    /all locations([\s\S]*?)copyright/i,
    /all locations([\s\S]*?)<\/main>/i,
  ]

  for (const pattern of patterns) {
    const match = page.match(pattern)
    if (match?.[1]) {
      return normalizeWhitespace(match[1])
    }
  }

  return ''
}

export const hasIndiaLocationFilter = (html) => /\bindia\b/i.test(extractLocationFacetSegment(html))

export const createI2cIndiaScraper = () => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const landingHtml = await fetchText(CAREERS_LANDING_URL)
    if (!hasOfficialCareersLandingSignal(landingHtml)) {
      throw new Error('The official i2c careers landing page no longer matches the verified public surface')
    }

    const jobsListUrl = extractVerifiedJobsListUrl(landingHtml)
    if (jobsListUrl !== JOBS_LIST_URL) {
      throw new Error('The official i2c careers landing page no longer hands off to the verified public jobs list')
    }

    const jobsListHtml = await fetchText(JOBS_LIST_URL)
    if (!hasOfficialJobsListSignal(jobsListHtml)) {
      throw new Error('The official i2c jobs list no longer matches the verified public portal surface')
    }

    if (hasIndiaLocationFilter(jobsListHtml)) {
      throw new Error('The official i2c jobs list now exposes an India location filter or India jobs')
    }

    return []
  },
})

export const run = async (options = {}) => createI2cIndiaScraper().run(options)

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
