import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { withRetry } from '../utils/retry.js'

import { SCALEFLEX_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = SCALEFLEX_CATALOG.source
export const COMPANY_NAME = SCALEFLEX_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = SCALEFLEX_CATALOG.officialBrandName
export const HOMEPAGE_URL = SCALEFLEX_CATALOG.officialHomepageUrl
export const CAREERS_HANDOFF_URL = SCALEFLEX_CATALOG.officialCareersHandoffUrl
export const CAREERS_ROUTE_URLS = SCALEFLEX_CATALOG.checkedCareersRouteUrls
export const VERIFIED_ON = SCALEFLEX_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = SCALEFLEX_CATALOG.verifiedSurfaceSummary
export const PROVIDER_METADATA = SCALEFLEX_CATALOG

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bopen positions?\b/i,
  /\bjob openings?\b/i,
  /\bjob opportunities\b/i,
  /\bcareer opportunities\b/i,
  /\bapply now\b/i,
  /\bjob description\b/i,
  /\bjoin our team\b/i,
  /\bwe(?:'re| are)? hiring\b/i,
  /\bvacan(?:cy|cies)\b/i,
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /freshteam/i,
  /bamboohr/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#0*39;|&apos;|&rsquo;|&lsquo;|&#x27;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

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

const isSameOfficialDomain = (value) => {
  try {
    const hostname = new URL(value || HOMEPAGE_URL).hostname.toLowerCase()
    return hostname === 'scaleflex.com' || hostname === 'www.scaleflex.com'
  } catch {
    return false
  }
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

export const hasPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const extractOfficialCareersHandoffUrl = (html) => {
  const match = String(html ?? '').match(
    /<a[^>]+href="([^"]*portals\.scaleflex\.com\/s\/xJfYX5yl\/en\/home[^"]*)"[^>]*>\s*Careers\s*<\/a>/i,
  )

  if (!match?.[1]) return null

  try {
    return new URL(match[1], HOMEPAGE_URL).toString()
  } catch {
    return null
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return normalized.includes('Turning billions of assets into engaging digital masterpieces')
    && normalized.includes('1300+ brands trust us with their visual content')
    && normalized.includes('Strengthen your Visual Asset Management with a unique combination of digital asset management, dynamic media optimization, brand portals and visual AI.')
    && extractOfficialCareersHandoffUrl(page) === CAREERS_HANDOFF_URL
}

export const hasVerifiedPortalLoadingSignal = (html) => {
  const normalized = normalizeWhitespace(html)
  if (!normalized) return false
  if (hasPublicJobsSignal(html)) return false
  return /^Loading\.\.\.(?:\s+Loading\.\.\.)*$/i.test(normalized)
}

export const isVerifiedNoPublicJobsRoute = (page = {}) => {
  if (!isSameOfficialDomain(page.url || HOMEPAGE_URL)) {
    return false
  }

  if (hasPublicJobsSignal(page.html)) {
    return false
  }

  return page.status === 404
}

export const createScaleflexScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('The verified Scaleflex homepage no longer matches the trusted public surface')
    }

    if (hasPublicJobsSignal(homepage.html)) {
      throw new Error('The verified Scaleflex homepage now appears to expose public jobs')
    }

    const careersPortal = await fetchPage(CAREERS_HANDOFF_URL)
    if (careersPortal.status !== 200 || !hasVerifiedPortalLoadingSignal(careersPortal.html)) {
      throw new Error('The linked Scaleflex careers portal no longer matches the verified loading-shell state')
    }

    for (const careersRouteUrl of CAREERS_ROUTE_URLS) {
      const careersRoute = await fetchPage(careersRouteUrl)
      if (!isVerifiedNoPublicJobsRoute(careersRoute)) {
        throw new Error('Scaleflex careers routes changed materially or now expose public jobs')
      }
    }

    return []
  },
})

export const run = async (options = {}) => createScaleflexScraper().run(options)

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
