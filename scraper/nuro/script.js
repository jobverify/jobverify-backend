import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'nuro'
export const COMPANY = 'Nuro'
export const OFFICIAL_CAREERS_URL = 'https://www.nuro.ai/careers'

export const createNuroScraper = () => ({
  async run() {
    // Nuro's careers UI has no verified stable public feed in this repository.
    return []
  },
})

export const run = async (options = {}) => createNuroScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/nuro/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
