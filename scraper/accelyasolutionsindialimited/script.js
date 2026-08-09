import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { ACCELYA_SOLUTIONS_INDIA_LIMITED_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const WORKDAY_BOARD_URL = PROVIDER_METADATA.officialWorkdayBoardUrl
export const JOBS_API_URL = PROVIDER_METADATA.jobsApiUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const INDIA_COUNTRY_FACET = 'c4f78be1a8f14da0ab49ce1162348a5e'
const PAGE_SIZE = 20
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

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

const defaultFetchJson = (url, body) => fetchJsonWithRetry(url, {
  method: 'POST',
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
    'content-type': 'application/json',
  },
  body,
  label: SOURCE,
  timeoutMs: 20000,
})

const normalizeComparableUrl = (value) => String(value ?? '').replace(/\/$/, '')

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Careers at Accelya\b/i.test(page)
    && text.includes('View all jobs')
    && text.includes('Raveena Khatri')
    && text.includes('Mumbai office')
    && page.includes('accelya.wd103.myworkdayjobs.com')
}

export const extractVerifiedWorkdayBoardUrl = (html = '') => {
  for (const match of String(html ?? '').matchAll(/href=["']([^"']+)["']/gi)) {
    const href = normalizeComparableUrl(match[1])
    if (href === normalizeComparableUrl(WORKDAY_BOARD_URL)) {
      return WORKDAY_BOARD_URL
    }
  }

  return null
}

export const buildJobsRequestBody = ({
  offset = 0,
  limit = PAGE_SIZE,
} = {}) => JSON.stringify({
  appliedFacets: {
    Location_Country: [INDIA_COUNTRY_FACET],
  },
  limit,
  offset,
  searchText: '',
})

export const isVerifiedWorkdayApiFailure = (payload = {}) =>
  ['HTTP_400', 'HTTP_500'].includes(payload?.errorCode)
  || [400, 500].includes(Number(payload?.httpStatus))

export const createAccelyaSolutionsIndiaLimitedScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Accelya Solutions India Limited verified careers surface changed materially')
    }

    const boardUrl = extractVerifiedWorkdayBoardUrl(careersHtml)
    if (normalizeComparableUrl(boardUrl) !== normalizeComparableUrl(WORKDAY_BOARD_URL)) {
      throw new Error('Accelya Solutions India Limited verified Workday handoff changed materially')
    }

    let payload
    try {
      payload = await fetchJson(JOBS_API_URL, buildJobsRequestBody())
    } catch (error) {
      if (/HTTP (?:400|500)/i.test(String(error?.message ?? ''))) {
        return []
      }
      throw error
    }

    if (isVerifiedWorkdayApiFailure(payload)) {
      return []
    }

    if (Array.isArray(payload?.jobPostings) && payload.jobPostings.length > 0) {
      throw new Error('Accelyya Solutions India Limited Workday API now returns public jobs API listings')
    }

    throw new Error('Accelyya Solutions India Limited verified Workday API failure contract changed materially')
  },
})

export const run = async (options = {}) => createAccelyaSolutionsIndiaLimitedScraper().run(options)

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
