import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'torkmotors'
export const COMPANY = 'Tork Motors'
export const FIRST_PARTY_ROOT_URL = 'https://www.torkmotors.com/'

export const createTorkMotorsScraper = () => ({
  async run() {
    // Tork Motors has no verified public first-party careers feed to enumerate.
    return []
  },
})

export const run = async (options = {}) => createTorkMotorsScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/torkmotors/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
