import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'truemeds'
export const COMPANY = 'Truemeds'
export const FIRST_PARTY_ROOT_URL = 'https://www.truemeds.in/about-us'

export const createTruemedsScraper = () => ({
  async run() {
    // Truemeds has no verified public first-party careers or ATS feed to enumerate.
    return []
  },
})

export const run = async (options = {}) => createTruemedsScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/truemeds/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
