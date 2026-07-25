import path from 'node:path'
import { fileURLToPath } from 'node:url'

import FINO_PAYMENTS_BANK_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = FINO_PAYMENTS_BANK_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const LEGACY_HOMEPAGE_URL = PROVIDER_METADATA.legacyHomepageUrl
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const ALTERNATE_ROUTE_URLS = PROVIDER_METADATA.alternateRouteUrls

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const ATS_HOST_PATTERNS = [
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /smartrecruiters/i,
  /jobvite/i,
  /workdayjobs/i,
  /myworkdayjobs/i,
  /darwinbox/i,
  /openings\.co/i,
]

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#038;|&amp;/gi, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const normalizeUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    url.hash = ''

    if (url.pathname !== '/') {
      url.pathname = url.pathname.replace(/\/+$/, '')
    }

    return url.toString()
  } catch {
    return String(value ?? '').trim()
  }
}

const toAbsoluteUrl = (value, baseUrl) => {
  try {
    return new URL(String(value ?? ''), baseUrl).toString()
  } catch {
    return null
  }
}

export const extractHomepageCareerUrl = (html = '') => {
  for (const match of String(html ?? '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const absoluteUrl = toAbsoluteUrl(match[1], HOMEPAGE_URL)
    if (!absoluteUrl) continue

    if (normalizeUrl(absoluteUrl) === normalizeUrl(CAREERS_URL)) {
      return CAREERS_URL
    }
  }

  return null
}

export const extractPublicJobLinks = (html = '', baseUrl = CAREERS_URL) => {
  const links = new Set()

  for (const match of String(html ?? '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const absoluteUrl = toAbsoluteUrl(match[1], baseUrl)
    if (!absoluteUrl) continue

    if (
      /\/jobs?\/[^/?#]+/i.test(absoluteUrl)
      || /\/apply(?:\/|$|\?)/i.test(absoluteUrl)
      || /\/openings?\/[^/?#]+/i.test(absoluteUrl)
      || ATS_HOST_PATTERNS.some((pattern) => pattern.test(absoluteUrl))
    ) {
      links.add(absoluteUrl)
    }
  }

  return [...links]
}

export const hasPublicJobListingSignal = (html = '') => {
  const page = String(html ?? '')

  return /"@type"\s*:\s*"JobPosting"/i.test(page)
    || ATS_HOST_PATTERNS.some((pattern) => pattern.test(page))
    || extractPublicJobLinks(page).length > 0
}

export const hasOfficialHomepageSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return normalized.includes('Open your FinoPay Account now')
    && normalized.includes('FinoPay')
    && normalized.includes('Savings Account')
    && normalized.includes('Investor Relations')
    && normalized.includes('About Us')
    && normalized.includes('Careers')
}

export const hasVerifiedNonListingCareersPageSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return normalized.includes('We Empower Our People to Shape the Future of Digital Banking')
    && normalized.includes('Open Roles')
    && normalized.includes('Search by role')
    && normalized.includes('Select Location')
    && normalized.includes('Select Department')
    && normalized.includes('No Roles Found')
    && normalized.includes('Get In Touch')
    && extractPublicJobLinks(rawHtml).length === 0
    && !ATS_HOST_PATTERNS.some((pattern) => pattern.test(rawHtml))
    && !/"@type"\s*:\s*"JobPosting"/i.test(rawHtml)
}

export const isVerifiedLegacyHomepageRedirect = (page = {}) =>
  Number(page?.status) === 200
  && normalizeUrl(page?.url) === normalizeUrl(HOMEPAGE_URL)
  && hasOfficialHomepageSignal(page?.html)

export const isVerifiedAlternateRoute404 = (page = {}, requestedUrl = '') =>
  Number(page?.status) === 404
  && normalizeUrl(page?.url) === normalizeUrl(requestedUrl)
  && normalizeWhitespace(page?.html).includes('404')
  && !hasPublicJobListingSignal(page?.html)

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

export const createFinoPaymentsBankScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const legacyHomepage = await fetchPage(LEGACY_HOMEPAGE_URL)

    if (!isVerifiedLegacyHomepageRedirect(legacyHomepage)) {
      throw new Error(
        'Fino Payments Bank legacy homepage redirect no longer matches the verified first-party surface',
      )
    }

    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Fino Payments Bank homepage no longer matches the verified first-party surface')
    }

    if (extractHomepageCareerUrl(homepage.html) !== CAREERS_URL) {
      throw new Error('Fino Payments Bank homepage Careers link changed materially')
    }

    const careersPage = await fetchPage(CAREERS_URL)

    if (hasPublicJobListingSignal(careersPage.html)) {
      throw new Error('Fino Payments Bank careers page now exposes public jobs')
    }

    if (careersPage.status !== 200 || !hasVerifiedNonListingCareersPageSignal(careersPage.html)) {
      throw new Error('Fino Payments Bank careers page no longer matches the verified non-listing surface')
    }

    for (const routeUrl of ALTERNATE_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)

      if (!isVerifiedAlternateRoute404(routePage, routeUrl)) {
        throw new Error(
          'Fino Payments Bank alternate careers route changed materially or now exposes public jobs',
        )
      }
    }

    return []
  },
})

export const run = async (options = {}) => createFinoPaymentsBankScraper().run(options)

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
