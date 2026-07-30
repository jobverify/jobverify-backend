import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'farmtheory'
export const COMPANY = 'FarmTheory'
export const FIRST_PARTY_ROOT_URL = 'https://www.farmtheory.in/'

export const createFarmTheoryScraper = () => ({
  async run() {
    // The official storefront has no verified public careers or ATS feed.
    return []
  },
})

export const run = async (options = {}) => createFarmTheoryScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/farmtheory/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
