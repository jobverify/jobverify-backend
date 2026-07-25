import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREER_PAGE_URL = 'https://openinapp.com/'
export const CAREERS_ROUTE_URL = 'https://openinapp.com/careers'
export const CAREER_ROUTE_URL = 'https://openinapp.com/career'
export const JOBS_ROUTE_URL = 'https://openinapp.com/jobs'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const CAREERS_SIGNAL_PATTERN = /\b(career|careers|job opening|job openings|vacancy|vacancies|join us|we are hiring|hiring)\b/i

export const hasOfficialSiteSignal = (html) => {
  const page = String(html ?? '')

  return /OpeninApp - Best Link Shortener\s*(?:&amp;|&)\s*App Opener/i.test(page)
    && /The ultimate link shortener\./i.test(page)
    && /\bOpeninApp\b/i.test(page)
}

export const hasCareersSignal = (html) => CAREERS_SIGNAL_PATTERN.test(String(html ?? ''))

export const isMissingCareerRoute = (html) => {
  const page = String(html ?? '')

  return /OpeninApp\s*\|\s*404 Not found/i.test(page)
    && /<h1[^>]*>\s*404 Not found\s*<\/h1>/i.test(page)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'openinapp',
  timeoutMs: 15000,
})

export const createOpeninAppScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(CAREER_PAGE_URL)

    if (!hasOfficialSiteSignal(homepageHtml)) {
      throw new Error('OpeninApp homepage no longer matches the verified official public surface')
    }

    if (hasCareersSignal(homepageHtml)) {
      throw new Error('OpeninApp public careers surface changed on the official homepage')
    }

    const routePages = await Promise.all([
      fetchText(CAREERS_ROUTE_URL),
      fetchText(CAREER_ROUTE_URL),
      fetchText(JOBS_ROUTE_URL),
    ])

    if (!routePages.every((page) => isMissingCareerRoute(page))) {
      throw new Error('OpeninApp verified missing careers routes changed on the official site')
    }

    return []
  },
})

export const run = async (options = {}) => createOpeninAppScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, 'openinapp')
  }
}
