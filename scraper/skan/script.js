import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'skan'
export const COMPANY = 'Skan'
export const FIRST_PARTY_ROOT_URL = 'https://www.skan.ai/current-openings'

export const createSkanScraper = () => ({
  async run() {
    // The official current-openings page has no enumerable public job listings.
    return []
  },
})

export const run = async (options = {}) => createSkanScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\\\', '/')
  .endsWith('/scraper/skan/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
