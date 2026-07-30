import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'lidolearning'
export const COMPANY = 'Lido Learning'
export const FIRST_PARTY_ROOT_URL = 'https://www.lidolearning.com/'

export const createLidoLearningScraper = () => ({
  async run() {
    // No official, enumerable careers feed is currently verified for this exact company.
    return []
  },
})

export const run = async (options = {}) => createLidoLearningScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/lidolearning/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
