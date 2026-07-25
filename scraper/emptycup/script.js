import path from 'path'
import { fileURLToPath } from 'url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREER_PAGE_URL = 'https://emptycup.in/'
export const CAREERS_ROUTE_URL = 'https://emptycup.in/careers'
export const JOBS_ROUTE_URL = 'https://emptycup.in/jobs'

const MISSING_ROUTE_PATTERN = /\b404 not found\b/i

export const hasOfficialSiteSignal = (html) =>
  /<title>\s*EmptyCup\b|\bWelcome to EmptyCup\b/i.test(html || '')

export const isMissingCareerRoute = (html) => MISSING_ROUTE_PATTERN.test(html || '')

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  return response.text()
}

export const createEmptyCupScraper = () => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const homepageHtml = await fetchText(CAREER_PAGE_URL)
    const careersHtml = await fetchText(CAREERS_ROUTE_URL)
    const jobsHtml = await fetchText(JOBS_ROUTE_URL)

    const hasOfficialSite = hasOfficialSiteSignal(homepageHtml)
    const careersRouteMissing = isMissingCareerRoute(careersHtml)
    const jobsRouteMissing = isMissingCareerRoute(jobsHtml)

    if (!hasOfficialSite) {
      throw new Error('EmptyCup official site no longer matches the verified public surface')
    }

    if (!careersRouteMissing || !jobsRouteMissing) {
      throw new Error('EmptyCup careers routes no longer match the verified no-public-listings surface')
    }

    return []
  },
})

export const run = async () => createEmptyCupScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running EmptyCup scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'emptycup')
    console.log('DB result:', result)
    process.exit(0)
  }
}
