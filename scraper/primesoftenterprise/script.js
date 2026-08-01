import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'primesoftenterprise'
export const COMPANY = 'Primesoft Enterprise'
export const HOMEPAGE_URL = 'https://www.primesoftindia.com/'
export const CAREERS_ROUTE_URLS = [
  'https://www.primesoftindia.com/careers',
  'https://www.primesoftindia.com/careers/',
  'https://www.primesoftindia.com/career',
  'https://www.primesoftindia.com/career/',
  'https://www.primesoftindia.com/jobs',
  'https://www.primesoftindia.com/jobs/',
  'https://www.primesoftindia.com/join-us',
  'https://www.primesoftindia.com/join-us/',
  'https://www.primesoftindia.com/current-openings',
  'https://www.primesoftindia.com/current-openings/',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bjob openings\b/i,
  /\bsearch jobs\b/i,
  /\bapply now\b/i,
  /\bjob description\b/i,
  /\bjoin our team\b/i,
  /boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /workdayjobs/i,
  /myworkdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
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
    headers: {
      server: response.headers.get('server'),
      platform: response.headers.get('platform'),
      panel: response.headers.get('panel'),
      location: response.headers.get('location'),
      'content-type': response.headers.get('content-type'),
    },
    html: await response.text(),
  }
}

export const hasPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const isVerifiedBlockedHomepage = (page = {}) => {
  if (Number(page?.status) !== 403) {
    return false
  }

  if (hasPublicJobsSignal(page?.html)) {
    return false
  }

  const rawHtml = String(page?.html ?? '')
  const normalized = normalizeWhitespace(rawHtml)
  const server = String(page?.headers?.server ?? '')
  const platform = String(page?.headers?.platform ?? '')
  const panel = String(page?.headers?.panel ?? '')

  return /<title>\s*403 Forbidden\s*<\/title>/i.test(rawHtml)
    && /\b403\b/.test(normalized)
    && /\bForbidden\b/i.test(normalized)
    && /Access to this resource on the server is denied!/i.test(normalized)
    && /LiteSpeed/i.test(server)
    && /hostinger/i.test(platform)
    && /hpanel/i.test(panel)
}

export const isVerifiedAbsentCareersRoute = (page = {}) => {
  if (Number(page?.status) !== 404) {
    return false
  }

  if (hasPublicJobsSignal(page?.html)) {
    return false
  }

  const rawHtml = String(page?.html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*This Page Does Not Exist\s*<\/title>/i.test(rawHtml)
    && /This Page Does Not Exist/i.test(normalized)
    && /Sorry, the page you are looking for could not be found\./i.test(normalized)
    && /It'?s just an accident that was not intentional\./i.test(normalized)
}

export const createPrimesoftEnterpriseScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (hasPublicJobsSignal(homepage.html)) {
      throw new Error('Primesoft Enterprise homepage now exposes a public jobs surface')
    }

    if (!isVerifiedBlockedHomepage(homepage)) {
      throw new Error('Primesoft Enterprise verified homepage no longer matches the blocked homepage contract')
    }

    for (const careersRouteUrl of CAREERS_ROUTE_URLS) {
      const careersRoute = await fetchPage(careersRouteUrl)

      if (!isVerifiedAbsentCareersRoute(careersRoute)) {
        throw new Error('Primesoft Enterprise careers routes changed materially or now expose public jobs')
      }
    }

    return []
  },
})

export const run = async (options = {}) => createPrimesoftEnterpriseScraper().run(options)

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
