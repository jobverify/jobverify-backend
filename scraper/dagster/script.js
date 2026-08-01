import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { DAGSTER_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

export const PROVIDER_METADATA = DAGSTER_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const GREENHOUSE_BOARD_URL = PROVIDER_METADATA.greenhouseBoardUrl

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;|&#8217;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return /<title>\s*Careers at Dagster\s*\|\s*Help Shape Data(?:'|’|&#39;|&apos;|&#x27;)s Future\s*<\/title>/i.test(page)
    && normalized.includes('Help us shape the future of data orchestration.')
    && normalized.includes('View Open Positions')
    && normalized.includes('Open Roles')
    && normalized.includes("We're not currently hiring, but check back soon!")
    && normalized.includes('Dagster Labs')
}

export const hasEmptyGreenhouseBoardSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return /<title>\s*Jobs at Dagster Labs\s*<\/title>/i.test(page)
    && normalized.includes('Current openings at Dagster Labs')
    && normalized.includes('There are no current openings.')
    && normalized.includes('Powered by Greenhouse')
    && !/\/dagsterlabs\/jobs\/\d+/i.test(page)
}

export const createDagsterScraper = () => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Verified Dagster careers page changed materially')
    }

    const greenhouseBoardHtml = await fetchText(GREENHOUSE_BOARD_URL)
    if (!hasEmptyGreenhouseBoardSignal(greenhouseBoardHtml)) {
      throw new Error('Verified Dagster Greenhouse board changed materially')
    }

    return []
  },
})

export const run = async (options = {}) => createDagsterScraper().run(options)

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
