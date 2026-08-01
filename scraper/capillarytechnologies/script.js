import path from 'path'
import { fileURLToPath } from 'url'

import { createBrowserFetchSession } from '../../scraper-support/shared/browserFetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREER_PAGE_URL = 'https://www.capillarytech.com/careers/'

const PENDING_CAREERS_PATTERN = /hand-crafting a brand-new careers experience[\s\S]*?live soon/i

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; JobifyCareerScraper/1.0)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

const isBrowserFallbackError = (error) =>
  /HTTP (?:403|429)\b|fetch failed|timed out|timeout|could not connect|und_err_connect_timeout|ssl\/tls secure channel|econnreset|unable to/i
    .test(String(error?.message ?? error ?? ''))

export const isCareersExperiencePending = (html) => PENDING_CAREERS_PATTERN.test(html || '')

export const createCapillaryTechnologiesScraper = () => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const fetchBrowserText = options.fetchBrowserText
    let browserSession = null

    const getBrowserSession = async () => {
      if (!browserSession) {
        browserSession = await createBrowserFetchSession({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        })
      }

      return browserSession
    }

    const browserTextFetcher = fetchBrowserText || (async (url) => {
      const session = await getBrowserSession()
      return session.fetchText(url)
    })

    const fetchCareersText = async (url) => {
      try {
        return await fetchText(url)
      } catch (error) {
        if (!isBrowserFallbackError(error)) {
          throw error
        }

        return browserTextFetcher(url)
      }
    }

    try {
      const careersHtml = await fetchCareersText(CAREER_PAGE_URL)

      if (!isCareersExperiencePending(careersHtml)) {
        throw new Error('Capillary Technologies careers page changed; scraper needs an update')
      }

      return []
    } finally {
      if (browserSession) {
        await browserSession.close()
      }
    }
  },
})

export const run = async () => createCapillaryTechnologiesScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Capillary Technologies scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'capillarytechnologies')
    console.log('DB result:', result)
    process.exit(0)
  }
}
