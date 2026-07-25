import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createPhenomScraper } from '../phenom/engine.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const scraper = createPhenomScraper({
  companyName: 'Giant Eagle',
  source: 'gianteagle',
  baseUrl: 'https://jobs.gianteagle.com',
  searchPath: '/us/en/search-results',
  scraperDir: currentDir,
  targetCountry: 'United States of America',
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
  console.log(`Running Giant Eagle scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal Giant Eagle jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'gianteagle')
    console.log('DB result:', result)
    process.exit(0)
  }
}
