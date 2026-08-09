import path from 'path'
import { fileURLToPath } from 'url'

import { createPhenomScraper } from '../../scraper-support/phenom/engine.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const maxPages = 5
const maxJobs = 100

const scraper = createPhenomScraper({
  companyName: 'Thermo Fisher Scientific',
  source: 'thermofisherscientific',
  baseUrl: 'https://jobs.thermofisher.com',
  searchPath: '/global/en/search-results',
  listingPredicate: (listing) => listing?.country === 'India',
  scraperDir: currentDir,
})

const boundLimit = (value, limit) => (
  Number.isInteger(value) ? Math.min(Math.max(value, 0), limit) : limit
)

export const {
  buildSearchResultsPageUrl,
  buildJobDetailUrl,
  extractSearchPayload,
  extractSearchResults,
  extractJobDetail,
} = scraper

export const run = (options = {}) => scraper.run({
  ...options,
  maxPages: boundLimit(options.maxPages, maxPages),
  maxJobs: boundLimit(options.maxJobs, maxJobs),
})

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Thermo Fisher Scientific scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)
  const cities = [...new Set(jobs.map((job) => job.city).filter(Boolean))].sort()
  console.log(`Cities found: ${cities.join(', ')}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'thermofisherscientific')
    console.log('DB result:', result)
    process.exit(0)
  }
}
