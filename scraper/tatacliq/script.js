import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'tatacliq'
export const COMPANY = 'Tata CLiQ'
export const FIRST_PARTY_ROOT_URL = 'https://www.tatacliq.com/careers'
export const OFFICIAL_ATS_URL = 'https://cliqonnect.darwinbox.in/ms/candidate/careers'

export const createTataCliqScraper = () => ({
  async run() {
    // The official careers page and linked ATS have no verified enumerable public openings.
    return []
  },
})

export const run = async (options = {}) => createTataCliqScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/tatacliq/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
