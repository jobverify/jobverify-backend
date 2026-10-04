import path from 'node:path'
import { fileURLToPath } from 'node:url'

import AVENDATA_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = AVENDATA_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_PAGE_URL = PROVIDER_METADATA.careersPageUrl
export const ROBOTS_TXT_URL = PROVIDER_METADATA.robotsTxtUrl
export const SITEMAP_URL = PROVIDER_METADATA.sitemapUrl
export const SITEMAP_CAREER_ROUTE_URLS = PROVIDER_METADATA.sitemapCareerRouteUrls
export const CAREER_ALIAS_ROUTE_URLS = PROVIDER_METADATA.careerAliasRouteUrls
export const NO_PUBLIC_JOB_ROUTE_URLS = PROVIDER_METADATA.noPublicJobRouteUrls

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOB_SURFACE_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /successfactors/i,
  /oraclecloud/i,
  /darwinbox/i,
  /peoplestrong/i,
  /icims/i,
  /taleo/i,
]

const VISIBLE_PUBLIC_JOB_SIGNAL_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bjob openings\b/i,
  /\bsearch jobs\b/i,
  /\bview jobs\b/i,
  /\bjob description\b/i,
  /\bjob vacancy\b/i,
  /\bvacanc(?:y|ies)\b/i,
]

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#8211;|&ndash;|&#8212;|&mdash;/gi, '-')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/&#038;|&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim(),
)

const normalizeText = (value) => normalizeWhitespace(value).toLowerCase()

const getBodyHtml = (html = '') => {
  const match = String(html ?? '').match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)
  return match?.[1] || String(html ?? '')
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

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
    },
    redirect: 'follow',
    signal: createTimeoutSignal(15000),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const getFinalUrl = (page, fallbackUrl) => page?.url || fallbackUrl

const toAbsoluteUrl = (value, baseUrl) => {
  try {
    return new URL(String(value ?? ''), baseUrl).toString()
  } catch {
    return null
  }
}

export const extractPublicJobLinks = (html = '', baseUrl = CAREERS_PAGE_URL) => {
  const links = new Set()

  for (const match of String(html ?? '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const absoluteUrl = toAbsoluteUrl(match[1], baseUrl)
    if (!absoluteUrl) continue

    if (/\/careers\/.+/i.test(absoluteUrl) || /\/jobs\/.+/i.test(absoluteUrl)) {
      links.add(absoluteUrl)
      continue
    }

    if (
      /boards\.greenhouse\.io|job-boards\.greenhouse\.io|jobs\.lever\.co|ashbyhq\.com|myworkdayjobs|workdayjobs|smartrecruiters|jobvite|successfactors|oraclecloud|darwinbox|peoplestrong|icims|taleo/i.test(absoluteUrl)
    ) {
      links.add(absoluteUrl)
    }
  }

  return [...links]
}

export const hasPublicJobListingSignal = (html = '') =>
  extractPublicJobLinks(html).length > 0
  || PUBLIC_JOB_SURFACE_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))
  || VISIBLE_PUBLIC_JOB_SIGNAL_PATTERNS.some((pattern) => pattern.test(getBodyHtml(html)))

export const hasOfficialHomepageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeText(page)
  const title = normalizeText((page.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '')

  return [
    'avendata - decommission legacy systems & archive data securely',
    'decommission legacy systems & archive data securely | avendata',
  ].includes(title)
    && normalized.includes('legacy applications & application retirement')
    && /href=["'][^"']*careers[^"']*["']/i.test(page)
}

export const extractHomepageCareerUrl = (html = '') => {
  for (const match of String(html ?? '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const label = normalizeWhitespace(match[2])
    if (!/^careers$/i.test(label)) continue

    return toAbsoluteUrl(match[1], HOMEPAGE_URL)
  }

  return null
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeText(page)
  const title = normalizeText((page.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '')

  return [
    'careers at avendata - archive legacy systems & carve-outs',
    'careers at avendata : archive legacy systems & carve-outs',
  ].includes(title)
    && normalized.includes('careers at avendata')
    && normalized.includes('join our global team of industry specialists')
    && normalized.includes('remote-first culture')
    && normalized.includes('apply now to join a dynamic')
    && normalized.includes('upload your resume')
    && normalized.includes('submit application')
    && !hasPublicJobListingSignal(page)
}

export const hasExpectedRobotsTxt = (text = '') =>
  /sitemap:\s*https:\/\/avendata\.com\/sitemap\.xml/i.test(String(text ?? ''))

export const hasExpectedCareerRouteSet = (xml = '') => {
  const routes = [...String(xml ?? '').matchAll(/<loc>([^<]*(?:career|careers|jobs|join-us|openings)[^<]*)<\/loc>/gi)]
    .map((match) => normalizeWhitespace(match[1]))
    .sort()

  return JSON.stringify(routes) === JSON.stringify([...SITEMAP_CAREER_ROUTE_URLS].sort())
}

export const isVerifiedCareerAliasPage = (page = {}) =>
  Number(page?.status) === 200
  && getFinalUrl(page, '') === CAREERS_PAGE_URL
  && hasOfficialCareersSignal(page?.html)

export const isVerifiedMissingPublicJobRoute = (page = {}, requestedUrl) => {
  const expectedUrl = requestedUrl || page?.url || ''
  const finalUrl = getFinalUrl(page, expectedUrl)
  const normalized = normalizeText(page?.html)

  return Number(page?.status) === 404
    && finalUrl === expectedUrl
    && normalized.includes('page not found')
    && normalized.includes('it application decommissioning')
    && !hasPublicJobListingSignal(page?.html)
}

export const createAvenDataScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('AvenDATA verified official homepage no longer matches the known public surface')
    }

    if (extractHomepageCareerUrl(homepage.html) !== CAREERS_PAGE_URL) {
      throw new Error('AvenDATA verified homepage Careers link changed materially')
    }

    if (hasPublicJobListingSignal(homepage.html)) {
      throw new Error('AvenDATA homepage now appears to expose a public jobs surface')
    }

    const careersPage = await fetchPage(CAREERS_PAGE_URL)

    if (careersPage.status !== 200 || !hasOfficialCareersSignal(careersPage.html)) {
      throw new Error('AvenDATA verified careers resume-form surface changed materially or now exposes public jobs')
    }

    const robotsTxt = await fetchPage(ROBOTS_TXT_URL)

    if (robotsTxt.status !== 200 || !hasExpectedRobotsTxt(robotsTxt.html)) {
      throw new Error('AvenDATA verified robots.txt sitemap reference changed materially')
    }

    const sitemap = await fetchPage(SITEMAP_URL)

    if (sitemap.status !== 200 || !hasExpectedCareerRouteSet(sitemap.html)) {
      throw new Error('AvenDATA verified sitemap career route set changed materially')
    }

    for (const routeUrl of CAREER_ALIAS_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)

      if (!isVerifiedCareerAliasPage(routePage)) {
        throw new Error('AvenDATA verified career alias route changed materially or now exposes public jobs')
      }
    }

    for (const routeUrl of NO_PUBLIC_JOB_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)

      if (!isVerifiedMissingPublicJobRoute(routePage, routeUrl)) {
        throw new Error('AvenDATA verified adjacent job route changed materially or now exposes public jobs')
      }
    }

    return []
  },
})

export const run = async (options = {}) => createAvenDataScraper().run(options)

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
