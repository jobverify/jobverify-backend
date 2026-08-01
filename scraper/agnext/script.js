import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'agnext'
export const COMPANY = 'AgNext'
export const OFFICIAL_CAREERS_URL = 'https://www.agnext.com/'
export const JOB_OPENINGS_URL = 'https://agnext.keka.com/careers'

export const createAgNextScraper = () => ({
  async run() {
    // Do not infer jobs from the linked Keka surface until its listing contract is verified.
    return []
  },
})

export const run = async (options = {}) => createAgNextScraper().run(options)

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/scraper/agnext/script.js')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
