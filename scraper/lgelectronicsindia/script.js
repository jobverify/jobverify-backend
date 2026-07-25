import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { LG_ELECTRONICS_INDIA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = LG_ELECTRONICS_INDIA_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const LOCATIONS_PAGE_URL = PROVIDER_METADATA.companyCareerPage
export const NO_OPENINGS_MESSAGE =
  'There are no open positions at the moment. Please check other job categories.'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const hasOfficialIndiaLocationSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Jobs at LG India \| LG Global Careers\s*<\/title>/i.test(page)
    && text.includes('India')
    && text.includes('LG Electronics India')
    && text.includes('LG Job Opportunities')
}

export const hasNoOpenPositionsSignal = (html = '') =>
  normalizeWhitespace(html).includes(NO_OPENINGS_MESSAGE)

export const hasPublicJobListingSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /href=["']https:\/\/globalcareers\.lge\.com\/jobs\/[^"']+/i.test(page)
    || /\bview job\b/i.test(text)
    || /\bapply now\b/i.test(text)
}

export const createLgElectronicsIndiaScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const locationPage = await fetchPage(LOCATIONS_PAGE_URL)

    if (
      locationPage.status !== 200
      || locationPage.url !== LOCATIONS_PAGE_URL
      || !hasOfficialIndiaLocationSignal(locationPage.html)
    ) {
      throw new Error('LG Electronics India verified India location page no longer matches the known public surface')
    }

    if (hasPublicJobListingSignal(locationPage.html)) {
      throw new Error('LG Electronics India location page now appears to expose public jobs')
    }

    if (!hasNoOpenPositionsSignal(locationPage.html)) {
      throw new Error('LG Electronics India verified India location page no longer matches the known no-openings surface')
    }

    return []
  },
})

export const run = async (options = {}) => createLgElectronicsIndiaScraper().run(options)

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
