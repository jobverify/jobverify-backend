import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'letstransport'
export const COMPANY = 'LetsTransport'
export const FIRST_PARTY_ROOT_URL = 'https://letstransport.in/we-are-hiring/'

export const createLetsTransportScraper = () => ({
  async run() {
    // The official careers page currently has no enumerable public openings.
    return []
  },
})

export const run = async (options = {}) => createLetsTransportScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/letstransport/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
