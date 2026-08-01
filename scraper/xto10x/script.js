import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'xto10x'
export const COMPANY = 'XTO10X'
export const FIRST_PARTY_ROOT_URL = 'https://www.xto10x.com/about'

export const createXto10xScraper = () => ({
  async run() {
    // The official company surface has no enumerable public job listings.
    return []
  },
})

export const run = async (options = {}) => createXto10xScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/xto10x/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
