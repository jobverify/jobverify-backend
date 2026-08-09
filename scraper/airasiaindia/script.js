import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { withRetry } from '../../scraper-support/utils/retry.js'

import { AIRASIA_INDIA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = AIRASIA_INDIA_CATALOG.source
export const COMPANY = AIRASIA_INDIA_CATALOG.companyName
export const PROVIDER_METADATA = AIRASIA_INDIA_CATALOG
export const LEGACY_HOMEPAGE_URL = AIRASIA_INDIA_CATALOG.legacyHomepageUrl
export const LEGACY_CAREERS_URL = AIRASIA_INDIA_CATALOG.companyCareerPage
export const AIRASIA_MOVE_URL = AIRASIA_INDIA_CATALOG.legacyMoveUrl
export const AIXCONNECT_HOME_URL = AIRASIA_INDIA_CATALOG.parkedRebrandUrl
export const AIXCONNECT_CAREERS_URL = AIRASIA_INDIA_CATALOG.parkedRebrandCareersUrl
export const AIR_INDIA_EXPRESS_HOME_URL = AIRASIA_INDIA_CATALOG.mergedCarrierHomepageUrl
export const AIR_INDIA_EXPRESS_CAREERS_URL = AIRASIA_INDIA_CATALOG.mergedCarrierCareersUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;/gi, "'")
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    url.hash = ''
    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.replace(/\/+$/, '')
    }
    return url.toString()
  } catch {
    return null
  }
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

const defaultFetchPage = (url) => withRetry(async () => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: createTimeoutSignal(15000),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}, {
  attempts: 3,
  baseDelayMs: 2000,
  label: SOURCE,
})

export const hasAirAsiaMoveSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*AirAsia MOVE\s*\|\s*Discover deals on flights, hotels, rides &amp; more\s*<\/title>/i.test(rawHtml)
    && /\bAirAsia MOVE\b/i.test(normalized)
    && /Discover deals on flights, hotels, rides & more/i.test(normalized)
}

export const hasAixConnectParkedSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(rawHtml)
    && /<title>\s*Coming Soon\s*<\/title>/i.test(rawHtml)
    && /\bComing Soon\b/i.test(normalized)
}

export const hasAirIndiaExpressCareersSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*Air India Express\s*\|\s*Career Opportunities\s*\|\s*Current Vacancies\s*<\/title>/i.test(rawHtml)
    && /\bAir India Express\b/i.test(normalized)
    && /\bCareer Opportunities\b/i.test(normalized)
    && /\bCurrent Vacancies\b/i.test(normalized)
    && !/\bAirAsia India\b/i.test(normalized)
    && !/\bAIX Connect\b/i.test(normalized)
}

export const isVerifiedAirAsiaMoveRedirect = (page = {}) =>
  page.status === 200
  && normalizeUrl(page.url) === normalizeUrl(AIRASIA_MOVE_URL)
  && hasAirAsiaMoveSignal(page.html)

export const isVerifiedAixConnectParkedPage = (page = {}, expectedUrl = AIXCONNECT_HOME_URL) =>
  page.status === 200
  && normalizeUrl(page.url) === normalizeUrl(expectedUrl)
  && hasAixConnectParkedSignal(page.html)

export const isVerifiedAirIndiaExpressCareersPage = (page = {}) =>
  page.status === 200
  && normalizeUrl(page.url) === normalizeUrl(AIR_INDIA_EXPRESS_CAREERS_URL)
  && hasAirIndiaExpressCareersSignal(page.html)

export const createAirAsiaIndiaScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const legacyHomepage = await fetchPage(LEGACY_HOMEPAGE_URL)
    if (!isVerifiedAirAsiaMoveRedirect(legacyHomepage)) {
      throw new Error(
        'AirAsia India legacy homepage no longer matches the verified AirAsia MOVE redirect surface',
      )
    }

    const legacyCareersPage = await fetchPage(LEGACY_CAREERS_URL)
    if (!isVerifiedAirAsiaMoveRedirect(legacyCareersPage)) {
      throw new Error(
        'AirAsia India legacy careers page no longer matches the verified AirAsia MOVE redirect surface',
      )
    }

    const aixConnectHomepage = await fetchPage(AIXCONNECT_HOME_URL)
    if (!isVerifiedAixConnectParkedPage(aixConnectHomepage, AIXCONNECT_HOME_URL)) {
      throw new Error(
        'AirAsia India AIX Connect homepage no longer matches the verified parked rebrand surface',
      )
    }

    const aixConnectCareersPage = await fetchPage(AIXCONNECT_CAREERS_URL)
    if (!isVerifiedAixConnectParkedPage(aixConnectCareersPage, AIXCONNECT_CAREERS_URL)) {
      throw new Error(
        'AirAsia India AIX Connect careers page no longer matches the verified parked rebrand surface',
      )
    }

    const mergedCarrierCareersPage = await fetchPage(AIR_INDIA_EXPRESS_CAREERS_URL)
    if (!isVerifiedAirIndiaExpressCareersPage(mergedCarrierCareersPage)) {
      throw new Error(
        'AirAsia India merged-carrier careers handoff no longer matches the verified Air India Express surface',
      )
    }

    return []
  },
})

export const run = async (options = {}) => createAirAsiaIndiaScraper().run(options)

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
