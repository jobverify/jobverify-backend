import path from 'path'
import { fileURLToPath } from 'url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREER_PAGE_URL = 'https://jacob.ai/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

export const hasJacobAiDomainForSaleSignal = (html) => /Domain for sale|Listed with\s*spaceship\.com|Make offer/i
  .test(String(html ?? ''))

export const hasJacobAiNoJobsSignal = (html) => /Domain for sale[\s\S]*Listed with\s*spaceship\.com[\s\S]*Make offer/i
  .test(String(html ?? ''))

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'jacobai',
  timeoutMs: 15000,
})

export const createJacobAiScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREER_PAGE_URL)

    if (!hasJacobAiDomainForSaleSignal(html) || !hasJacobAiNoJobsSignal(html)) {
      throw new Error('Jacob AI public site no longer matches the verified parked-domain state')
    }

    return []
  },
})

export const run = async () => createJacobAiScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, 'jacobai')
  }
}
