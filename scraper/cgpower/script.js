import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://www.cgglobal.com/career'
export const EXPLORE_ROLES_URL = 'https://www.cgglobal.com/explore_roles'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const CAREER_PAGE_SIGNAL_PATTERN = /join a purpose[-\s]driven team|explore open positions/i
const EXPLORE_ROLES_SIGNAL_PATTERN = /explore the latest job opportunities|search all open positions/i
const NO_JOBS_PATTERN = /\bno jobs found\b/i

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'cgpower',
  timeoutMs: 15000,
})

export const hasCareerPageSignal = (html) =>
  CAREER_PAGE_SIGNAL_PATTERN.test(String(html || ''))

export const hasExploreRolesSignal = (html) =>
  EXPLORE_ROLES_SIGNAL_PATTERN.test(String(html || ''))

export const hasNoJobsSignal = (html) => NO_JOBS_PATTERN.test(String(html || ''))

export const extractOpenings = (html) => {
  if (!hasExploreRolesSignal(html)) {
    return []
  }

  if (hasNoJobsSignal(html)) {
    return []
  }

  return []
}

export const createCgPowerScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const careerPageHtml = await fetchText(CAREER_PAGE_URL)

    if (!hasCareerPageSignal(careerPageHtml)) {
      return []
    }

    const exploreRolesHtml = await fetchText(EXPLORE_ROLES_URL)
    const jobs = extractOpenings(exploreRolesHtml)

    return maxJobs ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async () => createCgPowerScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running CG Power scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'cgpower')
    console.log('DB result:', result)
    process.exit(0)
  }
}
