import path from 'node:path'
import { fileURLToPath } from 'node:url'

import BAJAJ_ALLIANZ_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = BAJAJ_ALLIANZ_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const LEGACY_HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CURRENT_HOMEPAGE_URL = PROVIDER_METADATA.redirectedHomepageUrl
export const JOBS_PORTAL_URL = PROVIDER_METADATA.jobsPortalUrl
export const JOBS_PORTAL_SHELL_ROUTE_URLS = PROVIDER_METADATA.jobsPortalShellRouteUrls
export const BROKEN_CAREERS_ROUTE_URLS = PROVIDER_METADATA.brokenCareersRouteUrls

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#038;|&amp;/gi, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const normalizeText = (value) => normalizeWhitespace(value).toLowerCase()

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

const getUrlSignature = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    const pathname = url.pathname === '/' ? '/' : url.pathname.replace(/\/+$/, '')
    return `${url.hostname.replace(/^www\./i, '').toLowerCase()}${pathname}`
  } catch {
    return String(value ?? '').trim().toLowerCase()
  }
}

const JOB_PORTAL_SIGNATURES = new Set([
  'jobs.bajajgeneral.com/',
  'jobs.bajajgeneral.com/bajajgeneral',
  'jobs.bajajgeneral.com/bajajgeneral/search-jobs',
])

const toAbsoluteUrl = (value, baseUrl) => {
  try {
    return new URL(String(value ?? ''), baseUrl).toString()
  } catch {
    return null
  }
}

export const extractHomepageCareerUrl = (html = '') => {
  for (const match of String(html ?? '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const label = normalizeWhitespace(match[2])
    if (!/^careers$/i.test(label)) continue

    return toAbsoluteUrl(match[1], CURRENT_HOMEPAGE_URL)
  }

  return null
}

export const extractPublicJobLinks = (html = '', baseUrl = JOBS_PORTAL_URL) => {
  const links = new Set()

  for (const match of String(html ?? '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const absoluteUrl = toAbsoluteUrl(match[1], baseUrl)
    if (!absoluteUrl) continue

    if (/\/(?:job|jobs)\/[^"'#<>\s]+/i.test(absoluteUrl)) {
      links.add(absoluteUrl)
    }
  }

  return [...links]
}

const hasPublicJobListingSignal = (html = '') =>
  extractPublicJobLinks(html).length > 0 || /"@type"\s*:\s*"JobPosting"/i.test(String(html ?? ''))

export const hasOfficialCurrentHomepageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeText(page)
  const normalizedRaw = page
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#038;|&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .toLowerCase()

  return /<title>\s*Bajaj General Insurance \(Formerly Bajaj Allianz\)\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.bajajgeneralinsurance\.com\/?["']/i.test(
      page,
    )
    && normalized.includes('bajaj general insurance (formerly bajaj allianz)')
    && normalizedRaw.includes('buy health, car, bike & travel insurance online')
}

export const hasOfficialJobsPortalShellSignal = (html = '') => {
  const page = String(html ?? '')

  return /<title>\s*Bajaj General Insurance Limited - Career\s*<\/title>/i.test(page)
    && /<meta[^>]+name=["']description["'][^>]+content=["']Bajaj General Career, Bajaj General Insurance["']/i.test(
      page,
    )
    && /<base[^>]+href=["']\/bajajgeneral\/["']/i.test(page)
    && /<app-root><\/app-root>/i.test(page)
    && /location\.hostname\.includes\('impl\.openings\.co'\)/i.test(page)
}

export const isVerifiedLegacyHomepageRedirect = (page = {}) =>
  Number(page?.status) === 200
  && normalizeUrl(page?.url) === normalizeUrl(CURRENT_HOMEPAGE_URL)
  && hasOfficialCurrentHomepageSignal(page?.html)

export const isVerifiedJobsPortalShellPage = (page = {}) =>
  Number(page?.status) === 200
  && JOB_PORTAL_SIGNATURES.has(getUrlSignature(page?.url || JOBS_PORTAL_URL))
  && hasOfficialJobsPortalShellSignal(page?.html)
  && !hasPublicJobListingSignal(page?.html)

export const isVerifiedBrokenCareersRoute = (page = {}, requestedUrl = '') => {
  const finalUrl = normalizeUrl(page?.url)
  const requested = normalizeUrl(requestedUrl)
  const canonicalBrokenRoute = normalizeUrl(BROKEN_CAREERS_ROUTE_URLS[1])
  const normalized = normalizeText(page?.html)

  return Number(page?.status) === 404
    && (finalUrl === requested || finalUrl === canonicalBrokenRoute)
    && /<title>\s*File not found\s*<\/title>/i.test(String(page?.html ?? ''))
    && normalized.includes('a custom errorhandler for 404 responses')
    && !hasPublicJobListingSignal(page?.html)
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

export const createBajajAllianzScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const legacyHomepage = await fetchPage(LEGACY_HOMEPAGE_URL)

    if (!isVerifiedLegacyHomepageRedirect(legacyHomepage)) {
      throw new Error(
        'Bajaj Allianz legacy homepage redirect no longer matches the verified first-party surface',
      )
    }

    const currentHomepage = await fetchPage(CURRENT_HOMEPAGE_URL)

    if (currentHomepage.status !== 200 || !hasOfficialCurrentHomepageSignal(currentHomepage.html)) {
      throw new Error('Bajaj Allianz current homepage no longer matches the verified first-party surface')
    }

    if (extractHomepageCareerUrl(currentHomepage.html) !== JOBS_PORTAL_URL) {
      throw new Error('Bajaj Allianz current homepage Careers link changed materially')
    }

    for (const routeUrl of JOBS_PORTAL_SHELL_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)

      if (!isVerifiedJobsPortalShellPage(routePage)) {
        throw new Error(
          'Bajaj Allianz jobs portal shell route changed materially or now exposes public jobs',
        )
      }
    }

    for (const routeUrl of BROKEN_CAREERS_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)

      if (!isVerifiedBrokenCareersRoute(routePage, routeUrl)) {
        throw new Error(
          'Bajaj Allianz direct careers route changed materially or now exposes public jobs',
        )
      }
    }

    return []
  },
})

export const run = async (options = {}) => createBajajAllianzScraper().run(options)

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
