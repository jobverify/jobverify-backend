import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ANAND_GROUP_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = ANAND_GROUP_CATALOG.source
export const COMPANY = ANAND_GROUP_CATALOG.companyName
export const HOMEPAGE_URL = ANAND_GROUP_CATALOG.homepageUrl
export const CAREERS_PAGE_URL = ANAND_GROUP_CATALOG.companyCareerPage
export const JOIN_US_PAGE_URL = ANAND_GROUP_CATALOG.joinUsPageUrl
export const SHOPFLOOR_PAGE_URL = ANAND_GROUP_CATALOG.shopfloorPageUrl
export const ROBOTS_TXT_URL = ANAND_GROUP_CATALOG.robotsTxtUrl
export const SITEMAP_INDEX_URL = ANAND_GROUP_CATALOG.sitemapIndexUrl
export const PAGE_SITEMAP_URL = ANAND_GROUP_CATALOG.pageSitemapUrl
export const EXPECTED_CAREER_URLS_FROM_PAGE_SITEMAP =
  ANAND_GROUP_CATALOG.expectedCareerUrlsFromPageSitemap
export const VERIFIED_ON = ANAND_GROUP_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = ANAND_GROUP_CATALOG.verifiedSurfaceSummary
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
  /\bopen positions?\b/i,
  /\bapply now\b/i,
  /\bview jobs\b/i,
  /\bjob description\b/i,
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
  /icims/i,
  /taleo/i,
  /peoplestrong/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&lsquo;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const escapeRegExp = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const hasHrefAttribute = (html, expectedUrl) => new RegExp(
  `href\\s*=\\s*(?:"${escapeRegExp(expectedUrl)}"|'${escapeRegExp(expectedUrl)}'|${escapeRegExp(expectedUrl)}(?=[\\s>]))`,
  'i',
).test(String(html ?? ''))

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

const extractLocUrls = (xml) =>
  [...String(xml ?? '').matchAll(/<loc>(.*?)<\/loc>/gi)].map((match) => match[1].trim())

const getFinalUrl = (page, fallbackUrl) => page?.url || page?.finalUrl || fallbackUrl

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')

  return /<title>\s*ANAND Group: Automotive Components Manufacturer India \| Best Automobile Company\s*<\/title>/i.test(rawHtml)
    && hasHrefAttribute(rawHtml, HOMEPAGE_URL)
    && hasHrefAttribute(rawHtml, CAREERS_PAGE_URL)
    && hasHrefAttribute(rawHtml, SHOPFLOOR_PAGE_URL)
    && hasHrefAttribute(rawHtml, JOIN_US_PAGE_URL)
}

export const hasOfficialCareersLandingSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*Career at ANAND - ANAND Group\s*<\/title>/i.test(rawHtml)
    && hasHrefAttribute(rawHtml, CAREERS_PAGE_URL)
    && /Career at ANAND/i.test(normalized)
    && /Culture at ANAND/i.test(normalized)
    && /People Development/i.test(normalized)
    && hasHrefAttribute(rawHtml, JOIN_US_PAGE_URL)
    && hasHrefAttribute(rawHtml, SHOPFLOOR_PAGE_URL)
}

export const hasOfficialJoinUsSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*Join Us - ANAND Group\s*<\/title>/i.test(rawHtml)
    && hasHrefAttribute(rawHtml, JOIN_US_PAGE_URL)
    && /Join Us At ANAND/i.test(normalized)
    && /CLICK TO JOIN/i.test(normalized)
    && /\bJOIN US\b/i.test(normalized)
    && /\bWORK WITH US\b/i.test(normalized)
    && /\bLIFE AT ANAND\b/i.test(normalized)
    && /friend-email/i.test(rawHtml)
}

export const hasOfficialShopfloorSignal = (html) => {
  const rawHtml = String(html ?? '')

  return /<title>\s*Shop floor Excellence - ANAND Group\s*<\/title>/i.test(rawHtml)
    && hasHrefAttribute(rawHtml, SHOPFLOOR_PAGE_URL)
    && hasHrefAttribute(rawHtml, JOIN_US_PAGE_URL)
}

export const hasPublicJobListingSignal = (html) =>
  PUBLIC_JOB_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasExpectedRobotsSignal = (text) => {
  const normalized = String(text ?? '')

  return /User-agent:\s*\*/i.test(normalized)
    && /Allow:\s*$/im.test(normalized)
    && /Sitemap:\s*https:\/\/www\.anandgroupindia\.com\/sitemap_index\.xml/i.test(normalized)
}

export const extractExpectedCareerUrlsFromPageSitemap = (xml) =>
  extractLocUrls(xml).filter((url) => EXPECTED_CAREER_URLS_FROM_PAGE_SITEMAP.includes(url))

export const isKnownMissingJobRoute = (page = {}, requestedUrl) => {
  const finalUrl = getFinalUrl(page, requestedUrl)
  const html = String(page.html ?? '')

  return Number(page.status) === 404
    && finalUrl === requestedUrl
    && /404 Not Found|Page not found/i.test(html)
    && !hasPublicJobListingSignal(html)
}

export const createAnandGroupScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Anand Group verified homepage careers handoff no longer matches the known public surface')
    }

    const careersPage = await fetchPage(CAREERS_PAGE_URL)
    if (careersPage.status !== 200 || !hasOfficialCareersLandingSignal(careersPage.html)) {
      throw new Error('Anand Group verified careers landing page no longer matches the known public surface')
    }

    const joinUsPage = await fetchPage(JOIN_US_PAGE_URL)
    if (hasPublicJobListingSignal(joinUsPage.html)) {
      throw new Error('Anand Group join us page now appears to expose a public jobs board')
    }

    if (joinUsPage.status !== 200 || !hasOfficialJoinUsSignal(joinUsPage.html)) {
      throw new Error('Anand Group verified join us page no longer matches the known public surface')
    }

    const shopfloorPage = await fetchPage(SHOPFLOOR_PAGE_URL)
    if (shopfloorPage.status !== 200 || !hasOfficialShopfloorSignal(shopfloorPage.html)) {
      throw new Error('Anand Group verified shopfloor page no longer matches the known public surface')
    }

    const robotsTxt = await fetchPage(ROBOTS_TXT_URL)
    if (robotsTxt.status !== 200 || !hasExpectedRobotsSignal(robotsTxt.html)) {
      throw new Error('Anand Group verified robots.txt no longer matches the known public surface')
    }

    const sitemapIndex = await fetchPage(SITEMAP_INDEX_URL)
    if (
      sitemapIndex.status !== 200
      || !extractLocUrls(sitemapIndex.html).includes(PAGE_SITEMAP_URL)
    ) {
      throw new Error('Anand Group verified sitemap index no longer matches the known public surface')
    }

    const pageSitemap = await fetchPage(PAGE_SITEMAP_URL)
    const sitemapCareerUrls = extractExpectedCareerUrlsFromPageSitemap(pageSitemap.html)
    if (
      pageSitemap.status !== 200
      || sitemapCareerUrls.length !== EXPECTED_CAREER_URLS_FROM_PAGE_SITEMAP.length
      || !EXPECTED_CAREER_URLS_FROM_PAGE_SITEMAP.every((url, index) => sitemapCareerUrls[index] === url)
    ) {
      throw new Error('Anand Group verified page sitemap careers urls no longer match the known public surface')
    }

    for (const routeUrl of MISSING_JOB_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)

      if (!isKnownMissingJobRoute(routePage, routeUrl)) {
        throw new Error(`Anand Group verified missing common job route changed: ${getFinalUrl(routePage, routeUrl)}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createAnandGroupScraper().run(options)

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
