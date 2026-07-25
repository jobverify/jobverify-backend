import path from 'node:path'
import { fileURLToPath } from 'node:url'

import SCIOMS_CATALOG from './catalog.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = SCIOMS_CATALOG.source
export const COMPANY = SCIOMS_CATALOG.companyName
export const PROVIDER_METADATA = SCIOMS_CATALOG
export const VERIFIED_ON = SCIOMS_CATALOG.verifiedOn
export const CAREERS_URL = SCIOMS_CATALOG.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const defaultFetchText = (url) =>
  fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    label: SOURCE,
    timeoutMs: 15000,
  })

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()

const PUBLIC_JOB_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bjob openings\b/i,
  /\bjob id\b/i,
  /\brequisition\b/i,
  /\/job(s)?\//i,
]

export const hasPublicJobListingsSignal = (html) =>
  PUBLIC_JOB_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasVerifiedCareersSignal = (html) => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('Careers at SCIO')
    && normalized.includes('Build a Meaningful Career')
    && normalized.includes('Shape the Future of Healthcare Revenue')
    && normalized.includes('Roles across Operations')
    && normalized.includes('Apply Now')
}

export const run = async ({ fetchText = defaultFetchText } = {}) => {
  const careersHtml = await fetchText(CAREERS_URL)

  if (!hasVerifiedCareersSignal(careersHtml)) {
    throw new Error('Response is not the verified SCIO Management Solutions careers shell')
  }

  if (hasPublicJobListingsSignal(careersHtml)) {
    throw new Error('SCIO Management Solutions careers page now exposes public job listings')
  }

  return []
}

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
