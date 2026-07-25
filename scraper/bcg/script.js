import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createPhenomScraper } from '../phenom/engine.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const scraper = createPhenomScraper({
  companyName: 'BCG',
  source: 'bcg',
  baseUrl: 'https://careers.bcg.com',
  searchPath: '/global/en/search-results',
  scraperDir: currentDir,
})

export const {
  buildSearchResultsPageUrl,
  buildJobDetailUrl,
  extractSearchPayload,
  extractSearchResults,
  extractJobDetail,
  run,
} = scraper

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, 'bcg')
  }
}
