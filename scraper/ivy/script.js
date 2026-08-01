import { createBrowserFetchSession } from '../../scraper-support/shared/browserFetch.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

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

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

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
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'ivy',
  timeoutMs: 15000,
})

const createDirectProbeUrl = (fetchText) => async (url) => {
  try {
    const text = await fetchText(url)
    return { ok: true, text }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

const isBrowserFallbackError = (error) =>
  /HTTP (?:403|429)\b|fetch failed|timed out|timeout|could not connect|und_err_connect_timeout|ssl\/tls secure channel|econnreset|unable to/i
    .test(String(error?.message ?? error ?? ''))

const isExpectedBlockedError = (errorText) =>
  /403|429|forbidden|ssl\/tls secure channel|timed out|timeout|econnreset|unable to|fetch failed|could not connect|und_err_connect_timeout/i
    .test(String(errorText ?? ''))

export const createIvyScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    probeUrl,
    fetchBrowserText,
    fetchBrowserPage,
  } = {}) {
    let browserSession = null

    const getBrowserSession = async () => {
      if (!browserSession) {
        browserSession = await createBrowserFetchSession({ userAgent: USER_AGENT })
      }

      return browserSession
    }

    const browserTextFetcher = fetchBrowserText || (async (url) => {
      const session = await getBrowserSession()
      return session.fetchText(url)
    })

    const browserPageFetcher = fetchBrowserPage || (async (url) => {
      const session = await getBrowserSession()
      return session.fetchPage(url)
    })

    const fetchPageText = async (url) => {
      try {
        return await fetchText(url)
      } catch (error) {
        if (!isBrowserFallbackError(error)) {
          throw error
        }

        return browserTextFetcher(url)
      }
    }

    const directProbeUrl = probeUrl || createDirectProbeUrl(fetchText)
    const probeRoute = async (url) => {
      const probe = await directProbeUrl(url)
      if (probe.ok || probeUrl || !isBrowserFallbackError(probe.error)) {
        return probe
      }

      try {
        const page = await browserPageFetcher(url)

        if (page.status >= 400) {
          return { ok: false, error: `HTTP ${page.status} for ${url}` }
        }

        return { ok: true, text: page.html }
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }

    try {
      const homepageHtml = await fetchPageText(HOMEPAGE_URL)
      const contactHtml = await fetchPageText(CONTACT_URL)

      if (!hasOfficialHomepageSignal(homepageHtml)) {
        throw new Error('ivy official homepage no longer matches the verified Ivy Comptech surface')
      }

      if (!hasOfficialContactSignal(contactHtml)) {
        throw new Error('ivy official contact page no longer matches the verified Ivy Comptech legal-entity surface')
      }

      for (const routeUrl of BLOCKED_ROUTE_URLS) {
        const probe = await probeRoute(routeUrl)
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
    } finally {
      if (browserSession) {
        await browserSession.close()
      }
    }
  },
})

export const run = async (options = {}) => createIvyScraper().run(options)
