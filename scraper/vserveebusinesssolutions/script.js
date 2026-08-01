import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { VSERVE_EBUSINESS_SOLUTIONS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = VSERVE_EBUSINESS_SOLUTIONS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value = '') => String(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export const hasTrustedHomepageSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('Vserve is one of the leading providers of Supply Chain Management and E-Commerce solutions.')
    && normalized.includes('99 Wall Street #625')
    && normalized.includes('jobopenings@vservesolution.com')
    && normalized.includes('Vserve eBusiness Solutions')
  }

export const exposesPublicOpeningsSurface = (html = '') => {
  const page = String(html)
  const normalized = normalizeWhitespace(html)
  if (/jobs\.smartrecruiters|boards\.greenhouse|jobs\.lever\.co|workdayjobs|myworkdayjobs/i.test(page)) {
    return true
  }

  return /\b(current openings|open positions|search jobs|apply now|careers page|join our team)\b/i.test(normalized)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createVserveEbusinessSolutionsScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)

    if (!hasTrustedHomepageSignal(homepageHtml)) {
      throw new Error('Vserve Ebusiness Solutions verified homepage no longer matches the trusted exact-name contract')
    }

    if (exposesPublicOpeningsSurface(homepageHtml)) {
      throw new Error('Vserve Ebusiness Solutions homepage no longer matches the verified no-public-openings fail-closed contract')
    }

    return []
  },
})

export const run = async (options = {}) => createVserveEbusinessSolutionsScraper().run(options)

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
