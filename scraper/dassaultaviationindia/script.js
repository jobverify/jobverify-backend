import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'dassaultaviationindia'
export const COMPANY = 'Dassault Aviation India'
export const FIRST_PARTY_ROOT_URL = 'https://www.dassault-aviation.com/en/group/careers/'

export const createDassaultAviationIndiaScraper = () => ({
  async run() {
    // The official ATS has no verified public openings in India for this exact company.
    return []
  },
})

export const run = async (options = {}) => createDassaultAviationIndiaScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/dassaultaviationindia/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
