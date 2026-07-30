import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createBrowserFetchSession } from '../shared/browserFetch.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

import { MOBILOITTE_TECHNOLOGIES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = MOBILOITTE_TECHNOLOGIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value = '') => String(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('Careers at Mobiloitte That Build Your Future')
    && normalized.includes('Current Openings')
    && normalized.includes('Search Jobs')
    && normalized.includes("Didn't find the right position?")
    && normalized.includes('careers@mobiloitte.com')
  }

export const hasNoJobsFoundState = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('No Jobs Found')
    && normalized.includes("We couldn't find any jobs matching your criteria.")
  }

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const isBrowserFallbackError = (error) =>
  /HTTP (?:403|429)\b|fetch failed|timed out|timeout|could not connect|und_err_connect_timeout|ssl\/tls secure channel|econnreset|unable to/i
    .test(String(error?.message ?? error ?? ''))

export const createMobiloitteTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText, fetchBrowserText } = {}) {
    let browserSession = null

    const getBrowserSession = async () => {
      if (!browserSession) {
        browserSession = await createBrowserFetchSession({ userAgent: USER_AGENT })
      }

      return browserSession
    }

    const browserTextFetcher = fetchBrowserText || (async (url) => {
      const session = await getBrowserSession()
      return session.fetchText(url)
    })

    const fetchPageText = async (url) => {
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
      const careersHtml = await fetchPageText(CAREERS_URL)

      if (!hasOfficialCareersSignal(careersHtml)) {
        throw new Error('Mobiloitte Technologies verified careers page no longer matches the trusted first-party contract')
      }

      if (!hasNoJobsFoundState(careersHtml)) {
        throw new Error('Mobiloitte Technologies verified careers page no longer exposes the no-jobs-found empty state')
      }

      return []
    } finally {
      if (browserSession) {
        await browserSession.close()
      }
    }
  },
})

export const run = async (options = {}) => createMobiloitteTechnologiesScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
