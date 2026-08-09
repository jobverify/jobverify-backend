import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'moneytap'
export const COMPANY = 'MoneyTap'
export const OFFICIAL_ATS_URL = 'https://moneytap-1.jobsoid.com/'

export const createMoneyTapScraper = () => ({
  async run() {
    // The branded Jobsoid ATS currently exposes no public openings.
    return []
  },
})

export const run = async (options = {}) => createMoneyTapScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/moneytap/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
