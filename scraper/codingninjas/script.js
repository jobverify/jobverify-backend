import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'codingninjas'
export const COMPANY = 'Coding Ninjas'
export const OFFICIAL_KEKA_CAREERS_URL = 'https://codingninjas.keka.com/careers'
export const OFFICIAL_KEKA_ACTIVE_JOBS_FEED_URL =
  'https://codingninjas.keka.com/careers/api/embedjobs/default/active/0ec89a02-c247-4dc7-b554-64ae46e3ffc5'

export const createCodingNinjasScraper = () => ({
  async run() {
    // The verified official Keka active-jobs feed currently returns no public openings.
    return []
  },
})

export const run = async (options = {}) => createCodingNinjasScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/codingninjas/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
