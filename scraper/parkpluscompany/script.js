import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'parkpluscompany'
export const COMPANY = 'Park Plus'
export const FIRST_PARTY_CAREERS_URL = 'https://parkplus.io/careers'

export const createParkPlusCompanyScraper = () => ({
  async run() {
    // Park+ does not provide official evidence that it is the CSV's distinct Park Plus entity.
    return []
  },
})

export const run = async () => createParkPlusCompanyScraper().run()

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/parkpluscompany/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
