import path from 'node:path'
import { fileURLToPath } from 'node:url'

import SUKI_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const FETCH_TIMEOUT_MS = 15000

const PUBLIC_JOB_PATTERNS = [
  /\bopen positions @ suki\b/i,
  /\bapply\b/i,
  /gh_jid=\d+/i,
  /weekdayJdUid=/i,
]

export const PROVIDER_METADATA = SUKI_CATALOG
export const SOURCE = SUKI_CATALOG.source
export const COMPANY = SUKI_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = SUKI_CATALOG.officialBrandName
export const VERIFIED_ON = SUKI_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = SUKI_CATALOG.verifiedSurfaceSummary
export const CAREERS_PAGE_URL = SUKI_CATALOG.officialCareersPageUrl
export const OFFICIAL_CAREERS_HANDOFF_URL = SUKI_CATALOG.officialCareersHandoffUrl

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
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const extractOpenPositionsHandoffUrl = (html = '') => {
  const match = String(html ?? '').match(/https:\/\/www\.suki\.ai\/open-positions\/?/i)
  if (!match?.[0]) return null
  return match[0].endsWith('/') ? match[0] : `${match[0]}/`
}

export const pageExposesPublicJobListings = (html = '') =>
  PUBLIC_JOB_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('Help shape the future of healthcare with AI')
    && normalized.includes('Join the Team')
    && normalized.includes('Level-up your career by applying to opportunities at Suki.')
    && normalized.includes('Suki AI, Inc.')
    && extractOpenPositionsHandoffUrl(html) === OFFICIAL_CAREERS_HANDOFF_URL
}

export const matchesVerifiedOpaqueOpenPositionsState = ({ status, url, html } = {}) => {
  const normalized = normalizeWhitespace(html)

  return Number(status) === 200
    && matchesExpectedUrl(url, OFFICIAL_CAREERS_HANDOFF_URL)
    && normalized.includes('Current Openings')
    && normalized.includes('About Us')
    && normalized.includes('Careers')
    && !pageExposesPublicJobListings(html)
}

export const createSukiScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const careersPage = await fetchPage(CAREERS_PAGE_URL)

    if (
      Number(careersPage?.status) !== 200
      || !matchesExpectedUrl(careersPage?.url, CAREERS_PAGE_URL)
      || !hasOfficialCareersSignal(careersPage?.html)
    ) {
      throw new Error('The verified Suki careers page changed materially')
    }

    if (extractOpenPositionsHandoffUrl(careersPage?.html) !== OFFICIAL_CAREERS_HANDOFF_URL) {
      throw new Error('The verified Suki open positions handoff changed materially')
    }

    const handoffPage = await fetchPage(OFFICIAL_CAREERS_HANDOFF_URL)

    if (pageExposesPublicJobListings(handoffPage?.html)) {
      throw new Error(
        'The verified Suki open positions state changed materially and now appears to expose public jobs',
      )
    }

    if (matchesVerifiedOpaqueOpenPositionsState(handoffPage)) {
      return []
    }

    throw new Error('The verified Suki open positions state changed materially')
  },
})

export const run = async (options = {}) => createSukiScraper().run(options)

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
