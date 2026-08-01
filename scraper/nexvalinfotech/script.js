import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import NEXVAL_INFOTECH_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = NEXVAL_INFOTECH_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFICATION_URLS = [
  CAREERS_URL,
  'https://www.nexval.ai/career/',
  'https://www.nexval.ai/jobs/',
  'https://www.nexval.ai/join-us/',
  PROVIDER_METADATA.legacyCareerPageUrl,
]
export const VERIFIED_NOT_FOUND_URLS = [...VERIFICATION_URLS]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

export const hasOfficialHomepageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title[^>]*>\s*Empower Your Business with NexVal: AI for Smarter Decisions\s*<\/title>/i.test(page)
    && /linkedin\.com\/company\/nexval/i.test(page)
    && text.length > 0
}

export const hasNotFoundSignal = (html = '') =>
  /<title[^>]*>\s*Page not found - nexval\.ai: AI-First Mortgage Company\s*<\/title>/i.test(String(html ?? ''))

export const createNexvalInfotechScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Nexval Infotech verified official homepage no longer matches the trusted live domain')
    }

    for (const url of VERIFICATION_URLS) {
      const html = await fetchText(url)
      if (!hasNotFoundSignal(html)) {
        throw new Error('Nexval Infotech public jobs surface changed materially; replace the fail-closed sentinel')
      }
    }

    return []
  },
})

export const run = async (options = {}) => createNexvalInfotechScraper().run(options)

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
