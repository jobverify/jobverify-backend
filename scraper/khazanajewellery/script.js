import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { KHAZANA_JEWELLERY_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = KHAZANA_JEWELLERY_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const OFFICIAL_CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const CAREERS_APPLY_EMAIL = PROVIDER_METADATA.careersApplyEmail
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'
const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bopen positions?\b/i,
  /\bjob openings?\b/i,
  /\bsearch jobs\b/i,
  /\bapply now\b/i,
  /boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /darwinbox/i,
  /successfactors/i,
  /oraclecloud/i,
]

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;|&#x27;|&#8217;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const extractTitle = (html = '') => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1])
}

export const isCloudflareInterstitial = (html = '') => {
  const text = normalizeWhitespace(html) || ''

  return extractTitle(html) === 'Just a moment...'
    || text.includes('Enable JavaScript and cookies to continue')
    || /__cf_chl/i.test(String(html ?? ''))
}

export const hasPublicJobsSignal = (html = '') =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasKhazanaCareersSignal = (html = '') => {
  const text = normalizeWhitespace(html) || ''

  return extractTitle(html) === 'Join Our Team | Careers at Khazana Jewellery'
    && text.includes('OUR POLICY')
    && text.includes('COME JOIN US!')
    && text.includes(CAREERS_APPLY_EMAIL)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createKhazanaJewelleryScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)

    if (hasPublicJobsSignal(careersHtml)) {
      throw new Error('Khazana Jewellery verified careers page appears to expose public jobs')
    }

    if (hasKhazanaCareersSignal(careersHtml)) {
      return []
    }

    if (isCloudflareInterstitial(careersHtml)) {
      return []
    }

    throw new Error('Khazana Jewellery verified official careers page no longer matches the known email-only surface')
  },
})

export const run = async (options = {}) => createKhazanaJewelleryScraper().run(options)

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
