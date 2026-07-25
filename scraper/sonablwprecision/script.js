import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { SONA_BLW_PRECISION_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOB_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions?\b/i,
  /\bapply now\b/i,
  /\bview jobs\b/i,
  /\bsearch jobs\b/i,
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /successfactors/i,
  /darwinbox/i,
]

export const PROVIDER_METADATA = SONA_BLW_PRECISION_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const CAREER_PAGE_URL = PROVIDER_METADATA.companyCareerPage
export const ABOUT_PAGE_URL = PROVIDER_METADATA.officialCompanyPageUrl
export const CULTURE_PAGE_URL = PROVIDER_METADATA.officialCulturePageUrl
export const CAUTION_NOTICE_URL = PROVIDER_METADATA.cautionNoticeUrl

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'sonablwprecision-html',
  timeoutMs: 15000,
})

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export const extractCautionNoticeUrl = (html = '') =>
  String(html ?? '').match(
    /href=["'](https:\/\/api\.procuzy\.com\/sonacomstar\/public\/pdf\/cautionary_notice_against_fake_employment_or_offers_etc\.pdf)["']/i,
  )?.[1] ?? null

export const pageExposesPublicJobListings = (html = '') =>
  PUBLIC_JOB_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasOfficialCareerPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Sona Comstar - Career\s*<\/title>/i.test(page)
    && normalized.includes('Explore A career with sona comstar')
    && normalized.includes('We are always eager to meet fresh talent.')
    && normalized.includes('Apply at SONA COMSTAR')
    && normalized.includes('Upload Resume')
    && normalized.includes('enquiry@sonacomstar.com')
}

export const hasOfficialAboutPageSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('Sona BLW Precision Forgings Limited')
    && normalized.includes('CIN: L27300HR1995PLC083037')
    && normalized.includes('enquiry@sonacomstar.com')
    && normalized.includes('Cautionary Notice against fake employment or offers etc.')
    && extractCautionNoticeUrl(html) === CAUTION_NOTICE_URL
}

export const isExpectedTimeoutError = (error) => {
  const combined = [
    String(error?.message ?? ''),
    String(error?.code ?? ''),
    String(error?.cause?.code ?? ''),
    String(error?.cause?.message ?? ''),
  ].join(' ')

  return /UND_ERR_CONNECT_TIMEOUT/i.test(combined)
    || /Connect Timeout Error/i.test(combined)
}

export const createSonaBlwPrecisionScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    let careerPageHtml
    try {
      careerPageHtml = await fetchText(CAREER_PAGE_URL)
    } catch (error) {
      if (isExpectedTimeoutError(error)) return []
      throw error
    }

    if (pageExposesPublicJobListings(careerPageHtml)) {
      throw new Error('Sona BLW Precision career page now appears to expose public jobs')
    }

    if (!hasOfficialCareerPageSignal(careerPageHtml)) {
      throw new Error('Sona BLW Precision verified career page changed materially')
    }

    let aboutPageHtml
    try {
      aboutPageHtml = await fetchText(ABOUT_PAGE_URL)
    } catch (error) {
      if (isExpectedTimeoutError(error)) return []
      throw error
    }

    if (pageExposesPublicJobListings(aboutPageHtml)) {
      throw new Error('Sona BLW Precision legal entity page now appears to expose public jobs')
    }

    if (!hasOfficialAboutPageSignal(aboutPageHtml)) {
      throw new Error('Sona BLW Precision verified legal entity page changed materially')
    }

    return []
  },
})

export const run = async (options = {}) => createSonaBlwPrecisionScraper().run(options)

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
