import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'lucidmotors'
export const COMPANY = 'Lucid Motors'
export const OFFICIAL_CAREERS_URL = 'https://lucidmotors.com/careers'

export const createLucidMotorsScraper = () => ({
  async run() {
    // Do not infer jobs until Lucid's official public jobs feed is verified for this exact provider.
    return []
  },
})

export const run = async (options = {}) => createLucidMotorsScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/lucidmotors/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
