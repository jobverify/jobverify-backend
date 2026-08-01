import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'namaahpvtltd'
export const COMPANY = 'Namaah Pvt Ltd'
export const VERIFIED_ON = '2026-07-13'
export const VERIFIED_SURFACE_SUMMARY =
  'The verified first-party public surface on July 13, 2026 was https://namaah.co.in/, a Namaah baby-names product homepage with no public jobs board, while common careers and jobs routes returned 404.'
export const HOMEPAGE_URL = 'https://namaah.co.in/'
export const NO_PUBLIC_JOB_ROUTE_URLS = [
  'https://namaah.co.in/careers',
  'https://namaah.co.in/careers/',
  'https://namaah.co.in/jobs',
  'https://namaah.co.in/jobs/',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bjob openings\b/i,
  /\bsearch jobs\b/i,
  /\bview jobs\b/i,
  /\bapply now\b/i,
  /\bjob description\b/i,
  /\bvacanc(?:y|ies)\b/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /bamboohr/i,
  /recruitcrm/i,
  /linkedin\.com\/jobs/i,
]

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const isFirstPartyUrl = (value) => {
  try {
    const hostname = new URL(value || HOMEPAGE_URL).hostname.toLowerCase()
    return hostname === 'namaah.co.in' || hostname === 'www.namaah.co.in'
  } catch {
    return false
  }
}

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
    redirect: 'follow',
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

export const hasPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Namaah\s*[—-]\s*600,000\+\s*Sacred Baby Names by Religion, Meaning & Origin\s*<\/title>/i.test(page)
    && /<meta[^>]+name=["']description["'][^>]+Discover 600,000\+ authentic baby names from 11 world religions/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/namaah\.co\.in\/["']/i.test(page)
    && /<meta[^>]+property=["']og:site_name["'][^>]+content=["']Namaah["']/i.test(page)
    && /<meta[^>]+name=["']twitter:site["'][^>]+content=["']@namaah_coin["']/i.test(page)
    && page.includes('Namaah Baby Name Finder')
    && page.includes('LifestyleApplication')
    && normalized.includes('600,000+ authentic baby names from 11 world religions and mythologies')
    && normalized.includes('Find the perfect baby name from Hindu, Muslim, Christian, Jewish, Greek, Norse, Egyptian, Celtic & more traditions. 600k+ names, free.')
  }

export const isVerifiedNoJobsRoute = (page = {}) =>
  Number(page?.status) === 404 && !hasPublicJobsSignal(page?.html)

export const createNamaahScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !isFirstPartyUrl(homepage.url) || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Namaah Pvt Ltd homepage no longer matches the verified first-party no-public-jobs surface')
    }
    if (hasPublicJobsSignal(homepage.html)) {
      throw new Error('Namaah Pvt Ltd homepage now appears to expose public jobs')
    }

    for (const routeUrl of NO_PUBLIC_JOB_ROUTE_URLS) {
      const page = await fetchPage(routeUrl)
      if (!isFirstPartyUrl(page.url || routeUrl) || !isVerifiedNoJobsRoute(page)) {
        throw new Error(`Namaah Pvt Ltd careers-free route changed or now exposes public jobs: ${page.url || routeUrl}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createNamaahScraper().run(options)

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
