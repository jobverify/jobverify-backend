import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createBrowserTextFallback } from '../../scraper-support/shared/browserTextFallback.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'cosmiccircuits'
export const COMPANY = 'Cosmic Circuits'
export const PARENT_COMPANY = 'Cadence Design Systems'
export const CAREERS_URL = 'https://www.cadence.com/en_US/home/company/life-at-cadence/careers.html'
export const WORKDAY_HANDOFF_HOST = 'cadence.wd1.myworkdayjobs.com'
export const WORKDAY_HANDOFF_URL = `https://${WORKDAY_HANDOFF_HOST}/External_Careers`

export const PROVIDER_CONFIG = {
  source: SOURCE,
  companyName: COMPANY,
  adapter: 'script',
  modulePath: '../cosmiccircuits/script.js',
  companyCareerPage: CAREERS_URL,
  atsPlatform: 'official-parent-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-parent-careers-page-handoff-monitor',
  extractionStrategy:
    'verified-cadence-careers-page+generic-parent-workday-handoff-without-brand-specific-jobs-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'cadence.com',
}

const OFFICIAL_TITLE_PATTERN = /<title[^>]*>\s*Careers\s*\|\s*Cadence\s*<\/title>/i
const OFFICIAL_MARK_PATTERN = /\bMake\s+your\s+mark\s+at\s+Cadence\b/i
const OFFICIAL_ROLE_PATTERN = /\bFind\s+Your\s+Role\s+with\s+Us\b/i
const OFFICIAL_FOOTER_PATTERN = /\bCadence\s+Design\s+Systems,\s*Inc\.?\b/i
const COSMIC_BRAND_PATTERN = /\bCosmic\s+Circuits\b/i
const WORKDAY_HANDOFF_PATTERN = /https:\/\/cadence\.wd1\.myworkdayjobs\.com\/External_Careers(?:[/?#][^"'\\s<]*)?/ig

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; JobifyCareerScraper/1.0)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const extractWorkdayHandoffUrls = (html) => {
  const matches = String(html ?? '').match(WORKDAY_HANDOFF_PATTERN) || []
  return [...new Set(matches)]
}

export const hasOfficialParentCareersSignal = (html) => {
  const page = String(html ?? '')

  return OFFICIAL_TITLE_PATTERN.test(page)
    && OFFICIAL_MARK_PATTERN.test(page)
    && OFFICIAL_ROLE_PATTERN.test(page)
    && OFFICIAL_FOOTER_PATTERN.test(page)
}

export const hasCosmicCircuitsBrandSignal = (html) =>
  COSMIC_BRAND_PATTERN.test(String(html ?? ''))

export const createCosmicCircuitsScraper = () => ({
  async run({ fetchText = defaultFetchText, fetchBrowserText } = {}) {
    const textFetcher = createBrowserTextFallback({
      fetchText,
      fetchBrowserText,
      userAgent: 'Mozilla/5.0 (compatible; JobifyCareerScraper/1.0)',
    })

    try {
      const careersHtml = await textFetcher.fetchText(CAREERS_URL)

      if (!hasOfficialParentCareersSignal(careersHtml)) {
        throw new Error('Cosmic Circuits verified Cadence parent careers surface changed')
      }

      if (extractWorkdayHandoffUrls(careersHtml).length === 0) {
        throw new Error('Cosmic Circuits verified Cadence careers handoff changed')
      }

      if (hasCosmicCircuitsBrandSignal(careersHtml)) {
        throw new Error('Cosmic Circuits brand-specific jobs surface detected on the Cadence careers page')
      }

      return []
    } finally {
      await textFetcher.close()
    }
  },
})

export const run = async (options = {}) => createCosmicCircuitsScraper().run(options)

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
