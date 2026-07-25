import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'poshmark'
export const COMPANY = 'Poshmark'
export const CAREERS_URL = 'https://poshmark.com/careers'
export const GREENHOUSE_BOARD_URL = 'https://job-boards.greenhouse.io/poshmark'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /Join us as we reimagine the future of shopping/i.test(page)
    && /Current Openings/i.test(page)
    && /talent@poshmark\.com/i.test(page)
    && normalized?.includes("We're currently upgrading our careers page to serve you better!")
    && normalized?.includes('please email your application to talent@poshmark.com.')
}

export const extractBoardUrl = (html) => {
  const page = String(html ?? '')
  const match = page.match(/<a[^>]+href="([^"]*job-boards\.greenhouse\.io\/poshmark[^"]*)"[^>]*>/i)

  if (!match) return null

  try {
    return new URL(match[1], CAREERS_URL).toString()
  } catch {
    return null
  }
}

export const hasZeroJobsSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /Current openings at Poshmark/i.test(page)
    && normalized?.includes('Create a Job Alert')
    && normalized?.includes('There are no current openings.')
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createPoshmarkScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Poshmark careers page no longer matches the verified official careers surface')
    }

    const boardUrl = extractBoardUrl(careersHtml)
    if (boardUrl !== GREENHOUSE_BOARD_URL) {
      throw new Error('Poshmark careers page no longer links to the verified Greenhouse board')
    }

    const boardHtml = await fetchText(GREENHOUSE_BOARD_URL)
    if (!hasZeroJobsSignal(boardHtml)) {
      throw new Error('Poshmark public jobs board now exposes openings or changed shape')
    }

    return []
  },
})

export const run = async (options = {}) => createPoshmarkScraper().run(options)

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
