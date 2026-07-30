import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'fittr'
export const COMPANY = 'Fittr'
export const FIRST_PARTY_ROOT_URL = 'https://www.fittr.com/become-a-coach/'

export const createFittrScraper = () => ({
  async run() {
    // FITTR publishes coach onboarding, not a trustworthy enumerable employee-job feed.
    return []
  },
})

export const run = async (options = {}) => createFittrScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/fittr/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
