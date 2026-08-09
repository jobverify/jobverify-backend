import path from 'path'
import { fileURLToPath } from 'url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const HOMEPAGE_URL = 'https://marutair.com/'
export const CAREER_PAGE_URL = 'https://marutair.com/career/'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const HOME_SIGNAL_PATTERN = /marut air/i
const CAREER_SIGNAL_PATTERN = /join our team|jobs@marutair\.com|upload resume|department/i

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'marutair',
  timeoutMs: 15000,
})

export const hasHomepageSignal = (html) => HOME_SIGNAL_PATTERN.test(String(html ?? ''))

export const hasCareerPageSignal = (html) => CAREER_SIGNAL_PATTERN.test(String(html ?? ''))

export const createMarutAirScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)

    if (!hasHomepageSignal(homepageHtml)) {
      throw new Error('Marut Air homepage no longer exposes the verified brand signal')
    }

    const careerPageHtml = await fetchText(CAREER_PAGE_URL)

    if (!hasCareerPageSignal(careerPageHtml)) {
      throw new Error('Marut Air career page no longer exposes the verified application form')
    }

    return []
  },
})

export const run = async () => createMarutAirScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Marut Air scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'marutair')
    console.log('DB result:', result)
    process.exit(0)
  }
}
