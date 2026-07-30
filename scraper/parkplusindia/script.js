import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'parkplusindia'
export const COMPANY = 'Park+ India'
export const FIRST_PARTY_CAREERS_URL = 'https://parkplus.io/careers'

export const createParkPlusIndiaScraper = () => ({
  async run() {
    // The official careers page has no enumerable job application feed.
    return []
  },
})

export const run = async (options = {}) => createParkPlusIndiaScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/parkplusindia/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
