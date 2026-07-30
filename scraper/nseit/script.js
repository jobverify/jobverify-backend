import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'nseit'
export const COMPANY_NAME = 'NSEIT'
export const CAREERS_URL = 'https://www.nseit.com/careers'

export const createNseitScraper = () => ({
  async run() {
    // Do not promote third-party listings without a verified first-party India surface.
    return []
  },
})

export const run = async (options = {}) => createNseitScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/nseit/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
