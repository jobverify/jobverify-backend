import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { STERLITE_TECHNOLOGIES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = STERLITE_TECHNOLOGIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const LINKED_JOBS_PORTAL_URL = PROVIDER_METADATA.linkedJobsPortalUrl
export const LINKED_JOBS_PORTAL_HOST = PROVIDER_METADATA.linkedJobsPortalHost
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/&nbsp;|\u00a0/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()

const ENUMERABLE_PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings?\b/i,
  /\bopen positions?\b/i,
  /\bsearch jobs\b/i,
  /\bjob id\b/i,
  /#detail\/job\/\d+/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /smartrecruiters/i,
  /darwinbox/i,
]

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasEnumerablePublicJobsSignal = (html = '') =>
  ENUMERABLE_PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Join STL Tech \| Life at STL Tech \| Careers\s*<\/title>/i.test(page)
    && normalized.includes('WORLD OF OPPORTUNITIES')
    && normalized.includes('Join us')
    && normalized.includes('Apply for your next job here')
    && normalized.includes(LINKED_JOBS_PORTAL_URL)
    && normalized.includes('STL Tech All Rights Reserved')
  }

export const createSterliteTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Sterlite Technologies verified first-party careers page no longer matches the handoff surface')
    }

    if (hasEnumerablePublicJobsSignal(careersHtml)) {
      throw new Error('Sterlite Technologies first-party careers page now exposes enumerable public jobs')
    }

    return []
  },
})

export const run = async (options = {}) => createSterliteTechnologiesScraper(options).run(options)

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
