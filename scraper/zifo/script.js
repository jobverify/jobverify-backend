import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import ZIFO_RND_SOLUTIONS_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = ZIFO_RND_SOLUTIONS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const CAREERS_URL = PROVIDER_METADATA.officialCareersPageUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return normalized.includes('careers')
    && normalized.includes('zifo india')
    && normalized.includes('assistant manager - finance, chennai')
}

export const hasNoCurrentVacanciesSignal = (html = '') =>
  /do not have any vacancies at this moment/i.test(normalizeWhitespace(html))

export const extractStaleIndiaRoleTitles = (html = '') => [...String(html ?? '').matchAll(/<li[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>\s*<\/li>/gi)]
  .map((match) => normalizeWhitespace(match[1]))
  .filter(Boolean)

export const createZifoScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (
      !hasOfficialCareersSignal(careersHtml)
      || !hasNoCurrentVacanciesSignal(careersHtml)
      || extractStaleIndiaRoleTitles(careersHtml).length === 0
    ) {
      throw new Error('The verified Zifo careers surface no longer matches the trusted no-current-vacancies contract')
    }

    return []
  },
})

export const run = async (options = {}) => createZifoScraper().run(options)

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
