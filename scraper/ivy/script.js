import { fetchTextWithRetry } from '../utils/fetch.js'

export const SOURCE = 'ivy'
export const COMPANY = 'ivy'
export const HOMEPAGE_URL = 'https://ivy.global/'
export const CONTACT_URL = 'https://ivy.global/contact'
export const BLOCKED_ROUTE_URLS = [
  'https://ivy.global/careers',
  'https://ivy.global/jobs',
  'http://ivy.global/',
  'http://www.ivy.global/',
]

const OFFICIAL_HOMEPAGE_PATTERNS = [
  /Ivy\s+Comptech/i,
  /Are you ready to shine/i,
  /online gaming industry/i,
]

const OFFICIAL_CONTACT_PATTERNS = [
  /Ivy\s+Comptech\s+Private\s+Limited/i,
  /Ivy\s+Software\s+Development\s+Services\s+Private\s+Limited/i,
  /Ivy\s+Global\s+Shared\s+Services\s+Private\s+Limited/i,
  /Ivy\s+Mobitech\s+Services\s+Private\s+Limited/i,
]

const PUBLIC_JOBS_PATTERN = /\b(open\s+positions|current\s+openings|job\s+openings)\b|<a[^>]+href=["'][^"']*(?:careers|jobs)[^"']*["'][^>]*>[^<]*(?:apply|view)/i

export const hasOfficialHomepageSignal = (html) =>
  OFFICIAL_HOMEPAGE_PATTERNS.every((pattern) => pattern.test(String(html ?? '')))

export const hasOfficialContactSignal = (html) =>
  OFFICIAL_CONTACT_PATTERNS.every((pattern) => pattern.test(String(html ?? '')))

export const pageExposesPublicJobListings = (html) => PUBLIC_JOBS_PATTERN.test(String(html ?? ''))

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; JobifyCareerScraper/1.0)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'ivy',
  timeoutMs: 15000,
})

const defaultProbeUrl = async (url) => {
  try {
    const text = await defaultFetchText(url)
    return { ok: true, text }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

const isExpectedBlockedError = (errorText) =>
  /403|forbidden|ssl\/tls secure channel|timed out|timeout|econnreset|unable to/i.test(String(errorText ?? ''))

export const createIvyScraper = () => ({
  async run({ fetchText = defaultFetchText, probeUrl = defaultProbeUrl } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    const contactHtml = await fetchText(CONTACT_URL)

    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('ivy official homepage no longer matches the verified Ivy Comptech surface')
    }

    if (!hasOfficialContactSignal(contactHtml)) {
      throw new Error('ivy official contact page no longer matches the verified Ivy Comptech legal-entity surface')
    }

    for (const routeUrl of BLOCKED_ROUTE_URLS) {
      const probe = await probeUrl(routeUrl)
      if (probe.ok) {
        if (pageExposesPublicJobListings(probe.text)) {
          throw new Error(`ivy first-party blocked route now exposes public job listings: ${routeUrl}`)
        }
        throw new Error(`ivy first-party blocked route is reachable and needs review: ${routeUrl}`)
      }

      if (!isExpectedBlockedError(probe.error)) {
        throw new Error(`ivy blocked-route validation changed materially: ${routeUrl} -> ${probe.error}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createIvyScraper().run(options)
