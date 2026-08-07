import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'iqnextsynconext'
export const COMPANY = 'IQnext (Synconext)'
export const HOMEPAGE_URL = 'https://www.iqnext.io/'
export const CAREERS_URL = 'https://www.iqnext.io/careers'
export const WELLFOUND_JOBS_URL = 'https://wellfound.com/company/iqnext/jobs'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

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
    redirect: 'follow',
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
  const normalized = normalizeWhitespace(rawHtml)

  return rawHtml.includes('data-wf-domain="www.iqnext.io"')
    && /<title>\s*IoT Based Platform for Smart Building Management - IQnext\s*<\/title>/i.test(rawHtml)
    && /<link[^>]+(?:href=["']https:\/\/www\.iqnext\.io\/?["'][^>]+rel=["']canonical["']|rel=["']canonical["'][^>]+href=["']https:\/\/www\.iqnext\.io\/?["'])/i.test(rawHtml)
    && normalized.includes('IQnext is a centralised platform that is redefining building operations')
    && normalized.includes('Building operations efficiency energy maintenance made exceptionally easy')
    && normalized.includes('Trusted by forward thinking buildings')
}

export const hasOfficialCareersSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return rawHtml.includes('data-wf-domain="www.iqnext.io"')
    && /<title>\s*Careers \| IQnext\s*<\/title>/i.test(rawHtml)
    && /<link[^>]+(?:href=["']https:\/\/www\.iqnext\.io\/careers\/?["'][^>]+rel=["']canonical["']|rel=["']canonical["'][^>]+href=["']https:\/\/www\.iqnext\.io\/careers\/?["'])/i.test(rawHtml)
    && normalized.includes('Your ideas can power the future of sustainable spaces')
    && normalized.includes('Take ownership, grow faster, and make an impact that matters')
    && normalized.includes('See Open Positions')
    && normalized.includes('Why Join IQnext')
    && normalized.includes('Transforming an Industry')
}

export const extractWellfoundJobsUrl = (html) => {
  for (const match of String(html ?? '').matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi)) {
    try {
      const url = new URL(match[1], CAREERS_URL)
      const hostname = url.hostname.toLowerCase()
      const pathname = url.pathname.replace(/\/+$/, '')

      if (
        hostname === 'angel.co'
        && pathname === '/company/iqnext/jobs'
      ) {
        return WELLFOUND_JOBS_URL
      }

      if (
        hostname === 'wellfound.com'
        && pathname === '/company/iqnext/jobs'
      ) {
        return WELLFOUND_JOBS_URL
      }
    } catch {
      continue
    }
  }

  return null
}

export const isVerifiedWellfoundChallenge = (page = {}) => {
  const rawHtml = String(page?.html ?? '')
  const normalized = normalizeWhitespace(rawHtml).toLowerCase()
  const responseUrl = String(page?.url ?? '')
  const isVerifiedWellfoundUrl =
    responseUrl === WELLFOUND_JOBS_URL
    || responseUrl.startsWith('https://wellfound.com/')
  const hasLegacyChallengeSignal =
    normalized.includes('please enable js and disable any ad blocker')
    && rawHtml.toLowerCase().includes('captcha-delivery.com')
  const hasCloudflareChallengeSignal =
    /<title>\s*Just a moment\.\.\.\s*<\/title>/i.test(rawHtml)
    && /noindex,nofollow/i.test(rawHtml)
    && normalized.includes('enable javascript and cookies to continue')
    && (
      rawHtml.toLowerCase().includes('window._cf_chl_opt')
      || rawHtml.toLowerCase().includes('cf_chl_opt')
    )
    && rawHtml.toLowerCase().includes('challenge-platform')
    && normalized.includes('ray id')

  return Number(page?.status) === 403
    && isVerifiedWellfoundUrl
    && (hasLegacyChallengeSignal || hasCloudflareChallengeSignal)
}

export const createIqnextSynconextScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('IQnext (Synconext) verified official homepage no longer matches the known public surface')
    }

    const careersPage = await fetchPage(CAREERS_URL)

    if (careersPage.status !== 200 || !hasOfficialCareersSignal(careersPage.html)) {
      throw new Error('IQnext (Synconext) verified careers page no longer matches the known public surface')
    }

    const wellfoundJobsUrl = extractWellfoundJobsUrl(careersPage.html)
    if (wellfoundJobsUrl !== WELLFOUND_JOBS_URL) {
      throw new Error('IQnext (Synconext) careers page no longer exposes the verified Wellfound jobs handoff')
    }

    const wellfoundBoard = await fetchPage(WELLFOUND_JOBS_URL)
    if (!isVerifiedWellfoundChallenge(wellfoundBoard)) {
      throw new Error('IQnext (Synconext) Wellfound jobs board no longer matches the verified challenge-gated public surface')
    }

    return []
  },
})

export const run = async (options = {}) => createIqnextSynconextScraper().run(options)

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
