import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'avataar'
export const COMPANY = 'Avataar'
export const FIRST_PARTY_ROOT_URL = 'https://www.avataar.ai/'

export const createAvataarScraper = () => ({
  async run() {
    // The official site has no public careers page or enumerable ATS jobs feed.
    return []
  },
})

export const run = async (options = {}) => createAvataarScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/avataar/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
