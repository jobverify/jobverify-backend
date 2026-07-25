import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import ACCUBITS_TECHNOLOGIES_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = ACCUBITS_TECHNOLOGIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const OFFICIAL_CAREERS_URL = PROVIDER_METADATA.officialCareersPageUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialAccubitsCareersSignals = (html = '') => {
  const page = String(html ?? '')

  return /Career Archive/i.test(page)
    && /View Job Openings/i.test(page)
    && /Latest Jobs/i.test(page)
    && /Role/i.test(page)
    && /Location/i.test(page)
    && /Date of Posting/i.test(page)
    && /ROLE YOU ARE APPLYING FOR/i.test(page)
}

export const pageExposesStructuredJobListings = (html = '') =>
  /\bjob-card\b/i.test(String(html ?? ''))
  || /<a[^>]+href=["'][^"']*career\/[^"']+["'][^>]*>\s*Apply now\s*<\/a>/i.test(String(html ?? ''))

export const createAccubitsTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)

    if (!hasOfficialAccubitsCareersSignals(careersHtml)) {
      throw new Error('Accubits Technologies official careers shell changed; refusing to assume no public listings')
    }

    if (pageExposesStructuredJobListings(careersHtml)) {
      throw new Error('Accubits Technologies careers shell now exposes structured public job listings and needs a dedicated scraper')
    }

    return []
  },
})

export const run = async (options = {}) => createAccubitsTechnologiesScraper().run(options)

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
