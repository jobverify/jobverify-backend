import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const SOURCE = 'renewbuy'
export const COMPANY_NAME = 'RenewBuy'
export const HOMEPAGE_URL = 'https://www.renewbuy.com/'

export const createRenewBuyScraper = () => ({
  async run() {
    // The official domain has no verified enumerable India careers surface.
    return []
  },
})

export const run = async (options = {}) => createRenewBuyScraper().run(options)

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/renewbuy/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
