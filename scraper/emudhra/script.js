import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { EMUDHRA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = EMUDHRA_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREER_PAGE_URL = PROVIDER_METADATA.careerPageUrl
export const GLOBAL_CAREER_PAGE_URL = PROVIDER_METADATA.globalCareerPageUrl
export const PUBLISHED_OPENINGS_URL = PROVIDER_METADATA.publishedOpeningsUrl
export const CHECKED_BROKEN_OPENINGS_URLS = [...PROVIDER_METADATA.checkedBrokenOpeningsUrls]
export const SITEMAP_URL = PROVIDER_METADATA.sitemapUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bjobposting\b/i,
  /\bsearch jobs\b/i,
  /\bapply now\b/i,
  /\bjob description\b/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /smartrecruiters/i,
  /jobvite/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /darwinbox/i,
  /icims/i,
  /successfactors/i,
  /oraclecloud/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const extractTitle = (html = '') => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1]) || null
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

export const hasPublicJobsSignal = (html = '') =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasHomepageSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return extractTitle(rawHtml) === 'eMudhra | Digital Signature & PKI Services in India'
    && normalized.includes('Your Digital Trust and Cybersecurity, Powered by eMudhra')
    && normalized.includes('Sign, Secure, Succeed.')
}

export const hasIndiaCareersSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return extractTitle(rawHtml) === 'Careers at eMudhra – Join Our Innovative Team - India'
    && normalized.includes('Current Openings')
    && normalized.includes('Open Positions')
    && normalized.includes('Explore Opportunities')
    && normalized.includes('See all openings')
    && /id=["']footer-india["']/i.test(rawHtml)
    && rawHtml.includes(PUBLISHED_OPENINGS_URL)
    && !hasPublicJobsSignal(rawHtml)
}

export const hasGlobalCareersSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return extractTitle(rawHtml) === 'Careers at eMudhra – Join Our Innovative Team - USA'
    && normalized.includes('Current Openings')
    && normalized.includes('Open Positions')
    && normalized.includes('Explore Opportunities')
    && normalized.includes('See all openings')
    && rawHtml.includes(PUBLISHED_OPENINGS_URL)
    && !hasPublicJobsSignal(rawHtml)
}

export const hasBrokenOpeningsSignal = (page = {}) => {
  const rawHtml = String(page?.html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return Number(page?.status) === 404
    && extractTitle(rawHtml) === 'Page Not Found | eMudhra'
    && normalized.includes('Page Not Found')
    && normalized.includes("The page you're looking for doesn't exist or has been moved.")
    && normalized.includes('Go to Homepage')
    && !hasPublicJobsSignal(rawHtml)
}

export const sitemapHasCareersRoute = (xml = '') => {
  const rawXml = String(xml ?? '')

  return /<loc>\s*https:\/\/emudhra\.com\/en\/careers\s*<\/loc>/i.test(rawXml)
    && /href=["']https:\/\/emudhra\.com\/en-in\/careers["']/i.test(rawXml)
}

export const sitemapListsOpeningsRoute = (xml = '') => (
  /https:\/\/emudhra\.com\/en(?:-in)?\/careers-open-positions/i.test(String(xml ?? ''))
)

export const createEmudhraScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (Number(homepage.status) !== 200 || !hasHomepageSignal(homepage.html)) {
      throw new Error('eMudhra verified homepage no longer matches the known India homepage surface')
    }

    const indiaCareersPage = await fetchPage(CAREER_PAGE_URL)

    if (Number(indiaCareersPage.status) !== 200 || !hasIndiaCareersSignal(indiaCareersPage.html)) {
      throw new Error('eMudhra verified India careers page no longer matches the known first-party surface')
    }

    const globalCareersPage = await fetchPage(GLOBAL_CAREER_PAGE_URL)

    if (Number(globalCareersPage.status) !== 200 || !hasGlobalCareersSignal(globalCareersPage.html)) {
      throw new Error('eMudhra verified global careers page no longer matches the known first-party surface')
    }

    for (const routeUrl of CHECKED_BROKEN_OPENINGS_URLS) {
      const routePage = await fetchPage(routeUrl)

      if (!hasBrokenOpeningsSignal(routePage)) {
        throw new Error(`eMudhra verified broken openings route changed: ${routeUrl}`)
      }
    }

    const sitemapPage = await fetchPage(SITEMAP_URL)

    if (
      Number(sitemapPage.status) !== 200
      || !sitemapHasCareersRoute(sitemapPage.html)
      || sitemapListsOpeningsRoute(sitemapPage.html)
    ) {
      throw new Error('eMudhra verified sitemap changed')
    }

    return []
  },
})

export const run = async (options = {}) => createEmudhraScraper().run(options)

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
