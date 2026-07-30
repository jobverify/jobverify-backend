import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'classklap'
export const COMPANY = 'ClassKlap'
export const FIRST_PARTY_ROOT_URL = 'https://www.classklap.com/'

export const createClassKlapScraper = () => ({
  async run() {
    // No public first-party careers or ATS listing feed is currently available.
    return []
  },
})

export const run = async (options = {}) => createClassKlapScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/classklap/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
