import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { INGENERO_TECHNOLOGIES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_URL = INGENERO_TECHNOLOGIES_CATALOG.companyCareerPage
export const SOURCE = INGENERO_TECHNOLOGIES_CATALOG.source

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Careers at Ingenero\s*\|\s*Engineering, AI & Energy Consulting Jobs\s*<\/title>/i.test(page)
    && normalized.includes('CV Submission Form')
    && normalized.includes('Upload CV')
    && normalized.includes('Ingenero Technologies (India) Pvt. Ltd.')
}

export const hasPublicJobListings = (html = '') =>
  /\bcurrent openings\b|\bjob openings\b|\bopen positions\b|<a[^>]*>\s*apply now\s*<\/a>|\/jobs?\//i.test(String(html ?? ''))

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createIngeneroTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Ingenero Technologies careers page no longer matches the pinned CV-submission surface')
    }

    if (hasPublicJobListings(careersHtml)) {
      throw new Error('Ingenero Technologies now exposes public job listings and requires a real scraper upgrade')
    }

    return []
  },
})

export const run = async (options = {}) => createIngeneroTechnologiesScraper().run(options)

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
