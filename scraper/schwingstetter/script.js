import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'schwingstetter'
export const COMPANY = 'Schwing Stetter'
export const CAREERS_URL = 'https://schwing-stetter.com/de_de/unternehmen/ausbildung-karriere.html'
export const STETTER_BOARD_URL =
  'https://schwing-stetter.com/de_de/unternehmen/ausbildung-karriere/stetter/stellenboerse.html'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const includesAll = (value, fragments) => {
  const normalized = normalizeWhitespace(value).toLowerCase()
  return fragments.every((fragment) => normalized.includes(fragment))
}

export const hasOfficialCareersSignal = (html) =>
  includesAll(html, [
    'ausbildung & karriere',
    'weltweit beschaeftigen wir mehr als 3.000 mitarbeiter',
    'finden sie ihren job auf unserer stellenboerse',
    'bewerbung@schwing.de',
    'stetter stellenboerse',
  ])

export const hasOfficialStetterBoardSignal = (html) =>
  includesAll(html, [
    'stetter gmbh',
    'dr.-karl-lenz-strasse 70',
    '87700 memmingen / germany',
    'info@stetter.de',
    'copyright © 2024 schwing gmbh / stetter gmbh',
  ])

const PUBLIC_JOB_LISTING_PATTERNS = [
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /workable\.com/i,
  /smartrecruiters/i,
  /workdayjobs/i,
  /\/jobs\/[a-z0-9-]+/i,
  /\/karriere\/[a-z0-9-]+/i,
  /\/stellenboerse\/[a-z0-9-]+/i,
  /\bapply now\b/i,
  /\bjetzt bewerben\b/i,
  /\bstellenangebot\b/i,
  /\bstellenangebote\b/i,
  /\boffene stellen\b/i,
  /\bjob openings\b/i,
  /\bopen positions\b/i,
]

export const pageExposesPublicJobListings = (html) =>
  PUBLIC_JOB_LISTING_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createSchwingStetterScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Schwing Stetter verified official careers surface changed')
    }

    const stetterBoardHtml = await fetchText(STETTER_BOARD_URL)
    if (!hasOfficialStetterBoardSignal(stetterBoardHtml)) {
      throw new Error('Schwing Stetter verified official Stetter board changed')
    }

    if (pageExposesPublicJobListings(stetterBoardHtml)) {
      throw new Error('Schwing Stetter Stetter board now exposes public job listings')
    }

    return []
  },
})

export const run = async (options = {}) => createSchwingStetterScraper().run(options)

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
