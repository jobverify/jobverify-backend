import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import MODEL_N_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = MODEL_N_CATALOG.source
export const COMPANY = MODEL_N_CATALOG.companyName
export const CAREERS_URL = MODEL_N_CATALOG.companyCareerPage

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobverify scraper)'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchPage = async (url) => {
  const html = await fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    label: SOURCE,
    timeoutMs: 15000,
  })

  return {
    status: 200,
    url,
    html,
  }
}

export const hasOfficialCareersSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title[^>]*>\s*Careers\s*\|\s*Model N\s*<\/title>/i.test(rawHtml)
    && normalized.includes('Open Positions')
    && normalized.includes('Filter by location')
    && normalized.includes('Clear all')
  }

export const hasNoResultsSignal = (html = '') =>
  /\bNo results\b/i.test(normalizeWhitespace(html))

export const createModelNScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const page = await fetchPage(CAREERS_URL)

    if (
      Number(page?.status) !== 200
      || !hasOfficialCareersSignal(page.html)
      || !hasNoResultsSignal(page.html)
    ) {
      throw new Error('Model N verified empty careers state changed; review the scraper')
    }

    return []
  },
})

export const run = async (options = {}) => createModelNScraper().run(options)

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
