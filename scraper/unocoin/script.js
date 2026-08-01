import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'unocoin'
export const COMPANY = 'Unocoin'
export const FIRST_PARTY_ROOT_URL = 'https://unocoin.com/in/'

export const createUnocoinScraper = () => ({
  async run() {
    // The official site has no public, enumerable recruiting or ATS surface.
    return []
  },
})

export const run = async (options = {}) => createUnocoinScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/unocoin/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
