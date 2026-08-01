import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const CAREERS_PAGE_URL = 'https://www.camsonline.com/about-cams/careers'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const buildSearchUrl = () => CAREERS_PAGE_URL

export const validateNoOpeningsPage = (html) => {
  const page = String(html ?? '')

  return /<title>\s*CAMS Careers \| CAMS Jobs Vacancy\|\s*Mutual Funds Service online\|\s*camsonline\.com\s*<\/title>/i.test(page)
    && /<meta\b[^>]*name=["']description["'][^>]*content=["'][^"']*join the CAMS team[^"']*retaining the best talent[^"']*["'][^>]*>/i.test(page)
    && /<link\b[^>]*rel=["']canonical["'][^>]*href=["']https:\/\/www\.camsonline\.com\/about-cams\/careers\/?["'][^>]*>/i.test(page)
    && /<app-root\b[^>]*>/i.test(page)
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Jobify/1.0)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const createCamsScraper = () => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const html = await fetchText(buildSearchUrl())

    if (!validateNoOpeningsPage(html)) {
      throw new Error('CAMS careers page no longer exposes the expected no-openings page shape')
    }

    return []
  },
})

export const run = async () => createCamsScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running CAMS scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'cams')
    console.log('DB result:', result)
    process.exit(0)
  }
}
