import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { SOPHOS_TECHNOLOGIES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = SOPHOS_TECHNOLOGIES_CATALOG.source
export const COMPANY = SOPHOS_TECHNOLOGIES_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = SOPHOS_TECHNOLOGIES_CATALOG.officialBrandName
export const CAREERS_URL = SOPHOS_TECHNOLOGIES_CATALOG.companyCareerPage
export const VERIFIED_ON = SOPHOS_TECHNOLOGIES_CATALOG.verifiedOn
export const PROVIDER_METADATA = SOPHOS_TECHNOLOGIES_CATALOG

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeText = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase()

export const hasVerifiedCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeText(page)

  return /<title>\s*Explore Career Opportunities at Sophos\s*<\/title>/i.test(page)
    && text.includes('join the sophos team')
    && text.includes('flexible work')
    && text.includes('meaningful impact')
    && text.includes('explore our job listings')
    && text.includes('sophos india')
  }

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createSophosTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasVerifiedCareersSignal(careersHtml)) {
      throw new Error('The verified Sophos careers landing no longer matches the trusted first-party surface')
    }

    return []
  },
})

export const run = async (options = {}) => createSophosTechnologiesScraper().run(options)

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
