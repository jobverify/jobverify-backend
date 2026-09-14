import path from 'node:path'
import { fileURLToPath } from 'node:url'

import ANAND_GROUP_INDIA_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = ANAND_GROUP_INDIA_CATALOG.source
export const COMPANY = ANAND_GROUP_INDIA_CATALOG.companyName
export const HOMEPAGE_URL = ANAND_GROUP_INDIA_CATALOG.homepageUrl
export const CAREERS_PAGE_URL = ANAND_GROUP_INDIA_CATALOG.companyCareerPage
export const JOIN_US_PAGE_URL = ANAND_GROUP_INDIA_CATALOG.joinUsPageUrl
export const SHOPFLOOR_PAGE_URL = ANAND_GROUP_INDIA_CATALOG.shopfloorPageUrl
export const ROBOTS_TXT_URL = ANAND_GROUP_INDIA_CATALOG.robotsTxtUrl
export const SITEMAP_INDEX_URL = ANAND_GROUP_INDIA_CATALOG.sitemapIndexUrl
export const PAGE_SITEMAP_URL = ANAND_GROUP_INDIA_CATALOG.pageSitemapUrl
export const EXPECTED_CAREER_URLS_FROM_PAGE_SITEMAP =
  ANAND_GROUP_INDIA_CATALOG.expectedCareerUrlsFromPageSitemap
export const VERIFIED_AT = ANAND_GROUP_INDIA_CATALOG.verifiedOn
export const MISSING_JOB_ROUTE_URLS = [
  'https://www.anandgroupindia.com/careers',
  'https://www.anandgroupindia.com/careers/',
  'https://www.anandgroupindia.com/career',
  'https://www.anandgroupindia.com/jobs',
  'https://www.anandgroupindia.com/join-us',
  'https://www.anandgroupindia.com/openings',
  'https://www.anandgroupindia.com/current-openings',
  'https://www.anandgroupindia.com/work-with-us',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOB_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bjob description\b/i,
  /\bjob posting\b/i,
  /\bvacanc(?:y|ies)\b/i,
  /\bapply now\b/i,
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

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/[â€™]/g, "'")
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#8211;|&ndash;|&#8212;|&mdash;/gi, '-')
  .replace(/[â€“]/g, '-')
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

const normalizeComparableUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return String(value ?? '').replace(/\/$/, '')
  }
}

const sameUrl = (left, right) => normalizeComparableUrl(left) === normalizeComparableUrl(right)

const getAttributeValue = (attributes = '', name) => {
  const match = String(attributes ?? '').match(
    new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'),
  )

  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null
}

const hasHrefAttribute = (html, expectedUrl) => {
  for (const match of String(html ?? '').matchAll(/<a\b([^>]*)>/gi)) {
    if (sameUrl(toAbsoluteUrl(getAttributeValue(match[1], 'href'), HOMEPAGE_URL), expectedUrl)) {
      return true
    }
  }

  return false
}

const hasCanonicalUrl = (html, expectedUrl) => {
  for (const match of String(html ?? '').matchAll(/<link\b([^>]*)>/gi)) {
    if (!/\bcanonical\b/i.test(getAttributeValue(match[1], 'rel') ?? '')) continue

    if (sameUrl(toAbsoluteUrl(getAttributeValue(match[1], 'href'), HOMEPAGE_URL), expectedUrl)) {
      return true
    }
  }

  return false
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
}

const getFinalUrl = (page, fallbackUrl) => page?.url || fallbackUrl

const toAbsoluteUrl = (value, baseUrl) => {
  try {
    return new URL(String(value ?? ''), baseUrl).toString()
  } catch {
    return null
  }
}

export const hasOfficialHomepageSignal = (html = '') => {
  const page = String(html ?? '')
  const title = normalizeWhitespace(page.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1])

  return /^ANAND Group\b/i.test(title)
    && hasCanonicalUrl(page, HOMEPAGE_URL)
  }

export const extractHomepageCareerUrl = (html = '') => {
  for (const match of String(html ?? '').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const label = normalizeWhitespace(match[2])
    const href = toAbsoluteUrl(getAttributeValue(match[1], 'href'), HOMEPAGE_URL)
    if (!/career/i.test(label) || !sameUrl(href, CAREERS_PAGE_URL)) continue

    return href
  }

  return null
}

export const hasOfficialCareersLandingSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeText(page)

  return /<title>\s*Career at ANAND - ANAND Group\s*<\/title>/i.test(page)
    && normalized.includes('human mind is our fundamental resource')
    && normalized.includes('fraudulent employment opportunity disclaimer')
    && normalized.includes('does not charge or accept any fees from jobseekers')
    && normalized.includes('bank account information')
    && normalized.includes('join us')
  }

export const extractJoinUsPageUrl = (html = '') => {
  for (const match of String(html ?? '').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const label = normalizeWhitespace(match[2])
    if (label !== 'Join Us') continue

    return toAbsoluteUrl(getAttributeValue(match[1], 'href'), CAREERS_PAGE_URL)
  }

  return null
}

export const extractClickToJoinHref = (html = '') => {
  for (const match of String(html ?? '').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    if (!/CLICK TO JOIN/i.test(normalizeWhitespace(match[2]))) continue

    return getAttributeValue(match[1], 'href')
  }

  return null
}

export const hasOfficialJoinUsSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeText(page)

  return /<title>\s*Join Us - ANAND Group\s*<\/title>/i.test(page)
    && normalized.includes('join us at anand')
    && normalized.includes('click to join')
    && normalized.includes('anand is where more than 20,000+ people come together')
    && normalized.includes("anand's people-focused policies make it a thriving and inclusive workplace")
    && normalized.includes('send to a friend')
    && /friend-email/i.test(page)
    && extractClickToJoinHref(page) === '#'
  }

export const hasOfficialShopfloorSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeText(page)

  return /<title>\s*Shop floor Excellence - ANAND Group\s*<\/title>/i.test(page)
    && normalized.includes('shop floor excellence')
    && hasHrefAttribute(page, JOIN_US_PAGE_URL)
    && hasHrefAttribute(page, 'https://www.anandgroupindia.com/careers-at-anand/people-development/')
  }

export const hasPublicJobListingSignal = (html = '') =>
  PUBLIC_JOB_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasExpectedRobotsSignal = (text = '') =>
  /Sitemap:\s*https:\/\/www\.anandgroupindia\.com\/sitemap_index\.xml/i.test(String(text ?? ''))

export const extractExpectedCareerUrlsFromPageSitemap = (xml = '') =>
  EXPECTED_CAREER_URLS_FROM_PAGE_SITEMAP.filter((expectedUrl) =>
    [...String(xml ?? '').matchAll(/<loc>(https:\/\/www\.anandgroupindia\.com\/careers-at-anand\/[^<]*|https:\/\/www\.anandgroupindia\.com\/careers-at-anand\/)<\/loc>/gi)]
      .some((match) => sameUrl(match[1], expectedUrl)),
  )

const sitemapIndexIncludesPageSitemap = (xml = '') =>
  new RegExp(PAGE_SITEMAP_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(String(xml ?? ''))

export const isKnownMissingJobRoute = (page = {}, requestedUrl) => {
  const finalUrl = getFinalUrl(page, requestedUrl)

  return Number(page?.status) === 404
    && finalUrl === requestedUrl
    && /<title>\s*(?:404 Not Found|Page not found - ANAND Group)\s*<\/title>/i.test(String(page?.html ?? ''))
    && !hasPublicJobListingSignal(page?.html)
}

export const createAnandGroupIndiaScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !sameUrl(homepage.url, HOMEPAGE_URL) || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Anand Group India verified official homepage changed materially')
    }

    if (!sameUrl(extractHomepageCareerUrl(homepage.html), CAREERS_PAGE_URL)) {
      throw new Error('Anand Group India verified homepage careers handoff changed materially')
    }

    const careersPage = await fetchPage(CAREERS_PAGE_URL)

    if (
      careersPage.status !== 200
      || !sameUrl(careersPage.url, CAREERS_PAGE_URL)
      || !hasOfficialCareersLandingSignal(careersPage.html)
    ) {
      throw new Error('Anand Group India verified careers landing page changed materially')
    }

    if (!sameUrl(extractJoinUsPageUrl(careersPage.html), JOIN_US_PAGE_URL)) {
      throw new Error('Anand Group India verified careers landing handoff to Join Us changed materially')
    }

    const joinUsPage = await fetchPage(JOIN_US_PAGE_URL)

    if (hasPublicJobListingSignal(joinUsPage.html)) {
      throw new Error('Anand Group India join us page now appears to expose a public jobs board')
    }

    if (
      joinUsPage.status !== 200
      || !sameUrl(joinUsPage.url, JOIN_US_PAGE_URL)
      || !hasOfficialJoinUsSignal(joinUsPage.html)
    ) {
      throw new Error('Anand Group India verified join us page changed materially')
    }

    const shopfloorPage = await fetchPage(SHOPFLOOR_PAGE_URL)

    if (
      shopfloorPage.status !== 200
      || !sameUrl(shopfloorPage.url, SHOPFLOOR_PAGE_URL)
      || !hasOfficialShopfloorSignal(shopfloorPage.html)
    ) {
      throw new Error('Anand Group India verified shopfloor page changed materially')
    }

    const robotsTxtPage = await fetchPage(ROBOTS_TXT_URL)
    if (robotsTxtPage.status !== 200 || !hasExpectedRobotsSignal(robotsTxtPage.html)) {
      throw new Error('Anand Group India verified robots.txt surface changed materially')
    }

    const sitemapIndexPage = await fetchPage(SITEMAP_INDEX_URL)
    if (sitemapIndexPage.status !== 200 || !sitemapIndexIncludesPageSitemap(sitemapIndexPage.html)) {
      throw new Error('Anand Group India verified sitemap index no longer references the page sitemap')
    }

    const pageSitemap = await fetchPage(PAGE_SITEMAP_URL)
    const extractedCareerUrls = extractExpectedCareerUrlsFromPageSitemap(pageSitemap.html)
    if (
      pageSitemap.status !== 200
      || extractedCareerUrls.length !== EXPECTED_CAREER_URLS_FROM_PAGE_SITEMAP.length
      || !EXPECTED_CAREER_URLS_FROM_PAGE_SITEMAP.every((url, index) => sameUrl(url, extractedCareerUrls[index]))
    ) {
      throw new Error('Anand Group India verified page sitemap careers urls changed materially')
    }

    for (const routeUrl of MISSING_JOB_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)

      if (!isKnownMissingJobRoute(routePage, routeUrl)) {
        throw new Error(`Anand Group India verified missing common job route changed: ${getFinalUrl(routePage, routeUrl)}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createAnandGroupIndiaScraper().run(options)

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
