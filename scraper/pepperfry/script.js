import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { launchBrowser, createOptimizedPage } from '../../scraper-support/utils/browser.js'

import { PEPPERFRY_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PUBLIC_JOB_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions?\b/i,
  /\bjob openings?\b/i,
  /\bcareer opportunities\b/i,
  /\bsearch jobs\b/i,
  /\bapply now\b/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /darwinbox/i,
  /successfactors/i,
  /oraclecloud/i,
  /icims/i,
  /taleo/i,
]

export const SOURCE = PEPPERFRY_CATALOG.source
export const COMPANY = PEPPERFRY_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = PEPPERFRY_CATALOG.officialBrandName
export const VERIFIED_ON = PEPPERFRY_CATALOG.verifiedOn
export const PROVIDER_METADATA = PEPPERFRY_CATALOG
export const HOMEPAGE_URL = PEPPERFRY_CATALOG.homepageUrl
export const CAREERS_PAGE_URL = PEPPERFRY_CATALOG.companyCareerPage

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&lsquo;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const matchesExpectedUrl = (value, expected) => {
  try {
    const actualUrl = new URL(value)
    const expectedUrl = new URL(expected)
    const normalizePath = (pathname) => pathname === '/' ? '/' : pathname.replace(/\/+$/g, '')

    return actualUrl.hostname.replace(/^www\./i, '').toLowerCase() === expectedUrl.hostname.replace(/^www\./i, '').toLowerCase()
      && normalizePath(actualUrl.pathname) === normalizePath(expectedUrl.pathname)
      && actualUrl.search === expectedUrl.search
  } catch {
    return false
  }
}

export const pageExposesPublicJobListings = (html = '') =>
  PUBLIC_JOB_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasOfficialHomepageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /Buy Furniture & Home Decor Online/i.test(page)
    && normalized.includes("Buy Furniture Online at Pepperfry- India's All-in-One Furniture Solution for Your Needs")
    && normalized.includes('Corporate Governance')
    && normalized.includes('Pepperfry in the News')
}

export const extractVerifiedCareersPageUrl = (html = '') => {
  const match = String(html ?? '').match(
    /https:\/\/www\.pepperfry\.com\/pages\/careers\.html\?type=footer/i,
  )

  return match?.[0] || null
}

export const hasMissingCareersSurfaceSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('404-Soul Not Found')
    && normalized.includes('Page Also Not Found')
    && normalized.includes('GO BACK & RETRY')
}

const createBrowserPageFetcher = async () => {
  const browser = await launchBrowser()
  const page = await createOptimizedPage(browser)

  return {
    fetchPage: async (url) => {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      })
      await page.waitForSelector('body', { timeout: 10000 }).catch(() => null)

      return {
        status: response?.status?.() ?? 200,
        url: page.url(),
        html: await page.content(),
      }
    },
    close: async () => browser.close(),
  }
}

export const createPepperfryScraper = () => ({
  async run({ fetchPage } = {}) {
    let browserContext = null

    try {
      if (!fetchPage) {
        browserContext = await createBrowserPageFetcher()
        fetchPage = browserContext.fetchPage
      }

      const homepage = await fetchPage(HOMEPAGE_URL)
      if (
        Number(homepage.status) !== 200
        || !matchesExpectedUrl(homepage.url, HOMEPAGE_URL)
        || !hasOfficialHomepageSignal(homepage.html)
      ) {
        throw new Error('Pepperfry verified official homepage changed materially')
      }

      const verifiedCareersPageUrl = extractVerifiedCareersPageUrl(homepage.html)
      if (!matchesExpectedUrl(verifiedCareersPageUrl, CAREERS_PAGE_URL)) {
        throw new Error('Pepperfry verified homepage careers handoff changed materially')
      }

      const careersPage = await fetchPage(CAREERS_PAGE_URL)

      if (pageExposesPublicJobListings(careersPage.html)) {
        throw new Error('Pepperfry careers surface now appears to expose public jobs')
      }

      if (
        matchesExpectedUrl(careersPage.url, CAREERS_PAGE_URL)
        && hasMissingCareersSurfaceSignal(careersPage.html)
      ) {
        return []
      }

      throw new Error('Pepperfry verified missing careers surface changed materially')
    } finally {
      if (browserContext) {
        await browserContext.close()
      }
    }
  },
})

export const run = async (options = {}) => createPepperfryScraper().run(options)

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
