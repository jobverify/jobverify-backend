import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'wizklub'
export const COMPANY = 'WizKlub'
export const FIRST_PARTY_ROOT_URL = 'https://dev.wizklub.com/'

export const createWizKlubScraper = () => ({
  async run() {
    // WizKlub's official site has no public, enumerable careers feed to scrape.
    return []
  },
})

export const run = async (options = {}) => createWizKlubScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/wizklub/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
