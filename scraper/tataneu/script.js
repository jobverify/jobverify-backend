import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'tataneu'
export const COMPANY = 'Tata Neu'
export const FIRST_PARTY_ROOT_URL = 'https://www.tata.com/business/tata-digital/tata-neu'

export const createTataNeuScraper = () => ({
  async run() {
    // Tata Neu is a Tata Digital product; no exact Tata Neu careers feed is public.
    return []
  },
})

export const run = async (options = {}) => createTataNeuScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/tataneu/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
