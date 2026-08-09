import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { SOLERA_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = PROVIDER_METADATA.source
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const WORKDAY_TENANT_URL = PROVIDER_METADATA.workdayTenantUrl
export { PROVIDER_METADATA }

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('Revving Up For Growth')
    && normalized.includes('Ready to take things to the next level? Start your journey here.')
}

export const hasWorkdayHandoffSignal = (html = '') =>
  String(html ?? '').includes(WORKDAY_TENANT_URL)
    && /See Open Positions/i.test(String(html ?? ''))

export const hasInlineJobCards = (html = '') =>
  /job card|job opening|current openings|view job|apply now|job-search-results|opening-title/i
    .test(normalizeWhitespace(html))

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createSoleraScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Solera careers page no longer matches the verified first-party contract')
    }

    if (!hasWorkdayHandoffSignal(careersHtml)) {
      throw new Error('Solera Workday handoff is missing from the verified first-party careers page')
    }

    if (hasInlineJobCards(careersHtml)) {
      throw new Error('Solera first-party careers page now exposes inline job cards or a trustworthy public inventory')
    }

    return []
  },
})

export const run = async (options = {}) => createSoleraScraper().run(options)

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
