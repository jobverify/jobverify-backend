import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { SMARTQ_BOTTLE_LAB_TECHNOLOGIES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = SMARTQ_BOTTLE_LAB_TECHNOLOGIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
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

export const hasVerifiedCareersShellSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /Careers at SmartQ/i.test(page)
    && normalized.includes('Great food experiences start with great people.')
    && normalized.includes('Explore Opportunities')
    && normalized.includes('Bottle Lab Technologies Pvt Ltd')
    && page.includes(PROVIDER_METADATA.jobsBoardUrl)
}

export const pageExposesStructuredJobListings = (html = '') =>
  /careers\.thesmartq\.com\/jobs\//i.test(String(html ?? ''))

export const createSmartQBottleLabTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (pageExposesStructuredJobListings(careersHtml)) {
      throw new Error('SmartQ - Bottle Lab Technologies careers shell now exposes structured public job listings and should be promoted to a fuller scraper')
    }

    if (!hasVerifiedCareersShellSignal(careersHtml)) {
      throw new Error('SmartQ - Bottle Lab Technologies official careers shell changed materially')
    }

    return []
  },
})

export const run = async (options = {}) => createSmartQBottleLabTechnologiesScraper().run(options)

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
