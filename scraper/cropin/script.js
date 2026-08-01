import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'cropin'
export const COMPANY = 'CropIn'
export const FIRST_PARTY_CAREERS_URL = 'https://www.cropin.com/career/'

export const createCropInScraper = () => ({
  async run() {
    // CropIn currently accepts resumes but exposes no enumerable public openings.
    return []
  },
})

export const run = async (options = {}) => createCropInScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/cropin/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
