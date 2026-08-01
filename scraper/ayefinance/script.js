import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'ayefinance'
export const COMPANY = 'Aye Finance'
export const FIRST_PARTY_ROOT_URL = 'https://www.ayefin.com/'

export const createAyeFinanceScraper = () => ({
  async run() {
    // Aye Finance's official public surface has no enumerable careers feed.
    return []
  },
})

export const run = async (options = {}) => createAyeFinanceScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/ayefinance/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
