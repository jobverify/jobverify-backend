import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'iqnextsynconext'
export const COMPANY = 'IQnext (Synconext)'
export const HOMEPAGE_URL = 'https://www.synconext.com/'
export const NO_PUBLIC_CAREERS_ROUTE_URLS = [
  'https://www.synconext.com/careers',
  'https://www.synconext.com/careers/',
  'https://www.synconext.com/career',
  'https://www.synconext.com/career/',
  'https://www.synconext.com/jobs',
  'https://www.synconext.com/jobs/',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const HOMEPAGE_SIGNALS = [
  '<title>home - synconext</title>',
  'meta property="og:site_name" content="synconext - integrated workspace &amp; energy management solutions"',
  'meta property="og:title" content="home | synconext"',
  'we are now on our new website for iqnext',
  'click here to go to iqnext',
  'www.iqnext.io',
]

const NO_PUBLIC_CAREERS_SIGNALS = [
  'no results found',
  'the page you requested could not be found',
  'try refining your search',
]

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bsearch jobs\b/i,
  /\bjob openings\b/i,
  /\bapply now\b/i,
  /\bview jobs\b/i,
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /greenhouse\.io/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined
  }

  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

export const defaultFetchPage = async (url, {
  fetchImpl = fetch,
  timeoutMs = 15000,
} = {}) => {
  const response = await fetchImpl(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: createTimeoutSignal(timeoutMs),
  })

  return {
    status: response.status,
    url: response.url,
    headers: {
      location: response.headers.get('location'),
    },
    html: await response.text(),
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const normalized = String(html ?? '').toLowerCase()
  return HOMEPAGE_SIGNALS.every((signal) => normalized.includes(signal))
}

export const hasPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const isVerifiedMissingCareersRoute = (page = {}) => {
  if (Number(page?.status) !== 404) {
    return false
  }

  if (hasPublicJobsSignal(page?.html)) {
    return false
  }

  const normalized = normalizeWhitespace(page?.html).toLowerCase()
  return NO_PUBLIC_CAREERS_SIGNALS.every((signal) => normalized.includes(signal))
}

export const createIqnextSynconextScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('IQnext (Synconext) verified official homepage no longer matches the known public surface')
    }

    if (hasPublicJobsSignal(homepage.html)) {
      throw new Error('IQnext (Synconext) homepage now appears to expose a public jobs surface')
    }

    for (const careersRouteUrl of NO_PUBLIC_CAREERS_ROUTE_URLS) {
      const careersRoute = await fetchPage(careersRouteUrl)

      if (!isVerifiedMissingCareersRoute(careersRoute)) {
        throw new Error('IQnext (Synconext) careers routes changed materially or now expose public jobs')
      }
    }

    return []
  },
})

export const run = async (options = {}) => createIqnextSynconextScraper().run(options)

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
