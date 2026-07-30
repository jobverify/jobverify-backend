import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'chargepoint'
export const COMPANY = 'ChargePoint'
export const FIRST_PARTY_ROOT_URL = 'https://www.chargepoint.com/about/opportunities'

export const createChargePointScraper = () => ({
  async run() {
    // The official opportunities surface is client-rendered without a verified enumerable feed.
    return []
  },
})

export const run = async (options = {}) => createChargePointScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/chargepoint/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
