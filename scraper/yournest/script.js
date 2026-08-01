import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'yournest'
export const COMPANY = 'YourNest'
export const FIRST_PARTY_ROOT_URL = 'https://yournest.in/'

export const createYourNestScraper = () => ({
  async run() {
    // The official site has no enumerable public careers or ATS listing feed.
    return []
  },
})

export const run = async (options = {}) => createYourNestScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/yournest/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
