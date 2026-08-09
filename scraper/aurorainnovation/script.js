import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'aurorainnovation'
export const COMPANY = 'Aurora Innovation'
export const FIRST_PARTY_CAREERS_URL = 'https://aurora.tech/careers/'

export const createAuroraInnovationScraper = () => ({
  async run() {
    // The official careers surface currently exposes no public India openings.
    return []
  },
})

export const run = async (options = {}) => createAuroraInnovationScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/aurorainnovation/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
