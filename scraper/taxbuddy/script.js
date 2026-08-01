import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'taxbuddy'
export const COMPANY = 'TaxBuddy'
export const FIRST_PARTY_ROOT_URL = 'https://www.taxbuddy.com/'

export const createTaxBuddyScraper = () => ({
  async run() {
    // TaxBuddy has no verified public first-party careers feed to enumerate.
    return []
  },
})

export const run = async (options = {}) => createTaxBuddyScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/taxbuddy/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
