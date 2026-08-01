import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createBrowserFetchSession } from '../../scraper-support/shared/browserFetch.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'koinx'
export const COMPANY = 'KoinX'
export const VERIFIED_ON = '2026-07-25'
export const HOMEPAGE_URL = 'https://www.koinx.com/careers'
export const CAREERS_URL = 'https://wellfound.com/company/koinx/jobs'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

const isBrowserFallbackError = (error) =>
  /HTTP (?:403|429)\b|fetch failed|timed out|timeout|could not connect|und_err_connect_timeout|ssl\/tls secure channel|econnreset|unable to/i
    .test(String(error?.message ?? error ?? ''))

export const hasEmptyJobsSurfaceSignal = (html = '') => {
  const text = normalizeWhitespace(html)

  return /View\s+0\s+jobs/i.test(text)
    && /KoinX\s+hasn't\s+added\s+any\s+jobs\s+yet/i.test(text)
}

export const createKoinXScraper = () => ({
  async run({ fetchText = defaultFetchText, fetchBrowserText } = {}) {
    let browserSession = null

    const getBrowserSession = async () => {
      if (!browserSession) {
        browserSession = await createBrowserFetchSession()
      }

      return browserSession
    }

    const browserTextFetcher = fetchBrowserText || (async (url) => {
      const session = await getBrowserSession()
      return session.fetchText(url)
    })

    try {
      let jobsHtml
      try {
        jobsHtml = await fetchText(CAREERS_URL)
      } catch (error) {
        if (!isBrowserFallbackError(error)) throw error
        jobsHtml = await browserTextFetcher(CAREERS_URL)
      }

      if (!hasEmptyJobsSurfaceSignal(jobsHtml)) {
        throw new Error('KoinX verified empty jobs surface changed or now exposes public jobs')
      }

      return []
    } finally {
      if (browserSession) await browserSession.close()
    }
  },
})

export const run = async (options = {}) => createKoinXScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
