import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'rivian'
export const COMPANY = 'Rivian'
export const OFFICIAL_CAREERS_URL = 'https://careers.rivian.com/work'

export const createRivianScraper = () => ({
  async run() {
    // Do not infer India jobs from Rivian's broad global careers surface.
    return []
  },
})

export const run = async (options = {}) => createRivianScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/rivian/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
