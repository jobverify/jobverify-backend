import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const HOMEPAGE_URL = 'https://www.bankbazaar.com/'
export const CAREERS_PAGE_URL = 'https://www.bankbazaar.com/careers.html'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOB_LISTING_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bjob openings\b/i,
  /\bvacanc(?:y|ies)\b/i,
  /\bjob description\b/i,
  /"@type"\s*:\s*"JobPosting"/i,
  /href=["'][^"']*\/jobs?\//i,
  /boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /workdayjobs/i,
  /myworkdayjobs/i,
  /smartrecruiters/i,
]

const normalizeWhitespace = (value) => {
  const normalized = String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  return /(?:https:\/\/www\.bankbazaar\.com\/careers\.html|href=["']\/careers\.html["'])/i.test(page)
    && /<title>\s*BankBazaar\s*<\/title>/i.test(page)
    && /\b(?:join our team|careers)\b/i.test(page)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const normalizedText = normalizeWhitespace(page) || ''

  return /<title>\s*Careers at BankBazaar\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.bankbazaar\.com\/careers\.html["']/i.test(page)
    && normalizedText.includes('Careers at BankBazaar')
    && normalizedText.includes('BankBazaar')
}

export const hasPublicJobListingSignal = (html) =>
  PUBLIC_JOB_LISTING_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'bankbazaar',
  timeoutMs: 15000,
})

export const createBankBazaarScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)

    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('BankBazaar homepage no longer matches the verified official surface')
    }

    const careersHtml = await fetchText(CAREERS_PAGE_URL)

    if (!hasOfficialCareersSignal(careersHtml) || hasPublicJobListingSignal(careersHtml)) {
      throw new Error('BankBazaar careers page no longer matches the verified nonlisting careers surface')
    }

    return []
  },
})

export const run = async (options = {}) => createBankBazaarScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, 'bankbazaar')
  }
}
