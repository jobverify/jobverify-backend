import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'kodnest'
export const COMPANY = 'KodNest'
export const HOMEPAGE_URL = 'https://www.kodnest.com/'
export const CAREERS_ROUTE_URLS = [
  'https://www.kodnest.com/careers',
  'https://www.kodnest.com/careers/',
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
  /\bjoin our team\b/i,
  /\bvacanc(?:y|ies)\b/i,
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /zohorecruit/i,
]

const BUNDLE_REQUIRED_PATTERNS = [
  /\bKodNest\b/i,
  /from\s*:\s*["']\/careers["']\s*,\s*action\s*:\s*["']410["']\s*,\s*note\s*:\s*["']P0:\s*no careers page yet["']/i,
  /from\s*:\s*["']\/privacy-policy["']\s*,\s*to\s*:\s*["']\/legal\/privacy["']\s*,\s*action\s*:\s*["']301["']/i,
]

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

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/javascript,text/javascript,text/plain;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const extractBundleAssetPath = (html) => {
  const match = String(html ?? '').match(
    /<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']*\/assets\/index-[^"']+\.js)["']/i,
  )

  return match?.[1] ?? null
}

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')

  return /<title>\s*KodNest[^<]*Placement-ready engineering training\s*<\/title>/i.test(rawHtml)
    && /<meta[^>]+name=["']description["'][^>]+content=["']KodNest helps freshers become placement-ready with hands-on Java, Python, Data Science (?:&amp;|&) GenAI tracks, real projects, and outcome-driven coaching\.["']/i.test(rawHtml)
    && /<meta[^>]+name=["']author["'][^>]+content=["']KodNest["']/i.test(rawHtml)
    && /<meta[^>]+property=["']og:url["'][^>]+content=["']https:\/\/kodnest\.com["']/i.test(rawHtml)
    && /<meta[^>]+name=["']twitter:site["'][^>]+content=["']@KodNest["']/i.test(rawHtml)
    && /https:\/\/connect\.facebook\.net\/en_US\/fbevents\.js/i.test(rawHtml)
    && /<div id=["']root["']><\/div>/i.test(rawHtml)
    && extractBundleAssetPath(rawHtml) !== null
}

export const hasPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasVerifiedBundleSignal = (bundleText) =>
  BUNDLE_REQUIRED_PATTERNS.every((pattern) => pattern.test(String(bundleText ?? '')))

export const routeMatchesVerifiedShell = (html, bundlePath) =>
  hasOfficialHomepageSignal(html)
  && extractBundleAssetPath(html) === bundlePath
  && !hasPublicJobsSignal(html)

export const createKodNestScraper = () => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchText = defaultFetchText,
  } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('KodNest verified official homepage no longer matches the known public surface')
    }

    if (hasPublicJobsSignal(homepage.html)) {
      throw new Error('KodNest homepage now appears to expose a public jobs surface')
    }

    const bundleAssetPath = extractBundleAssetPath(homepage.html)
    if (!bundleAssetPath) {
      throw new Error('KodNest homepage no longer exposes the verified client bundle')
    }

    const bundleUrl = new URL(bundleAssetPath, HOMEPAGE_URL).toString()
    const bundleText = await fetchText(bundleUrl)
    if (!hasVerifiedBundleSignal(bundleText)) {
      throw new Error('KodNest client bundle changed materially or no longer confirms the verified no-careers route contract')
    }

    for (const careersRouteUrl of CAREERS_ROUTE_URLS) {
      const careersRoute = await fetchPage(careersRouteUrl)

      if (careersRoute.status !== 200 || !routeMatchesVerifiedShell(careersRoute.html, bundleAssetPath)) {
        throw new Error('KodNest careers routes changed materially or now expose public jobs')
      }
    }

    return []
  },
})

export const run = async (options = {}) => createKodNestScraper().run(options)

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
