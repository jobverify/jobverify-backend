import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'saintgobain'
export const COMPANY = 'Saint-Gobain'
export const CAREERS_URL = 'https://joinus.saint-gobain.com/en'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const OFFICIAL_CAREERS_PATTERNS = [
  /<title>\s*Join us\s*\|\s*Saint-Gobain\s*<\/title>/i,
  /\bOUR JOB OFFERS\b/i,
  /Find here our job offers for all our businesses and our brands\./i,
]

const INDIA_OPENINGS_PATTERNS = [
  /\bIndia\s*\(\d+\)/i,
  /\bIndia\s*,/i,
  /\/job\/IND[A-Z0-9-]*/i,
]

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return OFFICIAL_CAREERS_PATTERNS.every((pattern) => pattern.test(page))
}

export const hasIndiaOpeningsSignal = (html) => {
  const page = String(html ?? '')
  return INDIA_OPENINGS_PATTERNS.some((pattern) => pattern.test(page))
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createSaintGobainScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Official Saint-Gobain jobs surface changed; refusing to assume zero India openings')
    }

    if (hasIndiaOpeningsSignal(careersHtml)) {
      throw new Error('Saint-Gobain official jobs surface now shows India openings and needs a listings parser')
    }

    return []
  },
})

export const run = async (options = {}) => createSaintGobainScraper().run(options)

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
