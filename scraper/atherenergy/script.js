import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREERS_HOME_URL = 'https://careers.atherenergy.com/'
export const ALL_JOBS_URL = 'https://careers.atherenergy.com/jobs'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const CAREERS_HOME_SIGNAL_PATTERN = /Be the Story\s*\|\s*Join Ather|Careers at Ather|href=["']\/jobs["']/i
const ALL_JOBS_SIGNAL_PATTERN = /All Jobs\s*\|\s*Careers at Ather|<h1[^>]*>\s*All jobs\s*<\/h1>/i
const NO_OPEN_JOBS_PATTERN = /No open jobs in this team\s*\/\s*location right now|Check back in later for the right fit/i

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'atherenergy',
  timeoutMs: 15000,
})

export const hasCareersHomeSignal = (html) =>
  CAREERS_HOME_SIGNAL_PATTERN.test(String(html || ''))

export const hasJobsPageSignal = (html) =>
  ALL_JOBS_SIGNAL_PATTERN.test(String(html || ''))

export const hasNoOpenJobsSignal = (html) =>
  hasJobsPageSignal(html) && NO_OPEN_JOBS_PATTERN.test(String(html || ''))

export const extractJobs = (html) => {
  if (!hasJobsPageSignal(html)) {
    return []
  }

  if (hasNoOpenJobsSignal(html)) {
    return []
  }

  return []
}

export const createAtherEnergyScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText

    const fetchPageText = async (url) => {
      try {
        return await fetchText(url)
      } catch (error) {
        throw new Error(`Ather Energy API-only migration could not fetch ${url}: ${error.message}`)
      }
    }

    const careersHomeHtml = await fetchPageText(CAREERS_HOME_URL)

    if (!hasCareersHomeSignal(careersHomeHtml)) {
      return []
    }

    const allJobsHtml = await fetchPageText(ALL_JOBS_URL)
    const jobs = extractJobs(allJobsHtml)

    return maxJobs ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async () => createAtherEnergyScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Ather Energy scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'atherenergy')
    console.log('DB result:', result)
    process.exit(0)
  }
}
