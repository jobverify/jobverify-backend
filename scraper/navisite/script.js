import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { NAVISITE_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const PARENT_CAREERS_URL = PROVIDER_METADATA.parentCareersUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
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
  const normalized = normalizeWhitespace(html)
  return normalized.includes('Discover Opportunities at Navisite, Part of Accenture')
    && normalized.includes('All open positions at Navisite can be found on the Accenture Careers page')
    && normalized.includes('search “Navisite”')
  }

export const hasBlockedCareersSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('Just a moment...')
    && normalized.includes('Enable JavaScript and cookies to continue')
  }

export const createNaviSiteScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml) && !hasBlockedCareersSignal(careersHtml)) {
      throw new Error('NaviSite verified careers surface changed materially')
    }

    return []
  },
})

export const run = async (options = {}) => createNaviSiteScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
