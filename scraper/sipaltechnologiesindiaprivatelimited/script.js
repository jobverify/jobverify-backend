import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'sipaltechnologiesindiaprivatelimited'
export const COMPANY = 'SIPAL Technologies India Private Limited'
export const HOMEPAGE_URL = 'https://sipal.it/'
export const NO_TRUST_PUBLIC_JOB_ROUTE_URLS = [
  'https://sipal.it/sipal-india-en/',
  'https://sipal.it/sipal-india/',
  'https://sipal.it/careers/',
  'https://sipal.it/jobs/',
  'https://sipal.it/lavora-con-noi/',
  'https://sipal.it/en/careers/',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#8211;|&ndash;/gi, '-')
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

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
    signal: createTimeoutSignal(15000),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const pageShowsPublicJobs = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /JobPosting/i.test(page)
    || /\b(current openings|open positions?|job openings|apply now|vacanc(?:y|ies))\b/i.test(normalized)
}

export const hasOfficialHomepageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title[^>]*>[^<]*\bSipal\b/i.test(page)
    && /\bSIPAL\b/i.test(normalized)
    && /\b(Secure Environments|System Integration|Advanced Manufacturing|Space|Capabilities)\b/i.test(normalized)
    && !pageShowsPublicJobs(page)
}

const hasVerifiedLavoraConNoiInfoSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title[^>]*>[^<]*Lavora con noi/i.test(page)
    && normalized.includes('Lavora con noi')
    && normalized.includes('contact@sipal.it')
    && normalized.includes('Corso Vittorio Emanuele II')
    && !pageShowsPublicJobs(page)
}

export const isVerifiedNoTrustPublicJobRoute = (page = {}) =>
  (
    Number(page.status) === 404
    && !pageShowsPublicJobs(page.html)
  ) || (
    Number(page.status) === 200
    && hasVerifiedLavoraConNoiInfoSignal(page.html)
  )

export const createSipalTechnologiesIndiaPrivateLimitedScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (
      homepage.status !== 200
      || !hasOfficialHomepageSignal(homepage.html)
      || pageShowsPublicJobs(homepage.html)
    ) {
      throw new Error('SIPAL official homepage no longer matches the verified no-public-jobs surface')
    }

    for (const routeUrl of NO_TRUST_PUBLIC_JOB_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)

      if (pageShowsPublicJobs(routePage.html)) {
        throw new Error('SIPAL public jobs surface emerged; sentinel must be replaced')
      }

      if (!isVerifiedNoTrustPublicJobRoute(routePage)) {
        throw new Error(`SIPAL verified no-trust public job route changed: ${routePage.url || routeUrl}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createSipalTechnologiesIndiaPrivateLimitedScraper().run(options)

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
