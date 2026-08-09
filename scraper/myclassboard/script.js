import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'myclassboard'
export const COMPANY = 'MyClassboard'
export const FIRST_PARTY_CAREERS_URL = 'https://www.myclassboard.com/careers/'

export const createMyClassboardScraper = () => ({
  async run() {
    // The official careers page has email-only applications, not enumerable job records.
    return []
  },
})

export const run = async (options = {}) => createMyClassboardScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/myclassboard/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
