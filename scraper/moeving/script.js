import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'moeving'
export const COMPANY = 'MoEVing'
export const FIRST_PARTY_ATS_URL = 'https://moeving.freshteam.com/jobs'

export const createMoEVingScraper = () => ({
  async run() {
    // Do not infer jobs from similarly named companies or third-party listings.
    return []
  },
})

export const run = async (options = {}) => createMoEVingScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/moeving/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
