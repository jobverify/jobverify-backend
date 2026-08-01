import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'appsecure'
export const COMPANY = 'AppSecure'
export const FIRST_PARTY_ROOT_URL = 'https://www.appsecure.security/'

export const createAppSecureScraper = () => ({
  async run() {
    // AppSecure's first-party site has no verified public careers feed to enumerate.
    return []
  },
})

export const run = async (options = {}) => createAppSecureScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/appsecure/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
