import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { MSC_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = MSC_CATALOG.source
export const COMPANY = MSC_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = MSC_CATALOG.officialBrandName
export const HOMEPAGE_URL = MSC_CATALOG.homepageUrl
export const CAREERS_URL = MSC_CATALOG.companyCareerPage
export const COMPANY_DOMAIN = MSC_CATALOG.companyDomain
export const VERIFIED_ON = MSC_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = MSC_CATALOG.verifiedSurfaceSummary
export const PROVIDER_METADATA = MSC_CATALOG

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const PUBLIC_JOB_PATTERNS = [
  /\bapply now\b/i,
  /\bapply here\b/i,
  /\bjob openings?\b/i,
  /\bopen positions?\b/i,
  /\bcurrent openings?\b/i,
  /"@type"\s*:\s*"JobPosting"/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /teamtailor/i,
  /workable/i,
  /darwinbox/i,
]

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

export const hasVerifiedMscCareersSignal = (html = '') => {
  const text = (normalizeWhitespace(html) || '').toLowerCase()

  return text.includes('careers at msc')
    && text.includes('our vacancies')
    && text.includes('unfortunately, we do not have any vacancies published in this country right now')
    && text.includes('please apply online by following the instructions in the relevant job posting on our linkedin page')
    && text.includes('you can find a full list of our current vacancies on our linkedin job portal')
}

export const hasVerifiedMscAccessDeniedSignal = (html = '') => {
  const text = (normalizeWhitespace(html) || '').toLowerCase()

  return text.includes('access denied')
    && text.includes("you don't have permission to access")
    && text.includes('msc.com/en/careers')
}

export const hasPublicMscJobSignals = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page) || ''

  return PUBLIC_JOB_PATTERNS.some((pattern) => pattern.test(page) || pattern.test(text))
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'msc-official',
  timeoutMs: 15000,
})

export const createMscScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (hasPublicMscJobSignals(careersHtml)) {
      throw new Error('MSC careers route now appears to expose a public jobs surface')
    }

    if (hasVerifiedMscCareersSignal(careersHtml) || hasVerifiedMscAccessDeniedSignal(careersHtml)) {
      return []
    }

    throw new Error('MSC verified careers surface no longer matches the known no-public-jobs state')
  },
})

export const run = async (options = {}) => createMscScraper().run(options)

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
