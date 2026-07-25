import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { FINCARE_SMALL_FINANCE_BANK_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = FINCARE_SMALL_FINANCE_BANK_CATALOG.source
export const COMPANY = FINCARE_SMALL_FINANCE_BANK_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = FINCARE_SMALL_FINANCE_BANK_CATALOG.officialBrandName
export const VERIFIED_ON = FINCARE_SMALL_FINANCE_BANK_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = FINCARE_SMALL_FINANCE_BANK_CATALOG.verifiedSurfaceSummary
export const PROVIDER_METADATA = FINCARE_SMALL_FINANCE_BANK_CATALOG
export const LEGACY_HOMEPAGE_URL = FINCARE_SMALL_FINANCE_BANK_CATALOG.legacyHomepageUrl
export const LEGACY_HOMEPAGE_NO_WWW_URL = FINCARE_SMALL_FINANCE_BANK_CATALOG.legacyHomepageNoWwwUrl
export const MERGED_PARENT_HOMEPAGE_URL = FINCARE_SMALL_FINANCE_BANK_CATALOG.mergedParentHomepageUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    url.hash = ''
    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.replace(/\/+$/, '')
    }
    return url.toString()
  } catch {
    return null
  }
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

export const hasMergedParentHomepageSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*Personal, Business, Corporate, and NRI Banking \| AU Small Finance Bank\s*<\/title>/i.test(rawHtml)
    && /\bAU Small Finance Bank\b/i.test(normalized)
    && /\bPersonal, Business, Corporate, and NRI Banking\b/i.test(normalized)
    && /\bFincare NetBanking\b/i.test(normalized)
    && /\bFincare Corporate NetBanking\b/i.test(normalized)
}

export const isVerifiedMergedHomepageRedirect = (page = {}) =>
  Number(page.status) === 200
  && normalizeUrl(page.url) === normalizeUrl(MERGED_PARENT_HOMEPAGE_URL)
  && hasMergedParentHomepageSignal(page.html)

export const createFincareSmallFinanceBankScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const legacyHomepage = await fetchPage(LEGACY_HOMEPAGE_URL)
    if (normalizeUrl(legacyHomepage.url) !== normalizeUrl(MERGED_PARENT_HOMEPAGE_URL)) {
      throw new Error('Fincare Small Finance Bank verified legacy Fincare homepage redirect no longer matches the pinned AU homepage handoff')
    }
    if (!isVerifiedMergedHomepageRedirect(legacyHomepage)) {
      throw new Error('Fincare Small Finance Bank verified merged AU homepage no longer matches the pinned public surface')
    }

    const legacyHomepageNoWww = await fetchPage(LEGACY_HOMEPAGE_NO_WWW_URL)
    if (normalizeUrl(legacyHomepageNoWww.url) !== normalizeUrl(MERGED_PARENT_HOMEPAGE_URL)) {
      throw new Error('Fincare Small Finance Bank verified legacy Fincare no-www homepage redirect no longer matches the pinned AU homepage handoff')
    }
    if (!isVerifiedMergedHomepageRedirect(legacyHomepageNoWww)) {
      throw new Error('Fincare Small Finance Bank verified merged AU homepage no longer matches the pinned no-www public surface')
    }

    return []
  },
})

export const run = async (options = {}) => createFincareSmallFinanceBankScraper().run(options)

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
