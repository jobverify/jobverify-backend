import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'kissht'
export const COMPANY = 'Kissht'
export const OFFICIAL_CAREERS_URL = 'https://www.kissht.com/career'
export const OFFICIAL_ATS_URL = 'https://app1596.workline.hr'

export const createKisshtScraper = () => ({
  async run() {
    // Kissht links this ATS from its first-party careers page, but no stable public feed is verified.
    return []
  },
})

export const run = async (options = {}) => createKisshtScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/kissht/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
