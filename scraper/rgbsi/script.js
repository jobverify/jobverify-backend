import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'

import {
  BOARD_URL,
  LISTING_API_URL,
  RGBSI_CATALOG,
} from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = RGBSI_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export { BOARD_URL }

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value = '') => String(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
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

const defaultFetchJson = (url, options = {}) => fetchJsonWithRetry(url, {
  method: options.method,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
    Referer: BOARD_URL,
    ...(options.headers || {}),
  },
  body: options.body,
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasVerifiedBoardSignal = (html = '') => {
  const page = String(html)
  const normalized = normalizeWhitespace(html)
  return normalized.includes('RGBSI')
    && normalized.includes('Careers at RGBSI')
    && normalized.includes('Jobs at RGBSI')
    && /rgbsi\.com/i.test(page)
  }

const isIndiaLocation = (record = {}) => {
  const country = String(record?.location?.country || '').toLowerCase()
  const fullLocation = String(record?.location?.fullLocation || '')
  return country === 'in' || /\bIndia\b/i.test(fullLocation)
}

export const createRgbsiScraper = () => ({
  async run({ fetchText = defaultFetchText, fetchJson = defaultFetchJson } = {}) {
    const boardHtml = await fetchText(BOARD_URL)
    if (!hasVerifiedBoardSignal(boardHtml)) {
      throw new Error('RGBSI verified SmartRecruiters board no longer matches the trusted exact-name contract')
    }

    const url = new URL(LISTING_API_URL)
    url.searchParams.set('limit', '100')
    url.searchParams.set('country', 'in')
    url.searchParams.set('offset', '0')

    const payload = await fetchJson(url.toString())
    const records = Array.isArray(payload?.content) ? payload.content : []
    const indiaRecords = records.filter(isIndiaLocation)

    return indiaRecords.map((record) => ({
      title: record.name,
      company: COMPANY,
      location: record.location?.fullLocation || null,
      city: record.location?.city || null,
      country: 'India',
      department: record.department?.label || null,
      employmentType: record.typeOfEmployment?.label || null,
      experienceRequired: record.experienceLevel?.label || null,
      jobId: record.id || null,
      requisitionId: record.refNumber || record.id || null,
      sourceUrl: record.postingUrl || BOARD_URL,
      applyUrl: record.applyUrl || record.postingUrl || BOARD_URL,
      link: record.postingUrl || BOARD_URL,
      jobDescription: null,
      source: SOURCE,
      scrapedAt: new Date().toISOString(),
    })).sort((left, right) => left.title.localeCompare(right.title))
  },
})

export const run = async (options = {}) => createRgbsiScraper(options).run(options)

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
