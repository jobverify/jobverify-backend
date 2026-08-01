import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'wovenbytoyota'
export const COMPANY = 'Woven by Toyota'
export const OFFICIAL_CAREERS_URL = 'https://woven.toyota/en/careers/'

export const createWovenByToyotaScraper = () => ({
  async run() {
    // The official careers page currently reports no matching roles from the public surface we verified.
    return []
  },
})

export const run = async (options = {}) => createWovenByToyotaScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/wovenbytoyota/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
