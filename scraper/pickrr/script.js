import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { PICKRR_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = PICKRR_CATALOG.source
export const COMPANY = PICKRR_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = PICKRR_CATALOG.officialBrandName
export const VERIFIED_ON = PICKRR_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PICKRR_CATALOG.verifiedSurfaceSummary
export const HOMEPAGE_URL = PICKRR_CATALOG.homepageUrl
export const CAREERS_LANDING_URL = PICKRR_CATALOG.companyCareerPage
export const SITEMAP_URL = PICKRR_CATALOG.officialSitemapUrl
export const CAREERS_404_URL = PICKRR_CATALOG.official404CareersUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOB_SIGNAL_PATTERNS = [
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards(?:\.eu)?\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /\bapply now\b/i,
  /\bjob-post\b/i,
  /\bjob-role\b/i,
]

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const stripHtmlComments = (html) =>
  String(html ?? '').replace(/<!--[\s\S]*?-->/g, ' ')

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*eCommerce Logistics Shipping Solutions & Courier Aggregator India \| Pickrr\s*<\/title>/i.test(page)
    && /Pickrr is India's largest ecommerce logistics solution/i.test(page)
    && /href="https:\/\/www\.pickrr\.com\/"/i.test(page)
    && /Get Guaranteed Rs\.300 Cashback/i.test(page)
    && /support@pickrr\.com/i.test(page)
    && /life-at-pickrr/i.test(page)
}

export const hasVerifiedLifeAtPickrrSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Life at Pickrr - Grow your Career with Pickrr\s*<\/title>/i.test(page)
    && /Pickrr believes that each one of us should be able to find our dream career/i.test(page)
    && /href="https:\/\/www\.pickrr\.com\/life-at-pickrr\/"/i.test(page)
    && /Come join us/i.test(page)
    && /Pickrr Growth Story/i.test(page)
    && /Life at Pickrr/i.test(page)
    && /Send us your Resume/i.test(page)
    && /Upload your resume/i.test(page)
}

export const hasVerifiedNotFoundCareersSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Page Not Found - Pickrr\s*<\/title>/i.test(page)
    && /Uh-oh!\s*You[’']re lost/i.test(page)
    && /The page you are looking for does not exist/i.test(page)
    && /href="https:\/\/pickrr\.com\/"/i.test(page)
}

const extractSitemapLocs = (xml) =>
  Array.from(String(xml ?? '').matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi), (match) => match[1].trim())

export const sitemapHasLifeAtPickrrRoute = (xml) =>
  extractSitemapLocs(xml).some((loc) => /^https:\/\/www\.pickrr\.com\/life-at-pickrr\/?$/i.test(loc))

export const sitemapHasPublicCareersRoute = (xml) =>
  extractSitemapLocs(xml).some((loc) => /^https:\/\/www\.pickrr\.com\/careers\/?$/i.test(loc))

export const hasPublicJobsSignal = (html) => {
  const visiblePage = stripHtmlComments(html)
  return PUBLIC_JOB_SIGNAL_PATTERNS.some((pattern) => pattern.test(visiblePage))
}

export const createPickrrScraper = () => ({
  async run({
    fetchPage = defaultFetchPage,
  } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Pickrr verified homepage no longer matches the official first-party surface')
    }

    const sitemap = await fetchPage(SITEMAP_URL)
    if (sitemap.status !== 200 || !sitemapHasLifeAtPickrrRoute(sitemap.html)) {
      throw new Error('Pickrr verified sitemap no longer matches the official first-party route contract')
    }
    if (sitemapHasPublicCareersRoute(sitemap.html)) {
      throw new Error('Pickrr verified sitemap now exposes a public careers route')
    }

    const lifeAtPickrrPage = await fetchPage(CAREERS_LANDING_URL)
    if (lifeAtPickrrPage.status !== 200 || !hasVerifiedLifeAtPickrrSignal(lifeAtPickrrPage.html)) {
      throw new Error('Pickrr verified life-at-pickrr page no longer matches the official first-party careers surface')
    }
    if (hasPublicJobsSignal(lifeAtPickrrPage.html)) {
      throw new Error('Pickrr official careers form surface now appears to expose public jobs')
    }

    const careers404Page = await fetchPage(CAREERS_404_URL)
    if (careers404Page.status !== 404 || !hasVerifiedNotFoundCareersSignal(careers404Page.html)) {
      throw new Error('Pickrr verified careers not-found contract no longer matches the official first-party surface')
    }

    return []
  },
})

export const run = async (options = {}) => createPickrrScraper().run(options)

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
