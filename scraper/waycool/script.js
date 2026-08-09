import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'waycool'
export const COMPANY = 'WayCool'
export const FIRST_PARTY_ROOT_URL = 'https://www.waycool.in/job-opportunities.php'

export const createWayCoolScraper = () => ({
  async run() {
    // The official careers page does not expose a trustworthy enumerable public jobs feed.
    return []
  },
})

export const run = async (options = {}) => createWayCoolScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/waycool/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
