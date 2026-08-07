import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createBrowserFetchSession } from '../../scraper-support/shared/browserFetch.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'ivysoftwaredevelopmentservices'
export const COMPANY = 'IVY SOFTWARE DEVELOPMENT SERVICES'
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
]

const OFFICIAL_CONTACT_PATTERNS = [
  /Ivy\s+Comptech\s+Private\s+Limited/i,
  /Ivy\s+Software\s+Development\s+Services\s+Private\s+Limited/i,
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
  attempts: 1,
  label: 'ivysoftwaredevelopmentservices',
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
  /HTTP (?:403|429)\b|fetch failed|timed out|timeout|could not connect|und_err_connect_timeout|ssl\/tls secure channel|ssl protocol error|err_ssl_protocol_error|tlsv1 alert internal error|econnreset|unable to/i
    .test(String(error?.message ?? error ?? ''))

const isTransportReachabilityError = (errorText) =>
  /timed out|timeout|und_err_connect_timeout|err_connection_timed_out|could not connect|enotfound|eai_again|getaddrinfo/i
    .test(String(errorText ?? ''))

const isExpectedBlockedError = (errorText) =>
  /403|429|forbidden|ssl\/tls secure channel|ssl protocol error|err_ssl_protocol_error|tlsv1 alert internal error|timed out|timeout|econnreset|unable to|fetch failed|could not connect|und_err_connect_timeout/i
    .test(String(errorText ?? ''))

export const createIvySoftwareDevelopmentServicesScraper = () => ({
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

    const fetchSharedSurfacePage = async (url) => {
      try {
        return { ok: true, text: await fetchText(url) }
      } catch (error) {
        const errorText = error instanceof Error ? error.message : String(error)
        if (!isBrowserFallbackError(error)) {
          throw error
        }

        if (isTransportReachabilityError(errorText)) {
          return { ok: false, error: errorText }
        }
      }

      try {
        return { ok: true, text: await browserTextFetcher(url) }
      } catch (error) {
        const errorText = error instanceof Error ? error.message : String(error)
        if (!isExpectedBlockedError(errorText)) {
          throw error
        }

        return { ok: false, error: errorText }
      }
    }

    const directProbeUrl = probeUrl || createDirectProbeUrl(fetchText)
    const probeRoute = async (url) => {
      const probe = await directProbeUrl(url)
      if (
        probe.ok
        || probeUrl
        || !isBrowserFallbackError(probe.error)
        || isTransportReachabilityError(probe.error)
      ) {
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
      const homepage = await fetchSharedSurfacePage(HOMEPAGE_URL)
      const contact = await fetchSharedSurfacePage(CONTACT_URL)

      if (homepage.ok && !hasOfficialHomepageSignal(homepage.text)) {
        throw new Error('IVY SOFTWARE DEVELOPMENT SERVICES official homepage no longer matches the shared Ivy Comptech surface')
      }

      if (contact.ok && !hasOfficialContactSignal(contact.text)) {
        throw new Error('IVY SOFTWARE DEVELOPMENT SERVICES official contact page no longer matches the verified legal-entity surface')
      }

      if (homepage.ok !== contact.ok) {
        throw new Error('IVY SOFTWARE DEVELOPMENT SERVICES shared first-party surface is only partially reachable and needs review')
      }

      for (const routeUrl of BLOCKED_ROUTE_URLS) {
        const probe = await probeRoute(routeUrl)
        if (probe.ok) {
          if (pageExposesPublicJobListings(probe.text)) {
            throw new Error(`IVY SOFTWARE DEVELOPMENT SERVICES blocked route now exposes public job listings: ${routeUrl}`)
          }
          throw new Error(`IVY SOFTWARE DEVELOPMENT SERVICES blocked route is reachable and needs review: ${routeUrl}`)
        }

        if (!isExpectedBlockedError(probe.error)) {
          throw new Error(`IVY SOFTWARE DEVELOPMENT SERVICES blocked-route validation changed materially: ${routeUrl} -> ${probe.error}`)
        }
      }

      if (!homepage.ok && !contact.ok) {
        return []
      }

      return []
    } finally {
      if (browserSession) {
        await browserSession.close()
      }
    }
  },
})

export const run = async (options = {}) => createIvySoftwareDevelopmentServicesScraper().run(options)

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
