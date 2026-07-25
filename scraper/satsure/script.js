import path from 'node:path'
import { fileURLToPath } from 'node:url'

import SATSURE_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = SATSURE_CATALOG
export const SOURCE = SATSURE_CATALOG.source
export const COMPANY = SATSURE_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = SATSURE_CATALOG.officialBrandName
export const VERIFIED_ON = SATSURE_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = SATSURE_CATALOG.verifiedSurfaceSummary
export const CAREERS_PAGE_URL = SATSURE_CATALOG.officialCareersPageUrl
export const OFFICIAL_CAREERS_HANDOFF_URL = SATSURE_CATALOG.officialCareersHandoffUrl
export const VERIFIED_SAMPLE_JOB_URL = SATSURE_CATALOG.verifiedSampleJobUrl

const PUBLIC_JOB_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bjob openings\b/i,
  /\bapply now\b/i,
  /\bview all job openings\b/i,
  /jobdetails\/\d+/i,
  /applyjob\/\d+/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#x27;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const matchesExpectedUrl = (value, expected) => {
  try {
    const actualUrl = new URL(value)
    const expectedUrl = new URL(expected)

    const normalizePath = (pathname) => pathname === '/' ? '/' : pathname.replace(/\/+$/, '')

    return actualUrl.hostname.toLowerCase() === expectedUrl.hostname.toLowerCase()
      && normalizePath(actualUrl.pathname) === normalizePath(expectedUrl.pathname)
      && actualUrl.search === expectedUrl.search
  } catch {
    return false
  }
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const pageExposesPublicJobListings = (html = '') =>
  PUBLIC_JOB_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title[^>]*>\s*SatSure Careers \| Build the Future of Earth Intelligence\s*<\/title>/i.test(page)
    && normalized.includes('Think Bold To Soar High')
    && normalized.includes("Let's Solve for Earth from Space")
    && normalized.includes('View Open Positions')
    && normalized.includes('SatSure Analytics India Pvt Ltd')
    && extractOfficialKekaHandoffUrl(page) === OFFICIAL_CAREERS_HANDOFF_URL
}

export const extractOfficialKekaHandoffUrl = (html = '') => {
  const match = String(html ?? '').match(/https:\/\/satsure\.keka\.com\/careers\/?/i)
  if (!match?.[0]) return null
  return match[0].replace(/\/$/, '')
}

export const matchesVerifiedOpaqueKekaState = ({ status, url, html } = {}) =>
  Number(status) === 200
  && matchesExpectedUrl(url, OFFICIAL_CAREERS_HANDOFF_URL)
  && !pageExposesPublicJobListings(html)

export const createSatSureScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const careersPage = await fetchPage(CAREERS_PAGE_URL)

    if (
      Number(careersPage?.status) !== 200
      || !matchesExpectedUrl(careersPage?.url, CAREERS_PAGE_URL)
      || !hasOfficialCareersSignal(careersPage?.html)
    ) {
      throw new Error('The verified SatSure careers page changed materially')
    }

    if (extractOfficialKekaHandoffUrl(careersPage?.html) !== OFFICIAL_CAREERS_HANDOFF_URL) {
      throw new Error('The verified SatSure Keka handoff changed materially')
    }

    const handoffPage = await fetchPage(OFFICIAL_CAREERS_HANDOFF_URL)

    if (pageExposesPublicJobListings(handoffPage?.html)) {
      throw new Error('The verified SatSure Keka handoff state changed materially and now appears to expose public jobs')
    }

    if (matchesVerifiedOpaqueKekaState(handoffPage)) {
      return []
    }

    throw new Error('The verified SatSure Keka handoff state changed materially')
  },
})

export const run = async (options = {}) => createSatSureScraper().run(options)

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
