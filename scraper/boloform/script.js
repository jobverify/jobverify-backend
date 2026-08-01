import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'boloform'
export const COMPANY = 'Boloform'
export const FIRST_PARTY_ROOT_URL = 'https://www.boloform.se/'

export const createBoloformScraper = () => ({
  async run() {
    // No official public careers page or ATS feed is currently verifiable.
    return []
  },
})

export const run = async (options = {}) => createBoloformScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/boloform/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
