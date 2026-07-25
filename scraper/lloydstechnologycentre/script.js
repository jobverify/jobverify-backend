import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { LLOYDS_TECHNOLOGY_CENTRE_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const WORKDAY_BOARD_URL = PROVIDER_METADATA.officialWorkdayBoardUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeComparableUrl = (value) => {
  try {
    const url = new URL(value)
    return `${url.origin}${url.pathname}`.replace(/\/$/, '')
  } catch {
    return null
  }
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Lloyds Technology Centre \| Careers\s*<\/title>/i.test(page)
    && text.includes('Careers at Lloyds Technology Centre')
    && text.includes("We're Lloyds Technology Centre*")
    && text.includes('Search and apply')
}

export const extractVerifiedWorkdayBoardUrl = (html = '') => {
  for (const match of String(html ?? '').matchAll(/href=["']([^"']+)["']/gi)) {
    const candidate = normalizeComparableUrl(match[1])
    if (
      candidate === normalizeComparableUrl(WORKDAY_BOARD_URL)
      || candidate === normalizeComparableUrl(`${WORKDAY_BOARD_URL}/`)
    ) {
      return WORKDAY_BOARD_URL
    }
  }

  return null
}

export const hasWorkdayMaintenanceSignal = (html = '') => {
  const text = normalizeWhitespace(html)
  return text.includes('Workday is currently unavailable.')
    && text.includes('Workday is performing planned maintenance')
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

export const createLloydsTechnologyCentreScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Lloyds Technology Centre careers page no longer matches the trusted first-party surface')
    }

    const boardUrl = extractVerifiedWorkdayBoardUrl(careersHtml)
    if (boardUrl !== WORKDAY_BOARD_URL) {
      throw new Error('Lloyds Technology Centre verified Workday handoff changed materially')
    }

    const boardHtml = await fetchText(WORKDAY_BOARD_URL)
    if (!hasWorkdayMaintenanceSignal(boardHtml)) {
      throw new Error('Lloyds Technology Centre Workday board is no longer in the verified maintenance-only state')
    }

    return []
  },
})

export const run = async (options = {}) => createLloydsTechnologyCentreScraper().run(options)

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
