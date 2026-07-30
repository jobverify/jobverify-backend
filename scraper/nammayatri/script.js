import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'nammayatri'
export const COMPANY = 'Namma Yatri'
export const FIRST_PARTY_ROOT_URL = 'https://www.nammayatri.in/'

export const createNammaYatriScraper = () => ({
  async run() {
    // The official site does not expose a public careers or ATS listings surface.
    return []
  },
})

export const run = async (options = {}) => createNammaYatriScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/nammayatri/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
