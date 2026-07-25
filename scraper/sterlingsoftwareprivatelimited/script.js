import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { STERLING_SOFTWARE_PRIVATE_LIMITED_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = STERLING_SOFTWARE_PRIVATE_LIMITED_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&#x27;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const extractHtmlComments = (html = '') => [...String(html ?? '').matchAll(/<!--([\s\S]*?)-->/g)]
  .map((match) => match[1])

export const hasVerifiedCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Career\s*\|\s*Sterling\s*\|\s*Financial Technology\.\s*Digital\.\s*Consulting\s*<\/title>/i.test(page)
    && normalized.includes('Work at Sterling')
    && normalized.includes('Current Opening')
    && normalized.includes('stimulating work environment')
    && normalized.includes('Careers')
  }

export const hasOnlyCommentedHistoricalOpenings = (html = '') => {
  const page = String(html ?? '')
  const withoutComments = page.replace(/<!--[\s\S]*?-->/g, '')
  const comments = extractHtmlComments(page).join(' ')

  const hasCommentedRows = /Application Engineer/i.test(comments)
    && /Java/i.test(comments)
    && /Chennai/i.test(comments)
    && /View more/i.test(comments)

  const exposesLiveRows = /Application Engineer/i.test(withoutComments)
    || /Java/i.test(withoutComments)
    || /job_listing/i.test(withoutComments)
    || /View more/i.test(withoutComments)

  return hasCommentedRows && !exposesLiveRows
}

export const createSterlingSoftwarePrivateLimitedScraper = () => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasVerifiedCareersSignal(careersHtml)) {
      throw new Error('The verified Sterling careers page no longer matches the trusted first-party surface')
    }

    if (!hasOnlyCommentedHistoricalOpenings(careersHtml)) {
      throw new Error('The verified Sterling careers page now exposes live public openings')
    }

    return []
  },
})

export const run = async (options = {}) => createSterlingSoftwarePrivateLimitedScraper().run(options)

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
