import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'zoox'
export const COMPANY = 'Zoox'
export const OFFICIAL_CAREERS_URL = 'https://zoox.com/careers'

export const createZooxScraper = () => ({
  async run() {
    // Zoox's official careers page does not currently expose a verified public jobs feed here.
    return []
  },
})

export const run = async (options = {}) => createZooxScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/zoox/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
