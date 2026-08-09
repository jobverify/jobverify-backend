import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  extractPaginationSummary,
  extractSearchResults,
} from '../synopsys/script.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'ansys'
export const COMPANY = 'Ansys'
export const CAREERS_PAGE_URL = 'https://www.ansys.com/careers'
export const SEARCH_PAGE_URL = 'https://careers.synopsys.com/search-jobs/ansys/44408/1'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(value)
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const toAbsoluteUrl = (value) => {
  if (!value) return null

  try {
    return new URL(decodeHtmlEntities(value), 'https://careers.synopsys.com').toString()
  } catch {
    return null
  }
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page).toLowerCase()

  return (
    text.includes('ansys')
    && text.includes('careers')
    && text.includes('search for jobs')
    && page.includes('careers.synopsys.com/search-jobs/ansys/44408/1')
  )
}

export const extractVerifiedSearchUrl = (html) => {
  for (const match of String(html ?? '').matchAll(/href=["']([^"']+)["']/gi)) {
    const url = toAbsoluteUrl(match[1])
    if (url === SEARCH_PAGE_URL) {
      return url
    }
  }

  return null
}

export const extractNextPageUrl = (html) => {
  const match = String(html ?? '').match(/<a class="next" href="([^"]+)"/i)
  return toAbsoluteUrl(match?.[1] ?? null)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

export const createAnsysScraper = ({
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY,
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_PAGE_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Ansys careers page no longer matches the verified Synopsys search handoff surface')
    }

    const verifiedSearchUrl = extractVerifiedSearchUrl(careersHtml)
    if (verifiedSearchUrl !== SEARCH_PAGE_URL) {
      throw new Error('Ansys careers page no longer exposes the verified Synopsys search handoff')
    }

    const jobs = []
    const seenJobIds = new Set()
    let nextPageUrl = verifiedSearchUrl
    let pagesFetched = 0

    while (nextPageUrl && pagesFetched < maxPages) {
      const html = await fetchText(nextPageUrl)
      const listings = extractSearchResults(html)

      for (const job of listings) {
        if (seenJobIds.has(job.jobId)) continue
        seenJobIds.add(job.jobId)

        jobs.push({
          ...job,
          company: COMPANY,
          source: SOURCE,
          link: job.applyUrl || job.sourceUrl,
          scrapedAt: now(),
        })

        if (maxJobs && jobs.length >= maxJobs) {
          return jobs
        }
      }

      pagesFetched += 1
      const summary = extractPaginationSummary(html)
      if (!summary.hasNext || (summary.totalPages && pagesFetched >= summary.totalPages)) {
        break
      }

      const candidateNextPageUrl = extractNextPageUrl(html)
      if (!candidateNextPageUrl || candidateNextPageUrl === nextPageUrl) {
        break
      }

      nextPageUrl = candidateNextPageUrl
    }

    return jobs
  },
})

export const run = async (options = {}) => createAnsysScraper().run(options)

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
