import path from 'path'
import { fileURLToPath } from 'url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREER_PAGE_URL = 'https://www.c5i.ai/careers/'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const CAREERS_SIGNAL_PATTERN = /careers\s+with\s+c5i|find\s+your\s+flourish\.\s*ignite\s+your\s+impact/i
const EMAIL_APPLICATION_SIGNAL_PATTERN = /careers@c5i\.ai/i

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'course5i',
  timeoutMs: 15000,
})

export const hasCareerPageSignal = (html) => {
  const value = String(html ?? '')
  return CAREERS_SIGNAL_PATTERN.test(value) && EMAIL_APPLICATION_SIGNAL_PATTERN.test(value)
}

export const createCourse5iScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREER_PAGE_URL)

    if (!hasCareerPageSignal(html)) {
      throw new Error('Course5i careers page no longer exposes the expected email application signals')
    }

    return []
  },
})

export const run = async () => createCourse5iScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Course5i scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'course5i')
    console.log('DB result:', result)
    process.exit(0)
  }
}
