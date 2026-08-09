import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'bharatpe'
export const COMPANY = 'BharatPe'
export const HOMEPAGE_URL = 'https://bharatpe.com/'
export const CAREERS_ROUTE_URLS = [
  'https://bharatpe.com/careers',
  'https://bharatpe.com/careers/',
  'https://bharatpe.com/career',
  'https://bharatpe.com/career/',
  'https://bharatpe.com/jobs',
  'https://bharatpe.com/jobs/',
  'https://bharatpe.com/join-us',
  'https://bharatpe.com/join-us/',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bsearch jobs\b/i,
  /\bjob openings\b/i,
  /\bapply now\b/i,
  /\bjob description\b/i,
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
  /recruitcrm/i,
]

const NOT_FOUND_SIGNAL_PATTERNS = [
  /\b404\b/i,
  /\bpage not found\b/i,
  /\bnot found\b/i,
  /\bdoesn'?t exist\b/i,
  /\bcan't seem to find\b/i,
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

const isSameOfficialDomain = (value) => {
  try {
    return new URL(value || HOMEPAGE_URL).hostname === 'bharatpe.com'
  } catch {
    return false
  }
}

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
    headers: {
      location: response.headers.get('location'),
    },
    html: await response.text(),
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml).toLowerCase()

  return /<title[^>]*>[^<]*bharatpe[^<]*<\/title>/i.test(rawHtml)
    && /bharatpe\.com/i.test(rawHtml)
    && normalized.includes('bharatpe')
}

export const hasPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const isVerifiedNoPublicJobsRoute = (page = {}) => {
  if (!isSameOfficialDomain(page.url || HOMEPAGE_URL)) {
    return false
  }

  if (hasPublicJobsSignal(page.html)) {
    return false
  }

  if (Number(page.status) === 404) {
    return true
  }

  const normalized = normalizeWhitespace(page.html).toLowerCase()
  return hasOfficialHomepageSignal(page.html)
    || NOT_FOUND_SIGNAL_PATTERNS.some((pattern) => pattern.test(normalized))
}

export const createBharatPeScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('BharatPe verified official homepage no longer matches the known public surface')
    }

    if (hasPublicJobsSignal(homepage.html)) {
      throw new Error('BharatPe homepage now appears to expose a public jobs surface')
    }

    for (const careersRouteUrl of CAREERS_ROUTE_URLS) {
      const careersRoute = await fetchPage(careersRouteUrl)

      if (!isVerifiedNoPublicJobsRoute(careersRoute)) {
        throw new Error('BharatPe careers routes changed materially or now expose public jobs')
      }
    }

    return []
  },
})

export const run = async (options = {}) => createBharatPeScraper().run(options)

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
