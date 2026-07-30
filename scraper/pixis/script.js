import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'pixis'
export const COMPANY = 'Pixis'
export const FIRST_PARTY_ROOT_URL = 'https://pixis.ai/careers/'

export const createPixisScraper = () => ({
  async run() {
    // Pixis' official careers page currently states that it has no vacancies.
    return []
  },
})

export const run = async (options = {}) => createPixisScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/pixis/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
