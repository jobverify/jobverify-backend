import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'axissecurities'
export const COMPANY = 'Axis Securities'
export const FIRST_PARTY_CAREERS_URL = 'https://simplehai.axisdirect.in/portal/careers'

export const createAxisSecuritiesScraper = () => ({
  async run() {
    // The first-party careers page currently has no usable public openings feed.
    return []
  },
})

export const run = async (options = {}) => createAxisSecuritiesScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/axissecurities/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()
  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
