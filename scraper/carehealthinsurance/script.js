import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'carehealthinsurance'
export const COMPANY = 'Care Health Insurance'
export const FIRST_PARTY_ROOT_URL = 'https://www.careinsurance.com/rhicl/careers'

export const createCareHealthInsuranceScraper = () => ({
  async run() {
    // The official India careers page currently has no enumerable public openings.
    return []
  },
})

export const run = async (options = {}) => createCareHealthInsuranceScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/carehealthinsurance/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
