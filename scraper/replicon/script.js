import path from 'node:path'
import { fileURLToPath } from 'node:url'

import REPLICON_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = REPLICON_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const REDIRECT_CAREERS_URL = PROVIDER_METADATA.redirectCareersUrl
export const GENERIC_SEARCH_JOBS_URL = PROVIDER_METADATA.genericSearchJobsUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#x27;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const extractGenericSearchJobsUrl = (html = '') => {
  for (const match of String(html).matchAll(
    /<a[^>]+href=["']([^"']+)["'][^>]*>\s*Search Jobs\s*<\/a>/gi,
  )) {
    try {
      return new URL(match[1], REDIRECT_CAREERS_URL).toString()
    } catch {
      continue
    }
  }

  return null
}

export const hasRedirectedDeltekCareersSignal = (page = {}) => {
  const normalized = normalizeWhitespace(page?.html)

  return page?.status === 200
    && page?.url === REDIRECT_CAREERS_URL
    && normalized.includes('Drive Your Career with #TeamDeltek')
    && normalized.includes('Search Jobs')
    && normalized.includes('Replicon')
    && extractGenericSearchJobsUrl(page?.html) === GENERIC_SEARCH_JOBS_URL
}

export const createRepliconScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const careersPage = await fetchPage(CAREERS_URL)

    if (!hasRedirectedDeltekCareersSignal(careersPage)) {
      throw new Error('Replicon careers redirect no longer matches the verified generic Deltek hiring surface')
    }

    return []
  },
})

export const run = async (options = {}) => createRepliconScraper().run(options)

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
