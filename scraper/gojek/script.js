import path from 'path'
import { fileURLToPath } from 'url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREER_PAGE_URL = 'https://www.gojek.io/careers'
export const ALL_JOBS_URL = 'https://www.gojek.io/careers/all'
export const GOTO_CAREERS_URL = 'https://www.gotocompany.com/careers'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export const buildSearchUrl = () => CAREER_PAGE_URL

export const pageIndicatesSecurityCheckpoint = (html) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return normalized.includes('vercel security checkpoint')
}

export const extractGotoBundleUrl = (html) => {
  const match = String(html ?? '').match(/\/_next\/static\/chunks\/pages\/careers-[^"' ]+\.js/)
  if (!match) return null

  return new URL(match[0], GOTO_CAREERS_URL).toString()
}

const pageIndicatesGojekLabel = (html) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return normalized.includes('karier di gojek')
}

const pageIndicatesAllJobsUrl = (html) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return normalized.includes(ALL_JOBS_URL.toLowerCase())
}

const bundleIndicatesHoldCoOnly = (html) => {
  const normalized = normalizeWhitespace(html)

  return (
    normalized.includes('company=HoldCo')
    && normalized.includes('https://www.gojek.io/careers/all')
  )
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  return {
    status: response.status,
    text: await response.text(),
  }
}

export const createGojekScraper = () => ({
  async run(options = {}) {
    const fetchPage = options.fetchPage || defaultFetchPage
    const gojekPage = await fetchPage(buildSearchUrl())

    if (gojekPage.status === 429 && pageIndicatesSecurityCheckpoint(gojekPage.text)) {
      const gotoPage = await fetchPage(GOTO_CAREERS_URL)
      const bundleUrl = extractGotoBundleUrl(gotoPage.text)

      if (!bundleUrl) {
        throw new Error('Gojek public careers signals no longer prove the expected checkpointed HoldCo-only Gojek state')
      }

      const bundlePage = await fetchPage(bundleUrl)
      const gojekCardStillPointsToCheckpointedBoard = (
        (pageIndicatesGojekLabel(gotoPage.text) || pageIndicatesGojekLabel(bundlePage.text))
        && (pageIndicatesAllJobsUrl(gotoPage.text) || pageIndicatesAllJobsUrl(bundlePage.text))
      )

      if (
        bundlePage.status === 200
        && bundleIndicatesHoldCoOnly(bundlePage.text)
        && gojekCardStillPointsToCheckpointedBoard
      ) {
        return []
      }
    }

    throw new Error('Gojek public careers signals no longer prove the expected checkpointed HoldCo-only Gojek state')
  },
})

export const run = async () => createGojekScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Gojek scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'gojek')
    console.log('DB result:', result)
    process.exit(0)
  }
}
