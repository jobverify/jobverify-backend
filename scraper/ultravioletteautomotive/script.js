import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'ultravioletteautomotive'
export const COMPANY = 'Ultraviolette Automotive'
export const OFFICIAL_CAREERS_URL = 'https://www.ultraviolette.com/de/careers'

export const createUltravioletteAutomotiveScraper = () => ({
  async run() {
    // Do not infer openings until the official careers site exposes a public jobs feed.
    return []
  },
})

export const run = async (options = {}) => createUltravioletteAutomotiveScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/ultravioletteautomotive/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
