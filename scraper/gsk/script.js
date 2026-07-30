import path from 'path'
import { fileURLToPath } from 'url'

import { createPhenomScraper } from '../phenom/engine.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const scraper = createPhenomScraper({
  companyName: 'GSK',
  source: 'gsk',
  baseUrl: 'https://jobs.gsk.com',
  searchPath: '/us/en/search-results',
  scraperDir: currentDir,
})

const dedupeJobs = (jobs = []) => {
  const seen = new Set()

  return jobs.filter((job) => {
    const key = [
      job.jobId,
      job.applyUrl,
      job.sourceUrl,
      job.title,
      job.location,
    ].find(Boolean)

    if (!key) return true
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const {
  buildSearchResultsPageUrl,
  buildJobDetailUrl,
  extractSearchPayload,
  extractSearchResults,
  extractJobDetail,
} = scraper

export const run = async (options = {}) => dedupeJobs(await scraper.run(options))

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running GSK scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)
  const cities = [...new Set(jobs.map((job) => job.city).filter(Boolean))].sort()
  console.log(`Cities found: ${cities.join(', ')}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'gsk')
    console.log('DB result:', result)
    process.exit(0)
  }
}
