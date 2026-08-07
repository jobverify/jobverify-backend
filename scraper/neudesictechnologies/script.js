import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import NEUDESIC_TECHNOLOGIES_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = NEUDESIC_TECHNOLOGIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'
const ALLOWED_INFORMATIONAL_CAREERS_PATHS = new Set([
  '/careers/phishing-scams',
  '/careers/lca-notices',
])

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizePathname = (value = '') => {
  const normalized = String(value ?? '').trim().replace(/\/+$/, '')
  return normalized || '/'
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: `${SOURCE}-html`,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Careers(?:\s*-\s*Neudesic)?\s*<\/title>/i.test(page)
    && /Search India Openings by Region/i.test(text)
    && /linkedin\.com\/jobs\/search/i.test(page)
    && /Neudesic is an IBM subsidiary/i.test(text)
}

export const hasFirstPartyJobsSignal = (html = '') => {
  const page = String(html ?? '')

  if (/"@type"\s*:\s*"JobPosting"/i.test(page)) return true

  for (const match of page.matchAll(/href=["']([^"']+)["']/gi)) {
    let url

    try {
      url = new URL(match[1], CAREERS_URL)
    } catch {
      continue
    }

    if (url.origin !== new URL(CAREERS_URL).origin) continue

    const pathname = normalizePathname(url.pathname)
    if (pathname === normalizePathname(new URL(CAREERS_URL).pathname)) continue
    if (ALLOWED_INFORMATIONAL_CAREERS_PATHS.has(pathname)) continue

    if (/^\/(?:jobs?|openings?)(?:\/|$)/i.test(pathname)) return true
    if (/^\/careers?(?:\/|$)/i.test(pathname)) return true
  }

  return false
}

export const createNeudesicTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Neudesic careers shell no longer matches the trusted first-party surface')
    }

    if (hasFirstPartyJobsSignal(careersHtml)) {
      throw new Error('Neudesic now exposes a public first-party jobs surface')
    }

    return []
  },
})

export const run = async (options = {}) => createNeudesicTechnologiesScraper().run(options)

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
