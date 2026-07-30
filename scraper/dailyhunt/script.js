import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'dailyhunt'
export const COMPANY = 'Dailyhunt'
export const FIRST_PARTY_ROOT_URL = 'https://www.eternoinfo.com/'

export const createDailyhuntScraper = () => ({
  async run() {
    // Eterno's public first-party careers page accepts resumes but has no public job listing feed.
    return []
  },
})

export const run = async (options = {}) => createDailyhuntScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/dailyhunt/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
