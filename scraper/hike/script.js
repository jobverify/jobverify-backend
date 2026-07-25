import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'hike'
export const COMPANY = 'Hike'
export const HOMEPAGE_URL = 'https://www.hike.in/'
export const CAREERS_ROUTE_URLS = [
  'https://www.hike.in/careers',
  'https://www.hike.in/careers/',
  'https://www.hike.in/jobs',
  'https://www.hike.in/jobs/',
  'https://www.hike.in/career',
  'https://www.hike.in/career/',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const VERIFIED_OUTAGE_SIGNALS = [
  '502 server error',
  'error: server error',
  'the server encountered a temporary error and could not complete your request.',
  'please try again in 30 seconds.',
]

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bsearch jobs\b/i,
  /\bjob openings\b/i,
  /\bapply now\b/i,
  /\bview jobs\b/i,
  /\bjob description\b/i,
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
    html: await response.text(),
  }
}

export const hasVerifiedFirstPartyOutageSignal = (html) => {
  const normalized = normalizeWhitespace(html).toLowerCase()
  return VERIFIED_OUTAGE_SIGNALS.every((signal) => normalized.includes(signal))
}

export const hasPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const isVerifiedOutagePage = (page = {}) =>
  Number(page?.status) === 502
  && !hasPublicJobsSignal(page?.html)
  && hasVerifiedFirstPartyOutageSignal(page?.html)

export const createHikeScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (!isVerifiedOutagePage(homepage)) {
      throw new Error('Hike verified official homepage surface changed; refusing to guess any public jobs source')
    }

    for (const careersRouteUrl of CAREERS_ROUTE_URLS) {
      const careersRoute = await fetchPage(careersRouteUrl)

      if (!isVerifiedOutagePage(careersRoute)) {
        throw new Error('Hike careers routes changed materially or now expose public jobs')
      }
    }

    return []
  },
})

export const run = async (options = {}) => createHikeScraper().run(options)

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
