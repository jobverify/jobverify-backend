import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { withRetry } from '../utils/retry.js'

import { SHORE_INFOTECH_INDIA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = SHORE_INFOTECH_INDIA_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.companyCareerPage
export const CONTACT_URL = PROVIDER_METADATA.contactPageUrl
export const CAREERS_ROUTE_URLS = [
  'https://www.shoregrp.com/careers',
  'https://www.shoregrp.com/jobs',
  'https://www.shoregrp.com/join-us',
  'https://www.shoregrp.com/openings',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bopen positions?\b/i,
  /\bcareer opportunities\b/i,
  /\bjoin our team\b/i,
  /\bwe(?:'re| are)? hiring\b/i,
  /\bapply now\b/i,
  /boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /myworkdayjobs/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeText = (value) => normalizeWhitespace(value).toLowerCase()

const createTimeoutSignal = (timeoutMs) => {
  if (typeof AbortSignal?.timeout === 'function') return AbortSignal.timeout(timeoutMs)
  return undefined
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

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeText(page)

  return /Managed Data Services & AI-Powered Operations for SMBs \| Shore Group/i.test(page)
    && normalized.includes('managed data services that simplify your operations')
    && normalized.includes('designed for small and medium-sized businesses.')
    && normalized.includes('shore group associates llc')
}

export const hasOfficialContactSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeText(page)

  return /Get Started/i.test(page)
    && normalized.includes('let’s connect')
    && normalized.includes('innovative services for modern businesses')
    && normalized.includes('we’re just an email away.')
}

const isVerifiedMissingFirstPartyRoute = (page = {}) => {
  const html = String(page.html ?? '')
  const normalized = normalizeText(html)

  return page.status === 404
    && /<title>\s*Not Found\s*<\/title>/i.test(html)
    && normalized.includes('404')
    && !hasPublicJobsSignal(html)
}

export const createShoreInfotechIndiaScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Shore Infotech India homepage surface no longer matches the verified first-party site')
    }
    if (hasPublicJobsSignal(homepage.html)) {
      throw new Error('Shore Infotech India homepage now appears to expose public jobs')
    }

    const contactPage = await fetchPage(CONTACT_URL)
    if (contactPage.status !== 200 || !hasOfficialContactSignal(contactPage.html)) {
      throw new Error('Shore Infotech India contact page no longer matches the verified first-party site')
    }
    if (hasPublicJobsSignal(contactPage.html)) {
      throw new Error('Shore Infotech India contact page now appears to expose public jobs')
    }

    for (const careersRouteUrl of CAREERS_ROUTE_URLS) {
      const careersRoute = await fetchPage(careersRouteUrl)
      if (!isVerifiedMissingFirstPartyRoute(careersRoute)) {
        throw new Error(`Shore Infotech India careers route changed materially or now exposes public jobs: ${careersRouteUrl}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createShoreInfotechIndiaScraper().run(options)

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
