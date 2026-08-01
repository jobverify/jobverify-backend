import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'qandle'
export const COMPANY = 'Qandle'
export const FIRST_PARTY_ROOT_URL = 'https://www.qandle.com/'

export const createQandleScraper = () => ({
  async run() {
    // Qandle has no verified public first-party job inventory to enumerate.
    return []
  },
})

export const run = async (options = {}) => createQandleScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/qandle/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
