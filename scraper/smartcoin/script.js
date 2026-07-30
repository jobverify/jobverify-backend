import path from 'node:path'
import { fileURLToPath } from 'node:url'

import SMARTCOIN_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOB_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bjob openings\b/i,
  /\bapply now\b/i,
  /jobdetails\/\d+/i,
  /applyjob\/\d+/i,
]

export const PROVIDER_METADATA = SMARTCOIN_CATALOG
export const SOURCE = SMARTCOIN_CATALOG.source
export const COMPANY = SMARTCOIN_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = SMARTCOIN_CATALOG.officialBrandName
export const VERIFIED_ON = SMARTCOIN_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = SMARTCOIN_CATALOG.verifiedSurfaceSummary
export const CAREERS_PAGE_URL = SMARTCOIN_CATALOG.officialCareersPageUrl
export const OFFICIAL_CAREERS_HANDOFF_URL = SMARTCOIN_CATALOG.officialCareersHandoffUrl

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

export const extractOfficialKekaHandoffUrl = (html = '') => {
  const match = String(html ?? '').match(/https:\/\/smartcoin\.keka\.com\/careers\/?/i)
  if (!match?.[0]) return null
  return match[0].replace(/\/$/, '')
}

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('Our Journey From a Lending App to a Financial Management Partner')
    && normalized.includes('SmartCoin Financials Pvt. Ltd.')
    && normalized.includes('help@smartcoin.co.in')
    && extractOfficialKekaHandoffUrl(html) === OFFICIAL_CAREERS_HANDOFF_URL
}

const hasLegacyOpaqueKekaShellSignal = (html = '') =>
  /<title[^>]*>\s*careers\s*<\/title>/i.test(String(html ?? ''))

const hasBootstrapOpaqueKekaShellSignal = (html = '') => {
  const page = String(html ?? '')

  return /window\.isCareersPage\s*=\s*true/i.test(page)
    && /<meta[^>]+name=["']robots["'][^>]+content=["']noindex["']/i.test(page)
    && /id=["']content-container["']/i.test(page)
    && /careerportal\/[a-z0-9-]+\.html/i.test(page)
}

export const matchesVerifiedOpaqueKekaState = ({ status, url, html } = {}) =>
  Number(status) === 200
  && matchesExpectedUrl(url, OFFICIAL_CAREERS_HANDOFF_URL)
  && (
    hasLegacyOpaqueKekaShellSignal(html)
    || hasBootstrapOpaqueKekaShellSignal(html)
  )
  && !pageExposesPublicJobListings(html)

export const createSmartCoinScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const careersPage = await fetchPage(CAREERS_PAGE_URL)

    if (
      Number(careersPage?.status) !== 200
      || !matchesExpectedUrl(careersPage?.url, CAREERS_PAGE_URL)
      || !hasOfficialCareersSignal(careersPage?.html)
    ) {
      throw new Error('The verified SmartCoin/Olyv About page changed materially')
    }

    if (extractOfficialKekaHandoffUrl(careersPage?.html) !== OFFICIAL_CAREERS_HANDOFF_URL) {
      throw new Error('The verified SmartCoin Keka handoff changed materially')
    }

    const handoffPage = await fetchPage(OFFICIAL_CAREERS_HANDOFF_URL)

    if (pageExposesPublicJobListings(handoffPage?.html)) {
      throw new Error(
        'The verified SmartCoin Keka handoff state changed materially and now appears to expose public jobs',
      )
    }

    if (matchesVerifiedOpaqueKekaState(handoffPage)) {
      return []
    }

    throw new Error('The verified SmartCoin Keka handoff state changed materially')
  },
})

export const run = async (options = {}) => createSmartCoinScraper(options).run(options)

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
