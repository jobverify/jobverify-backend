import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'cruise'
export const COMPANY = 'Cruise'
export const FIRST_PARTY_ROOT_URL = 'https://www.getcruise.com/careers/'

export const createCruiseScraper = () => ({
  async run() {
    // Do not emit jobs until Cruise's public careers extraction contract is verified.
    return []
  },
})

export const run = async (options = {}) => createCruiseScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/cruise/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
