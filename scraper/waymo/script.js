import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'waymo'
export const COMPANY = 'Waymo'
export const FIRST_PARTY_ROOT_URL = 'https://careers.withwaymo.com/jobs/search'

export const createWaymoScraper = () => ({
  async run() {
    // The first-party site is enumerable in a browser, but its public Clinch surface has no verified stable feed.
    return []
  },
})

export const run = async (options = {}) => createWaymoScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/waymo/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
