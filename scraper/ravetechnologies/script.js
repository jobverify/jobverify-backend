import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { RAVE_TECHNOLOGIES_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const LEGACY_BRAND_URL = PROVIDER_METADATA.homepageUrl
export const SUCCESSOR_HOMEPAGE_URL = PROVIDER_METADATA.successorHomepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const TRANSITION_EVIDENCE_URL = PROVIDER_METADATA.transitionEvidenceUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

export const hasJsRequiredChallengeSignal = (html = '') => {
  const normalized = normalizeWhitespace(html).toLowerCase()
  return normalized.includes('javascript is required')
    && normalized.includes('please enable javascript before you are allowed to see this page')
}

export const hasPublicJobsSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return /\bOpen Positions\b/i.test(normalized)
    || /\bApply now\b/i.test(normalized)
    || /href=["'][^"']*(?:\/jobs?\/|\/careers?\/)[^"']*["']/i.test(String(html ?? ''))
}

export const createRaveTechnologiesScraper = () => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const successorHomepageHtml = await fetchText(SUCCESSOR_HOMEPAGE_URL)
    if (!hasJsRequiredChallengeSignal(successorHomepageHtml)) {
      throw new Error(
        'Rave Technologies verified successor homepage no longer matches the trusted JavaScript-required shell',
      )
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (hasPublicJobsSignal(careersHtml)) {
      throw new Error('Rave Technologies successor careers surface now appears to expose public jobs')
    }

    if (!hasJsRequiredChallengeSignal(careersHtml)) {
      throw new Error(
        'Rave Technologies verified successor careers page no longer matches the trusted JavaScript-required shell',
      )
    }

    return []
  },
})

export const run = async (options = {}) => createRaveTechnologiesScraper().run(options)

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
