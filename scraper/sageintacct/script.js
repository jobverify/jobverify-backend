import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SAGE_INTACCT_CATALOG } from './catalog.js'
import { createBrowserTextFallback } from '../../scraper-support/shared/browserTextFallback.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = SAGE_INTACCT_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const PRODUCT_PAGE_URL = PROVIDER_METADATA.officialBrandSiteUrl
export const CAREERS_PAGE_URL = PROVIDER_METADATA.companyCareerPage
export const CAREER_SEARCH_URL = PROVIDER_METADATA.officialSearchPageUrl
export const LOCATIONS_URL = PROVIDER_METADATA.indiaLocationsPageUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;/gi, "'")
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const hasVerifiedProductPageSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*Sage Intacct:.*\|\s*Sage US\s*<\/title>/i.test(rawHtml)
    && normalized.includes('High-performance finance software with AI')
    && normalized.includes('Sage Intacct is the #1 finance AI software trusted by 30,000+ finance teams.')
    && normalized.includes('Discover the power of Sage')
}

export const hasVerifiedCareersHubSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*Job Vacancies\s*(?:&|&amp;)\s*Careers\s*\|\s*Sage US\s*<\/title>/i.test(rawHtml)
    && normalized.includes('Grow your future with us')
    && normalized.includes('Search for your new role.')
    && normalized.includes('See open roles')
}

export const hasVerifiedCareerSearchSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*Career Search\s*\|\s*Sage/i.test(rawHtml)
    && normalized.includes('Search open roles at Sage')
    && normalized.includes('Location')
    && normalized.includes('Department')
    && normalized.includes('Keyword search')
}

export const hasVerifiedIndiaLocationsSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*Locations\s*\|\s*Careers\s*\|\s*Sage US\s*<\/title>/i.test(rawHtml)
    && normalized.includes("Let's go places")
    && normalized.includes('Search for careers near you.')
    && normalized.includes('India')
    && normalized.includes('Bangalore')
    && normalized.includes('Mohali')
    && normalized.includes('Pune')
}

export const createSageIntacctScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    fetchBrowserText = undefined,
  } = {}) {
    const browserFallback = createBrowserTextFallback({
      fetchText,
      fetchBrowserText,
      userAgent: USER_AGENT,
    })

    try {
      const productPageHtml = await browserFallback.fetchText(PRODUCT_PAGE_URL)
      if (!hasVerifiedProductPageSignal(productPageHtml)) {
        throw new Error('Sage Intacct verified Sage Intacct product page no longer matches the known first-party surface')
      }

      const careersHubHtml = await browserFallback.fetchText(CAREERS_PAGE_URL)
      if (!hasVerifiedCareersHubSignal(careersHubHtml)) {
        throw new Error('Sage Intacct verified shared Sage careers hub no longer matches the known first-party surface')
      }

      const careerSearchHtml = await browserFallback.fetchText(CAREER_SEARCH_URL)
      if (!hasVerifiedCareerSearchSignal(careerSearchHtml)) {
        throw new Error('Sage Intacct verified Sage career search page no longer matches the known first-party surface')
      }

      const locationsHtml = await browserFallback.fetchText(LOCATIONS_URL)
      if (!hasVerifiedIndiaLocationsSignal(locationsHtml)) {
        throw new Error('Sage Intacct verified Sage India locations page no longer matches the known first-party surface')
      }
    } finally {
      await browserFallback.close()
    }

    return []
  },
})

export const run = async (options = {}) => createSageIntacctScraper().run(options)

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
