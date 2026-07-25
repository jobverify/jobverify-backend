import path from 'path'
import { fileURLToPath } from 'url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_URL = 'https://recruit.southindianbank.bank.in/RDC/'

const SOURCE = 'southindianbank'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

export const hasOfficialCareersSignal = (html) =>
  /South Indian Bank/i.test(html || '')
  && /Recruitment Drive Portal/i.test(html || '')
  && /RDC/i.test(html || '')

export const hasEmptyOpeningsSignal = (html) =>
  /Currently,\s*there are no job openings\./i.test(html || '')

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createSouthIndianBankScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(html)) {
      throw new Error('South Indian Bank careers page no longer matches the verified official public surface')
    }

    if (!hasEmptyOpeningsSignal(html)) {
      throw new Error('South Indian Bank careers page no longer matches the verified no-openings surface')
    }

    return []
  },
})

export const run = async () => createSouthIndianBankScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running South Indian Bank scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, SOURCE)
    console.log('DB result:', result)
    process.exit(0)
  }
}
