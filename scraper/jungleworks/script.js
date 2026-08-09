import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'jungleworks'
export const COMPANY = 'Jungleworks'
export const FIRST_PARTY_ROOT_URL = 'https://jungleworks.com/careers/'
export const OFFICIAL_ATS_URL = 'https://jungleworks.zohorecruit.in/jobs/Careers'

export const createJungleworksScraper = () => ({
  async run() {
    // The official Zoho Recruit handoff currently exposes no enumerable public openings.
    return []
  },
})

export const run = async (options = {}) => createJungleworksScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/jungleworks/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
