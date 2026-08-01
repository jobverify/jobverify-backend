import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'sunrun'
export const COMPANY = 'Sunrun'
export const OFFICIAL_CAREERS_URL = 'https://careers.sunrun.com/en/search-jobs'

export const createSunrunScraper = () => ({
  async run() {
    // Sunrun's first-party careers site is verified, but this provider stays fail-closed until a stable extraction contract is pinned.
    return []
  },
})

export const run = async (options = {}) => createSunrunScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/sunrun/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
