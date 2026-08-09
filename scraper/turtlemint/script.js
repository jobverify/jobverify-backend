import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'turtlemint'
export const COMPANY = 'Turtlemint'
export const FIRST_PARTY_ROOT_URL = 'https://www.turtlemint.com/careers/'

export const createTurtlemintScraper = () => ({
  async run() {
    // The official careers page currently reports no active openings.
    return []
  },
})

export const run = async (options = {}) => createTurtlemintScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/turtlemint/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
