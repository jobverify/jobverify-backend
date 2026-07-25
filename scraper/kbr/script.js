import path from 'path'
import { fileURLToPath } from 'url'

import { createPhenomScraper } from '../phenom/engine.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const HOMEPAGE_URL = 'https://www.kbr.com/en'
export const CAREERS_LANDING_URL = 'https://careers.kbr.com/us/en'

const OFFICIAL_CAREERS_LINK_PATTERN = /<a\b[^>]*href=(["'])https:\/\/careers\.kbr\.com\/us\/en\1[^>]*>\s*Careers\s*<\/a>/i
const HOMEPAGE_BRAND_SIGNAL_PATTERN = /Delivering Solutions, Changing the World|KBR/i
const CAREERS_BRAND_SIGNAL_PATTERN = /Belong,\s*connect and grow at KBR|Find your next opportunity/i
const CAREERS_SEARCH_SIGNAL_PATTERN = /Search results|\/us\/en\/search-results/i

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

const assertOfficialHomepage = (html) => {
  if (!OFFICIAL_CAREERS_LINK_PATTERN.test(html) || !HOMEPAGE_BRAND_SIGNAL_PATTERN.test(html)) {
    throw new Error(
      `KBR homepage no longer links to the official careers site: ${HOMEPAGE_URL}`,
    )
  }
}

const assertOfficialCareersLanding = (html) => {
  if (!CAREERS_BRAND_SIGNAL_PATTERN.test(html) || !CAREERS_SEARCH_SIGNAL_PATTERN.test(html)) {
    throw new Error(
      `KBR careers landing page no longer matches the verified first-party surface: ${CAREERS_LANDING_URL}`,
    )
  }
}

const phenomScraper = createPhenomScraper({
  companyName: 'KBR',
  source: 'kbr',
  baseUrl: 'https://careers.kbr.com',
  searchPath: '/us/en/search-results',
  scraperDir: currentDir,
})

export const {
  buildSearchResultsPageUrl,
  buildJobDetailUrl,
  extractSearchPayload,
  extractSearchResults,
  extractJobDetail,
} = phenomScraper

export const run = async (options = {}) => {
  const getPage = options.fetchText || fetchText

  assertOfficialHomepage(await getPage(HOMEPAGE_URL))
  assertOfficialCareersLanding(await getPage(CAREERS_LANDING_URL))

  const jobs = await phenomScraper.run({
    ...options,
    fetchText: getPage,
  })

  return jobs.map((job) => ({
    ...job,
    country: job.country || 'India',
  }))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running KBR scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)
  const cities = [...new Set(jobs.map((job) => job.city).filter(Boolean))].sort()
  console.log(`Cities found: ${cities.join(', ')}`)
  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'kbr')
    console.log('DB result:', result)
    process.exit(0)
  }
}
