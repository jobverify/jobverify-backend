import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'cognitensor'
export const COMPANY = 'CogniTensor'
export const FIRST_PARTY_ROOT_URL = 'https://www.cognitensor.com/'

export const createCogniTensorScraper = () => ({
  async run() {
    // CogniTensor has no verified public first-party or ATS job listings to enumerate.
    return []
  },
})

export const run = async (options = {}) => createCogniTensorScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/cognitensor/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
