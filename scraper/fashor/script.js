import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'fashor'
export const COMPANY_NAME = 'Fashor'

export const createBatchSentinelScraper = () => ({
  async run() {
    // Workbook coverage sentinel: never fabricate jobs for exact-name matches.
    return []
  },
})

export const run = async (options = {}) => createBatchSentinelScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/fashor/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
