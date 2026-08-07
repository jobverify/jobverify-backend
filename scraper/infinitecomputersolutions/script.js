import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createBrowserFetchSession } from '../../scraper-support/shared/browserFetch.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'infinitecomputersolutions'
export const COMPANY = 'Infinite Computer Solutions'
export const CAREERS_URL = 'https://www.infinite.com/careers'
export const BRASSRING_URL =
  'https://sjobs.brassring.com/TGNewUI/Search/Home/Home?partnerid=26656&siteid=5008'
export const INDIA_BRASSRING_SEARCH_URL = `${BRASSRING_URL}#keyWordSearch=&locationSearch=India`

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const shouldUseBrowserFallback = (error) =>
  /HTTP (?:403|429)\b|fetch failed|timed out|timeout|could not connect|und_err_connect_timeout|ssl\/tls secure channel|econnreset|unable to/i
    .test(String(error?.message ?? error ?? ''))

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&amp;/gi, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeTextContent = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const normalizedLower = normalizeTextContent(page)?.toLowerCase() || ''

  return normalizedLower.includes('careers at infinite')
    && normalizedLower.includes('the work we do impacts the world, and the future!')
    && normalizedLower.includes('explore current openings')
    && normalizedLower.includes('submit your resume')
}

export const extractBrassringUrl = (html) => {
  for (const match of String(html ?? '').matchAll(/href=["']([^"']+)["']/gi)) {
    const rawUrl = normalizeWhitespace(match[1])
    if (!rawUrl) continue

    try {
      const absoluteUrl = new URL(rawUrl, CAREERS_URL)
      absoluteUrl.hash = ''
      if (absoluteUrl.toString() === BRASSRING_URL) return absoluteUrl.toString()
    } catch {
      continue
    }
  }

  return null
}

export const hasIndiaSearchEmptySignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeTextContent(page)

  return (
    /Search Jobs at Infinite Computer Solutions|India - Job Search/i.test(page)
    && normalized?.includes('Search job opportunities that match your interests')
    && normalized?.includes('Search location')
    && normalized?.includes('There are no jobs that match your criteria')
  )
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createInfiniteComputerSolutionsScraper = () => ({
  async run({ fetchText = defaultFetchText, fetchBrowserText } = {}) {
    let browserSession = null

    const getBrowserSession = async () => {
      if (!browserSession) {
        browserSession = await createBrowserFetchSession({
          userAgent: USER_AGENT,
          settleTimeMs: 5000,
        })
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
        throw new Error('Infinite Computer Solutions careers page no longer matches the verified official careers surface')
      }

      const brassringUrl = extractBrassringUrl(careersHtml)
      if (brassringUrl !== BRASSRING_URL) {
        throw new Error('Infinite Computer Solutions careers page no longer links to the verified public BrassRing surface')
      }

      const brassringHtml = await browserTextFetcher(INDIA_BRASSRING_SEARCH_URL)
      if (!hasIndiaSearchEmptySignal(brassringHtml)) {
        throw new Error('Infinite Computer Solutions India BrassRing search now exposes usable listings or changed shape')
      }

      return []
    } finally {
      if (browserSession) {
        await browserSession.close().catch(() => {})
      }
    }
  },
})

export const run = async (options = {}) => createInfiniteComputerSolutionsScraper().run(options)

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
