import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { NATIONAL_INSTRUMENTS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = NATIONAL_INSTRUMENTS_CATALOG.source
export const COMPANY = NATIONAL_INSTRUMENTS_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = NATIONAL_INSTRUMENTS_CATALOG.officialBrandName
export const VERIFIED_ON = NATIONAL_INSTRUMENTS_CATALOG.verifiedOn
export const HOMEPAGE_URL = NATIONAL_INSTRUMENTS_CATALOG.homepageUrl
export const CAREERS_URL = NATIONAL_INSTRUMENTS_CATALOG.companyCareerPage
export const ORACLE_REQUISITIONS_URL = NATIONAL_INSTRUMENTS_CATALOG.oracleCandidateExperienceUrl
export const ORACLE_ROOT_URL = NATIONAL_INSTRUMENTS_CATALOG.oracleCandidateExperienceRootUrl
export const LISTING_API_URL = NATIONAL_INSTRUMENTS_CATALOG.listingApiUrl
export const ACCEPTED_UNAVAILABLE_STATUSES = NATIONAL_INSTRUMENTS_CATALOG.acceptedCareerPageStatuses
export const PROVIDER_METADATA = NATIONAL_INSTRUMENTS_CATALOG

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const toAbsoluteUrl = (value, baseUrl) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

export const extractOpenRolesUrl = (html) => {
  for (const match of String(html ?? '').matchAll(/href=["']([^"']+)["']/gi)) {
    const absoluteUrl = toAbsoluteUrl(match[1], CAREERS_URL)
    if (absoluteUrl === ORACLE_REQUISITIONS_URL) {
      return absoluteUrl
    }
  }

  return null
}

export const pageHasOfficialNationalInstrumentsSignals = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)?.toLowerCase() || ''

  return /<title>\s*Careers\s*-\s*NI\s*<\/title>/i.test(page)
    && normalized.includes('we joined emerson')
    && normalized.includes('test & measurement business group')
    && normalized.includes('see open roles')
    && extractOpenRolesUrl(page) === ORACLE_REQUISITIONS_URL
}

const PUBLIC_JOB_SIGNAL_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bjob search results\b/i,
  /\bjob requisitions\b/i,
  /data-apibaseurl=/i,
  /recruitingCEJobRequisitions/i,
]

export const hasPublicJobSignals = (html) =>
  PUBLIC_JOB_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const isVerifiedUnavailableOraclePage = (page = {}) => {
  const normalized = normalizeWhitespace(page.html) || ''

  return ACCEPTED_UNAVAILABLE_STATUSES.includes(Number(page.status))
    && /service unavailable/i.test(normalized)
    && /dns failure/i.test(normalized)
    && !hasPublicJobSignals(page.html)
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

export const createNationalInstrumentsScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const careersPage = await fetchPage(CAREERS_URL)
    if (
      careersPage.status !== 200
      || !pageHasOfficialNationalInstrumentsSignals(careersPage.html)
      || extractOpenRolesUrl(careersPage.html) !== ORACLE_REQUISITIONS_URL
    ) {
      throw new Error('National Instruments official careers page no longer matches the verified Oracle handoff')
    }

    const requisitionsPage = await fetchPage(ORACLE_REQUISITIONS_URL)
    if (!isVerifiedUnavailableOraclePage(requisitionsPage)) {
      throw new Error('National Instruments linked Oracle requisitions page no longer matches the verified unavailable surface')
    }

    const listingApiPage = await fetchPage(LISTING_API_URL)
    if (!isVerifiedUnavailableOraclePage(listingApiPage)) {
      throw new Error('National Instruments linked Oracle listing API no longer matches the verified unavailable surface')
    }

    return []
  },
})

export const run = async (options = {}) => createNationalInstrumentsScraper().run(options)

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
