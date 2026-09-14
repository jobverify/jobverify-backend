import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { CUELOGIC_CATALOG as PROVIDER_METADATA } from './catalog.js'
import { composeAbortSignals } from '../../scraper-support/utils/fetch.js'
import { attachInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'
import { withRetry } from '../../scraper-support/utils/retry.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const VERIFIED_JOBS_MICROSITE_URL = PROVIDER_METADATA.verifiedJobsMicrositeUrl
export const BROKEN_REDIRECT_HOST = PROVIDER_METADATA.brokenRedirectHost
export const BROKEN_REDIRECT_CERTIFICATE_HOST = PROVIDER_METADATA.brokenRedirectCertificateHost
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const SEARCH_TERM = 'Cuelogic'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const collectErrorMessages = (error) => {
  const messages = []
  const visited = new Set()
  let current = error

  while (current && !visited.has(current)) {
    visited.add(current)

    const message = typeof current?.message === 'string'
      ? current.message.trim()
      : String(current ?? '').trim()
    if (message) {
      messages.push(message)
    }

    current = current?.cause
  }

  return [...new Set(messages.filter(Boolean))]
}

const resolveErrorCode = (error) => {
  const visited = new Set()
  let current = error

  while (current && !visited.has(current)) {
    visited.add(current)

    if (typeof current?.code === 'string' && current.code.trim()) {
      return current.code.trim()
    }

    current = current?.cause
  }

  return undefined
}

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined
  }

  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

export const buildSearchUrl = () => {
  const url = new URL(CAREERS_URL)
  url.searchParams.set('createNewAlert', 'false')
  url.searchParams.set('q', SEARCH_TERM)
  url.searchParams.set('optionsFacetsDD_country', '')
  url.searchParams.set('optionsFacetsDD_location', '')
  url.searchParams.set('locationsearch', '')
  return url.toString()
}

export const pageExposesOpenJobs = (html) => /class=["']data-row["']/i.test(String(html ?? ''))
  || /class=["']jobTitle-link["']/i.test(String(html ?? ''))

export const isTrustedSearchRoute = (value) => {
  try {
    const expected = new URL(buildSearchUrl())
    const actual = new URL(String(value ?? ''))

    return actual.origin === expected.origin
      && actual.pathname === expected.pathname
      && actual.searchParams.get('createNewAlert') === 'false'
      && actual.searchParams.get('q') === SEARCH_TERM
      && (actual.searchParams.get('optionsFacetsDD_country') ?? '') === ''
      && (actual.searchParams.get('optionsFacetsDD_location') ?? '') === ''
      && (actual.searchParams.get('locationsearch') ?? '') === ''
  } catch {
    return false
  }
}

export const hasVerifiedEmptySearchSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /LTIMindtree/i.test(page)
    && (
      /Results\s*0\s*of\s*0/i.test(text)
      || /The\s+0\s+most recent jobs posted by LTM are listed below/i.test(text)
    )
    && /There are currently no open positions matching\s*"\s*Cuelogic\s*"\./i.test(text)
}

export const isKnownBrokenCareersRedirectTlsFailure = (error) => {
  const code = resolveErrorCode(error)
  const message = collectErrorMessages(error).join(' | ')
  const hasAltNameMismatch = /Hostname\/IP does not match certificate's altnames/i.test(message)
  const matchesKnownHost = new RegExp(BROKEN_REDIRECT_HOST.replace(/\./g, '\\.'), 'i').test(message)
  const matchesKnownCertificate = new RegExp(BROKEN_REDIRECT_CERTIFICATE_HOST.replace(/\./g, '\\.'), 'i').test(message)

  return (code === 'ERR_TLS_CERT_ALTNAME_INVALID' || hasAltNameMismatch)
    && matchesKnownHost
    && matchesKnownCertificate
}

const buildKnownUpstreamOutageError = (error) => {
  const outageError = new Error(
    `Cuelogic verified LTIMindtree careers routes now redirect to the broken ${BROKEN_REDIRECT_HOST} TLS surface`,
    { cause: error },
  )
  outageError.softFailure = true
  outageError.upstreamOutage = true
  outageError.failureKind = 'network_or_timeout'
  outageError.abortRetries = true
  return outageError
}

const defaultFetchPage = (url, { signal } = {}) => withRetry(async () => {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: composeAbortSignals(signal, createTimeoutSignal(15000)),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`)
    }

    return {
      status: response.status,
      url: response.url,
      html: await response.text(),
    }
  } catch (error) {
    if (isKnownBrokenCareersRedirectTlsFailure(error)) {
      error.abortRetries = true
    }

    throw error
  }
}, {
  attempts: 3,
  baseDelayMs: 2000,
  label: SOURCE,
  signal,
})

const buildDiscoveryOnlyEvidence = ({ surface, reason, verifiedAt }) => attachInventoryEvidence([], {
  status: 'discovery-only',
  surface,
  firstParty: true,
  listingComplete: false,
  pagesFetched: 1,
  reportedTotal: 0,
  indiaFacetCount: 0,
  verifiedAt,
  reason,
})

export const createCuelogicScraper = ({
  now: defaultNow = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchPage = defaultFetchPage, signal, now = defaultNow } = {}) {
    const searchUrl = buildSearchUrl()
    let searchPage

    try {
      searchPage = await fetchPage(searchUrl, { signal })
    } catch (error) {
      if (isKnownBrokenCareersRedirectTlsFailure(error)) {
        return buildDiscoveryOnlyEvidence({
          surface: searchUrl,
          verifiedAt: now(),
          reason: 'cuelogic-ltimindtree-search-route-broken-tls',
        })
      }

      throw error
    }

    if (!isTrustedSearchRoute(searchPage.url || searchUrl)) {
      throw new Error('Cuelogic verified LTIMindtree search route redirected away from the trusted careers surface')
    }

    if (!hasVerifiedEmptySearchSignal(searchPage.html) || pageExposesOpenJobs(searchPage.html)) {
      throw new Error('Cuelogic verified LTIMindtree empty-search surface changed or now exposes public jobs')
    }

    return buildDiscoveryOnlyEvidence({
      surface: searchUrl,
      verifiedAt: now(),
      reason: 'cuelogic-ltimindtree-empty-search-result',
    })
  },
})

export const run = async (options = {}) => createCuelogicScraper().run(options)

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
