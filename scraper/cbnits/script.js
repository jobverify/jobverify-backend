import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { CBNITS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = CBNITS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/gi, '&')
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

export const hasOfficialCareersShellSignal = (html = '') => {
  const raw = String(html ?? '')
  return /CBNITS/i.test(raw)
    && /Agentic AI, Cybersecurity & Intelligent Enterprise Solutions/i.test(raw)
    && /<div id="root"><\/div>/i.test(raw)
    && /\/assets\/index-[A-Za-z0-9_-]+\.js/i.test(raw)
}

export const hasServerRenderedJobsSignal = (html = '') =>
  /current openings|apply now|job openings|latest job openings here|href=["'][^"']*(apply|job|career)[^"']*["']/i.test(
    normalizeWhitespace(html),
  )

export const extractBundleUrl = (html = '') => {
  const match = String(html ?? '').match(
    /<script[^>]+type=["']module["'][^>]+src=["'](\/assets\/index-[A-Za-z0-9_-]+\.js)["']/i,
  )
  if (!match) return null

  return new URL(match[1], CAREERS_URL).toString()
}

export const hasOfficialCareersBundleSignal = (javascript = '') => {
  const bundle = String(javascript ?? '')

  return /https:\/\/api\.cbnits\.com/i.test(bundle)
    && /getAllCareerPost/i.test(bundle)
    && /path:["']\/career["']/i.test(bundle)
    && /Join The CBNITS Team/i.test(bundle)
    && /Current career opportunities at CBNITS/i.test(bundle)
}

export const run = async ({ fetchText = defaultFetchText } = {}) => {
  const html = await fetchText(CAREERS_URL)

  if (hasServerRenderedJobsSignal(html)) {
    throw new Error('CBNITS server-rendered public jobs appeared on the verified SPA shell route')
  }

  if (!hasOfficialCareersShellSignal(html)) {
    throw new Error('CBNITS verified first-party careers shell changed materially')
  }

  const bundleUrl = extractBundleUrl(html)
  const bundle = bundleUrl ? await fetchText(bundleUrl) : ''
  if (!hasOfficialCareersBundleSignal(bundle)) {
    throw new Error('CBNITS verified first-party careers route bundle changed materially')
  }

  return []
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
