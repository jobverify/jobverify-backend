import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'greyamp'
export const COMPANY = 'Greyamp'
export const FIRST_PARTY_CAREERS_URL = 'https://www.greyamp.com/careers'

export const createGreyampScraper = () => ({
  async run() {
    // The official careers page invites resumes but does not enumerate vacancies.
    return []
  },
})

export const run = async (options = {}) => createGreyampScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/greyamp/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
