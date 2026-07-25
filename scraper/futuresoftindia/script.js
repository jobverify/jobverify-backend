import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { FUTURESOFT_INDIA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = FUTURESOFT_INDIA_CATALOG.source
export const COMPANY = FUTURESOFT_INDIA_CATALOG.companyName
export const CAREERS_URL = FUTURESOFT_INDIA_CATALOG.companyCareerPage
export const VERIFIED_ON = FUTURESOFT_INDIA_CATALOG.verifiedOn
export const PROVIDER_METADATA = FUTURESOFT_INDIA_CATALOG

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
  const text = normalizeText(html)

  return text.includes('careers at futuresoft india')
}

export const hasVerifiedZeroRowsSignal = (html = '') => {
  const page = String(html ?? '')

  return /<tbody>\s*<\/tbody>/i.test(page)
    && !/FSI-\d+/i.test(page)
  }

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createFutureSoftIndiaScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasVerifiedCareersSignal(careersHtml)) {
      throw new Error('The verified FutureSoft India careers page no longer matches the trusted first-party surface')
    }

    if (!hasVerifiedZeroRowsSignal(careersHtml)) {
      throw new Error('The verified FutureSoft India zero-row jobs table state changed materially')
    }

    return []
  },
})

export const run = async (options = {}) => createFutureSoftIndiaScraper().run(options)

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
