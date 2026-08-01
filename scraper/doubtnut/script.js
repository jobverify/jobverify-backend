import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'doubtnut'
export const COMPANY = 'Doubtnut'
export const FIRST_PARTY_ROOT_URL = 'https://www.doubtnut.com/'

export const createDoubtnutScraper = () => ({
  async run() {
    // Doubtnut's official site has no public careers route or enumerable jobs feed.
    return []
  },
})

export const run = async (options = {}) => createDoubtnutScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/doubtnut/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
