import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'nousinfosystems'
export const COMPANY = 'Nous Infosystems'
export const LEGACY_HOMEPAGE_URL = 'https://www.nousinfosystems.com/'
export const HOMEPAGE_REDIRECT_URL = 'https://www.artizent.com/'
export const CAREERS_URL = 'https://www.artizent.com/insights/careers'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bjob openings\b/i,
  /\bsearch jobs\b/i,
  /\bjob search\b/i,
  /\bapply now\b/i,
  /\bvacanc(?:y|ies)\b/i,
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

const BUNDLE_REQUIRED_PATTERNS = [
  /"\/insights\/careers":\{title:"Careers \| Artizent",description:"Join a team of builders working on mission critical AI and platform engineering for global enterprises\. Explore open roles and life at Artizent\."\}/i,
  /path:"\/insights\/careers",component:\$W/i,
  /children:"Careers"/i,
  /Curiosity at/i,
  /Full Throttle\./i,
  /Why Artizent\?/i,
  /\bWe hire\b/i,
  /builders,\s*engineers,\s*craftspeople,\s*artists,\s*thinkers,\s*operators,\s*owners,\s*and finishers\./i,
  /href:"\/contact"/i,
  /Find your next build/i,
]

const normalizeComparableUrl = (value) => {
  const input = String(value ?? '').trim()
  if (!input) return ''

  try {
    const url = new URL(input)
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return input.replace(/\/$/, '')
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

  return /<title>\s*Artizent \(formerly known as Nous Infosystems\) \| The Engineering Partner for Mission Critical AI\s*<\/title>/i.test(rawHtml)
    && /<meta[^>]+name=["']description["'][^>]+content=["']Artizent builds, modernizes, and operates production grade AI systems for enterprises where scale is massive, money is real, and outcomes matter\.["']/i.test(rawHtml)
    && /<meta[^>]+property=["']og:site_name["'][^>]+content=["']Artizent["']/i.test(rawHtml)
    && /<meta[^>]+name=["']twitter:title["'][^>]+content=["']Artizent \(formerly known as Nous Infosystems\) \| The Engineering Partner for Mission Critical AI["']/i.test(rawHtml)
    && /<script src=["']\/runtime-config\.js["']><\/script>/i.test(rawHtml)
    && /<div id=["']root["']><\/div>/i.test(rawHtml)
    && extractBundleAssetPath(rawHtml) !== null
}

export const hasPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasVerifiedBundleSignal = (bundleText) =>
  BUNDLE_REQUIRED_PATTERNS.every((pattern) => pattern.test(String(bundleText ?? '')))
  && !hasPublicJobsSignal(bundleText)

export const isVerifiedHomepageRedirect = (page = {}) =>
  Number(page?.status) === 200
  && normalizeComparableUrl(page?.url) === normalizeComparableUrl(HOMEPAGE_REDIRECT_URL)
  && hasOfficialHomepageSignal(page?.html)
  && !hasPublicJobsSignal(page?.html)

export const routeMatchesVerifiedShell = (html, bundlePath) =>
  hasOfficialHomepageSignal(html)
  && extractBundleAssetPath(html) === bundlePath
  && !hasPublicJobsSignal(html)

export const createNousInfosystemsScraper = () => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchText = defaultFetchText,
  } = {}) {
    const homepage = await fetchPage(LEGACY_HOMEPAGE_URL)

    if (!isVerifiedHomepageRedirect(homepage)) {
      throw new Error('Nous Infosystems legacy homepage redirect no longer matches the verified first-party surface')
    }

    const bundleAssetPath = extractBundleAssetPath(homepage.html)
    if (!bundleAssetPath) {
      throw new Error('Nous Infosystems redirected homepage no longer exposes the verified client bundle')
    }

    const careersRoute = await fetchPage(CAREERS_URL)
    if (
      careersRoute.status !== 200
      || normalizeComparableUrl(careersRoute.url) !== normalizeComparableUrl(CAREERS_URL)
      || !routeMatchesVerifiedShell(careersRoute.html, bundleAssetPath)
    ) {
      throw new Error('Nous Infosystems Artizent careers route changed materially or now exposes public jobs')
    }

    const bundleUrl = new URL(bundleAssetPath, HOMEPAGE_REDIRECT_URL).toString()
    const bundleText = await fetchText(bundleUrl)
    if (!hasVerifiedBundleSignal(bundleText)) {
      throw new Error('Nous Infosystems client bundle changed materially or no longer confirms the verified contact-only careers contract')
    }

    return []
  },
})

export const run = async (options = {}) => createNousInfosystemsScraper().run(options)

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
