import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'questt'
export const COMPANY = 'Questt'
export const FIRST_PARTY_ROOT_URL = 'https://www.questt.com/'

export const createQuesttScraper = () => ({
  async run() {
    // Questt has no verified public first-party job inventory to enumerate.
    return []
  },
})

export const run = async (options = {}) => createQuesttScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/questt/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
