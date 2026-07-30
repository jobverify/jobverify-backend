import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'sumhr'
export const COMPANY = 'SumHR'
export const FIRST_PARTY_ROOT_URL = 'https://www.sumhr.com/'

export const createSumHrScraper = () => ({
  async run() {
    // SumHR does not publish a verifiable public careers or ATS listing surface.
    return []
  },
})

export const run = async (options = {}) => createSumHrScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/sumhr/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
