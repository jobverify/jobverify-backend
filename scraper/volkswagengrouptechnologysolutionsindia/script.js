import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'volkswagengrouptechnologysolutionsindia'
export const COMPANY = 'Volkswagen Group Technology Solutions India'
export const CAREERS_URL = 'https://www.vwg-digitalsolutions.in/'
export const BOARD_URL =
  'https://career10.successfactors.com/career?company=volkswag04&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH&'
export const VERIFIED_ON = '2026-07-25'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export const hasOfficialSiteSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return /Volkswagen Group Digital Solutions/i.test(normalized)
    && /Careers/i.test(normalized)
}

export const hasNoOpeningsSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return /Career Opportunities/i.test(normalized)
    && /No jobs match(?:ed)? your selections/i.test(normalized)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  redirect: 'follow',
  label: SOURCE,
  timeoutMs: 15000,
})

export const createVolkswagenGroupTechnologySolutionsIndiaScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const officialSiteHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialSiteSignal(officialSiteHtml)) {
      throw new Error('The Volkswagen Group Digital Solutions India first-party surface no longer matches the verified site signal')
    }

    const boardHtml = await fetchText(BOARD_URL)
    if (!hasNoOpeningsSignal(boardHtml)) {
      throw new Error('The Volkswagen SuccessFactors board no longer matches the verified no-openings contract')
    }

    return []
  },
})

export const run = (options = {}) =>
  createVolkswagenGroupTechnologySolutionsIndiaScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()
  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
