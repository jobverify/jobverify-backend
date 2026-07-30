import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'pocketfm'
export const COMPANY = 'Pocket FM'
export const FIRST_PARTY_ROOT_URL = 'https://pocketfm.com/'

export const createPocketFMScraper = () => ({
  async run() {
    // Pocket FM has no verified public ATS or first-party enumerable jobs feed.
    return []
  },
})

export const run = async (options = {}) => createPocketFMScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/pocketfm/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
