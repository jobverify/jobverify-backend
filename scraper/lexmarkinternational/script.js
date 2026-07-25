import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { LEXMARK_INTERNATIONAL_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const OFFICIAL_CAREERS_URL = PROVIDER_METADATA.officialCareersPageUrl
export const WORKDAY_BASE_URL = PROVIDER_METADATA.officialWorkdayBoardUrl
export const WORKDAY_OUTAGE_URL = PROVIDER_METADATA.workdayOutageCanonicalUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const isVerifiedWorkdayHandoffUrl = (value) => {
  try {
    const url = new URL(value)
    return url.origin === 'https://lexmark.wd1.myworkdayjobs.com'
      && url.pathname.replace(/\/+$/, '') === '/Lexmark'
  } catch {
    return false
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return normalized.includes('Search all jobs')
    && page.includes(WORKDAY_BASE_URL)
  }

export const extractVerifiedWorkdayHandoffUrl = (html = '') => {
  for (const match of String(html ?? '').matchAll(/href=["']([^"']+)["']/gi)) {
    if (isVerifiedWorkdayHandoffUrl(match[1])) {
      return new URL(match[1]).toString()
    }
  }

  return null
}

export const hasPublicJobsSignal = (html = '') => /myworkdayjobs\.com\/[^"']+\/job\//i.test(String(html ?? ''))
  || /data-automation-id=["']jobPosting/i.test(String(html ?? ''))
  || /Browse Jobs|Search Jobs/i.test(String(html ?? ''))

export const hasWorkdayOutageSignal = (html = '') => {
  const page = String(html ?? '')

  return page.includes(WORKDAY_OUTAGE_URL)
    && /Workday is not available/i.test(page)
}

export const createLexmarkInternationalScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Lexmark International verified first-party careers page no longer matches the trusted surface')
    }

    const verifiedWorkdayHandoffUrl = extractVerifiedWorkdayHandoffUrl(careersHtml)
    if (verifiedWorkdayHandoffUrl !== WORKDAY_BASE_URL) {
      throw new Error('Lexmark International verified Workday handoff changed; refusing to guess the public jobs source')
    }

    const workdayHtml = await fetchText(WORKDAY_BASE_URL)

    if (hasPublicJobsSignal(workdayHtml)) {
      throw new Error('Lexmark International Workday surface now appears to expose public jobs')
    }

    if (!hasWorkdayOutageSignal(workdayHtml)) {
      throw new Error('Lexmark International verified Workday outage sentinel no longer matches the trusted surface')
    }

    return []
  },
})

export const run = async (options = {}) => createLexmarkInternationalScraper().run(options)

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
