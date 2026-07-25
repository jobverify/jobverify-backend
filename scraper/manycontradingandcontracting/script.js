import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'manycontradingandcontracting'
export const COMPANY = 'Manycon Trading and Contracting'
export const VERIFIED_AT = '2026-07-13'

export const HOMEPAGE_URL = 'https://manycon.com/'
export const ABOUT_URL = 'https://manycon.com/about/'
export const SITEMAP_INDEX_URL = 'https://manycon.com/sitemap_index.xml'
export const PAGE_SITEMAP_URL = 'https://manycon.com/page-sitemap.xml'
export const MISSING_ROUTE_URLS = [
  'https://manycon.com/careers',
  'https://manycon.com/careers/',
  'https://manycon.com/career',
  'https://manycon.com/career/',
  'https://manycon.com/jobs',
  'https://manycon.com/jobs/',
  'https://manycon.com/join-us',
  'https://manycon.com/join-us/',
  'https://manycon.com/work-with-us',
  'https://manycon.com/vacancies',
  'https://manycon.com/current-openings',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const ZERO_CAREERS_PATTERN = /\b(careers?|jobs?|vacanc(?:y|ies)|current openings|join us|work with us)\b/i

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&#x27;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeLower = (value) => normalizeWhitespace(value).toLowerCase()

const defaultFetchPage = async (url) => {
  const html = await fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    label: SOURCE,
    timeoutMs: 15000,
  })

  return {
    status: 200,
    url,
    html,
  }
}

const hasUnexpectedCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = normalizeLower(page)

  return ZERO_CAREERS_PATTERN.test(text)
    || /href=["']https:\/\/manycon\.com\/(?:careers?|jobs|join-us|work-with-us|vacancies|current-openings)\/?["']/i.test(page)
    || /<loc>https:\/\/manycon\.com\/(?:careers?|jobs|join-us|work-with-us|vacancies|current-openings)\/?<\/loc>/i.test(page)
}

const hasUnexpectedJobsContent = (html) => {
  const text = normalizeLower(html)

  return /\b(apply now|open positions|job openings|submit resume|send your cv|career search)\b/i.test(text)
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = normalizeLower(page)

  return /<title>\s*Home - Manycon India \| Expert Fire Protection, Coatings &amp; Construction Services\s*<\/title>/i.test(page)
    && /<link rel="canonical" href="https:\/\/manycon\.com\/"\s*\/?>/i.test(page)
    && text.includes('welcome to manycon')
    && text.includes('qatar & saudi arabia leading fireproofing services')
    && text.includes("qatar & saudi arabia's qcdd-approved certified experts")
    && text.includes("proudly serving qatar's & saudi arabia's top companies and organizations")
    && /href=["']https:\/\/manycon\.com\/about\/["']/i.test(page)
    && /href=["']https:\/\/manycon\.com\/contact\/["']/i.test(page)
    && /href=["']https:\/\/manycon\.com\/fireproofing-services\/["']/i.test(page)
    && /href=["']https:\/\/manycon\.com\/construction-solutions\/["']/i.test(page)
    && !hasUnexpectedCareersSignal(page)
}

export const hasOfficialAboutSignal = (html) => {
  const page = String(html ?? '')
  const text = normalizeLower(page)

  return /<title>\s*About Us - Manycon India \| Expert Fire Protection, Coatings &amp; Construction Services\s*<\/title>/i.test(page)
    && /<link rel="canonical" href="https:\/\/manycon\.com\/about\/"\s*\/?>/i.test(page)
    && text.includes('3,200+ firestop projects in qatar | 100+ in saudi arabia')
    && text.includes('mega manycon brings unmatched regional experience to every project')
    && text.includes('completed major commercial and industrial projects across qatar and saudi arabia')
    && !hasUnexpectedCareersSignal(page)
}

export const hasOfficialSitemapIndexSignal = (xml) => {
  const sitemap = String(xml ?? '')

  return /<loc><!\[CDATA\[https:\/\/manycon\.com\/post-sitemap\.xml\]\]><\/loc>/i.test(sitemap)
    && /<loc><!\[CDATA\[https:\/\/manycon\.com\/page-sitemap\.xml\]\]><\/loc>/i.test(sitemap)
    && /<loc><!\[CDATA\[https:\/\/manycon\.com\/category-sitemap\.xml\]\]><\/loc>/i.test(sitemap)
    && !hasUnexpectedCareersSignal(sitemap)
}

export const hasOfficialPageSitemapSignal = (xml) => {
  const sitemap = String(xml ?? '')

  return /<loc>https:\/\/manycon\.com\/<\/loc>/i.test(sitemap)
    && /<loc>https:\/\/manycon\.com\/about\/<\/loc>/i.test(sitemap)
    && /<loc>https:\/\/manycon\.com\/contact\/<\/loc>/i.test(sitemap)
    && /<loc>https:\/\/manycon\.com\/fireproofing-services\/<\/loc>/i.test(sitemap)
    && /<loc>https:\/\/manycon\.com\/construction-solutions\/<\/loc>/i.test(sitemap)
    && !hasUnexpectedCareersSignal(sitemap)
}

export const isVerifiedMissingRoute = ({ status, html }) => {
  const page = String(html ?? '')
  const text = normalizeLower(page)

  return status === 404
    && /<title>\s*Page not found - Manycon India \| Expert Fire Protection, Coatings &amp; Construction Services\s*<\/title>/i.test(page)
    && text.includes('oops! that page can’t be found')
    && text.includes('it looks like nothing was found at this location')
    && !hasUnexpectedJobsContent(page)
}

export const createManyconTradingAndContractingScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Manycon Trading and Contracting verified homepage no longer matches the known first-party surface')
    }

    const aboutPage = await fetchPage(ABOUT_URL)
    if (aboutPage.status !== 200 || !hasOfficialAboutSignal(aboutPage.html)) {
      throw new Error('Manycon Trading and Contracting verified about page no longer matches the known first-party surface')
    }

    const sitemapIndex = await fetchPage(SITEMAP_INDEX_URL)
    if (sitemapIndex.status !== 200 || !hasOfficialSitemapIndexSignal(sitemapIndex.html)) {
      throw new Error('Manycon Trading and Contracting verified sitemap index no longer matches the known first-party surface')
    }

    const pageSitemap = await fetchPage(PAGE_SITEMAP_URL)
    if (pageSitemap.status !== 200 || !hasOfficialPageSitemapSignal(pageSitemap.html)) {
      throw new Error('Manycon Trading and Contracting verified page sitemap no longer matches the known first-party surface')
    }

    for (const url of MISSING_ROUTE_URLS) {
      const page = await fetchPage(url)
      if (!isVerifiedMissingRoute(page)) {
        throw new Error(`Manycon Trading and Contracting missing-route validation failed for ${url}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createManyconTradingAndContractingScraper().run(options)

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
