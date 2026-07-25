import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { MCAFEE_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const JOIN_URL = PROVIDER_METADATA.companyCareerPage
export const SEARCH_RESULTS_URL = PROVIDER_METADATA.searchResultsUrl
export { PROVIDER_METADATA }

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&#x27;|&#8217;/gi, "'")
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const hasJoinShellSignal = (html) => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('Careers At McAfee')
    && normalized.includes('Join our Talent Community')
    && normalized.includes('See jobs by:')
    && normalized.includes('Categories')
    && normalized.includes('Locations')
}

export const hasNonEnumerableSearchShellSignal = (page = {}) => {
  const normalized = normalizeWhitespace(page.html)
  return Number(page.status) === 200
    && normalized.includes('The page you are looking for no longer exists.')
    && normalized.includes('start your job search')
    && normalized.includes('See jobs by:')
    && normalized.includes('Categories')
    && normalized.includes('Locations')
}

export const createMcAfeeScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const joinPage = await fetchPage(JOIN_URL)
    const searchPage = await fetchPage(SEARCH_RESULTS_URL)

    if (joinPage.status !== 200 || !hasJoinShellSignal(joinPage.html)) {
      throw new Error('McAfee join page no longer matches the verified careers shell')
    }

    if (!hasNonEnumerableSearchShellSignal(searchPage)) {
      throw new Error('McAfee search shell changed materially or now exposes a trustworthy inventory')
    }

    return []
  },
})

export const run = async (options = {}) => createMcAfeeScraper().run(options)

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
