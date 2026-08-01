import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'melorra'
export const COMPANY = 'Melorra'
export const FIRST_PARTY_ROOT_URL = 'https://www.melorra.com/'

export const hasVerifiedOfficialSurface = (html = '') => {
  const page = String(html ?? '')
  return /<title>[^<]*\bMelorra\b[^<]*<\/title>/i.test(page)
    && /\bMelorra\b/i.test(page)
    && !/\b(careers?|jobs?|open positions|vacancies|apply)\b/i.test(page)
}

export const createMelorraScraper = () => ({
  async run() {
    // No trustworthy first-party India jobs feed is published; never invent jobs.
    return []
  },
})

export const run = async (options = {}) => createMelorraScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/melorra/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()
  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
