import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { CAMP_SYSTEMS_INTERNATIONAL_INC_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = CAMP_SYSTEMS_INTERNATIONAL_INC_CATALOG.source
export const COMPANY = CAMP_SYSTEMS_INTERNATIONAL_INC_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = CAMP_SYSTEMS_INTERNATIONAL_INC_CATALOG.officialBrandName
export const CAREERS_URL = CAMP_SYSTEMS_INTERNATIONAL_INC_CATALOG.companyCareerPage
export const VERIFIED_ON = CAMP_SYSTEMS_INTERNATIONAL_INC_CATALOG.verifiedOn
export const PROVIDER_METADATA = CAMP_SYSTEMS_INTERNATIONAL_INC_CATALOG

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeText = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase()

export const hasVerifiedCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeText(page)

  return (/<title>\s*Careers\s*\|\s*CAMP Systems\s*<\/title>/i.test(page)
    || /<title>\s*Careers\s*<\/title>/i.test(page))
    && text.includes('careers')
    && text.includes('innovative, forward-thinkers wanted')
    && (
      text.includes('leading provider of aviation software and services')
      || text.includes('saas company delivering groundbreaking aircraft health management solutions')
    )
    && (
      text.includes('saas products power the business of aviation worldwide')
      || text.includes('market data to the business aviation industry worldwide')
    )
    && (
      text.includes('find opportunities')
      || text.includes('talented and passionate people')
    )
  }

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createCampSystemsInternationalIncScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasVerifiedCareersSignal(careersHtml)) {
      throw new Error('The verified CAMP Systems careers landing no longer matches the trusted first-party surface')
    }

    return []
  },
})

export const run = async (options = {}) => createCampSystemsInternationalIncScraper().run(options)

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
