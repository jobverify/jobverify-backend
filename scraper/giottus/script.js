import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'giottus'
export const COMPANY = 'Giottus'
export const FIRST_PARTY_ROOT_URL = 'https://www.giottus.com/'

export const createGiottusScraper = () => ({
  async run() {
    // Giottus has no verified public careers feed to enumerate.
    return []
  },
})

export const run = async (options = {}) => createGiottusScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/giottus/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
