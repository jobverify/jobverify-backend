import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createBrowserFetchSession } from '../../scraper-support/shared/browserFetch.js'
import { runWorkdayScraper } from '../../scraper-support/myworkday/engine.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { ROCKET_SOFTWARE_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const WORKDAY_BOARD_URL = PROVIDER_METADATA.workdayBoardUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const shouldUseBrowserFallback = (error) =>
  /HTTP (?:403|429)\b|just a moment|cloudflare|forbidden|captcha|challenge|access denied|blocked/i
    .test(String(error?.message ?? error ?? ''))

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Careers\b/i.test(page)
    && /Rocket Software/i.test(text)
    && /Current Openings|View current openings/i.test(text)
    && page.includes(WORKDAY_BOARD_URL)
}

export const createRocketSoftwareScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    fetchBrowserText,
    runWorkday = runWorkdayScraper,
  } = {}) {
    let browserSession = null

    const getBrowserSession = async () => {
      if (!browserSession) {
        browserSession = await createBrowserFetchSession({ userAgent: USER_AGENT })
      }

      return browserSession
    }

    const browserTextFetcher = fetchBrowserText || (async (url) => {
      const session = await getBrowserSession()
      const page = await session.fetchPage(url)

      if (![200, 304].includes(page.status)) {
        throw new Error(`HTTP ${page.status} for ${url}`)
      }

      return page.html
    })

    const fetchTextWithBrowserFallback = async (url) => {
      try {
        return await fetchText(url)
      } catch (error) {
        if (!shouldUseBrowserFallback(error)) {
          throw error
        }

        return browserTextFetcher(url)
      }
    }

    try {
      const careersHtml = await fetchTextWithBrowserFallback(CAREERS_URL)
      if (!hasOfficialCareersSignal(careersHtml)) {
        throw new Error('Rocket Software verified careers page changed materially')
      }

      const jobs = await runWorkday({
        company: COMPANY,
        baseUrl: WORKDAY_BOARD_URL,
        locationCountry: 'India',
        source: SOURCE,
        scraperDir: currentDir,
      })

      return jobs.map((job) => ({
        ...job,
        company: job.company || COMPANY,
        source: job.source || SOURCE,
        sourceUrl: job.sourceUrl || job.link || null,
        applyUrl: job.applyUrl || job.link || null,
      }))
    } finally {
      if (browserSession) {
        await browserSession.close().catch(() => {})
      }
    }
  },
})

export const run = async (options = {}) => createRocketSoftwareScraper().run(options)

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
