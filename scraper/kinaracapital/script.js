import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'kinaracapital'
export const COMPANY = 'Kinara Capital'
export const FIRST_PARTY_ROOT_URL = 'https://kinaracapital.com/careers/'

export const createKinaraCapitalScraper = () => ({
  async run() {
    // The official careers page is verified, but no trustworthy enumerable public feed is confirmed.
    return []
  },
})

export const run = async (options = {}) => createKinaraCapitalScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/kinaracapital/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
