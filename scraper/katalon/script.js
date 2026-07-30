import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'katalon'
export const COMPANY = 'Katalon'
export const FIRST_PARTY_ROOT_URL = 'https://katalon.com/careers'
export const OFFICIAL_ATS_URL = 'https://careers.katalon.com/'

export const createKatalonScraper = () => ({
  async run() {
    // The branded Teamtailor board currently exposes no India openings.
    return []
  },
})

export const run = async (options = {}) => createKatalonScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/katalon/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
