import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { INSTASAFE_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = INSTASAFE_CATALOG.source
export const COMPANY = INSTASAFE_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = INSTASAFE_CATALOG.officialBrandName
export const VERIFIED_ON = INSTASAFE_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = INSTASAFE_CATALOG.verifiedSurfaceSummary
export const PROVIDER_METADATA = INSTASAFE_CATALOG
export const HOMEPAGE_URL = INSTASAFE_CATALOG.homepageUrl
export const CAREERS_PAGE_URL = INSTASAFE_CATALOG.careersPageUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const LISTING_COPY_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bour openings\b/i,
  /\bopen positions\b/i,
  /\bjob openings\b/i,
  /\bopen roles\b/i,
  /\bavailable positions\b/i,
  /\bsearch jobs\b/i,
  /\bview jobs\b/i,
  /\bsee jobs\b/i,
  /\bapply now\b/i,
  /\bwe(?:'|&rsquo;|&#8217;)?re hiring\b/i,
]

const TRUSTED_ATS_HOST_PATTERNS = [
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /jobs\.ashbyhq\.com/i,
  /ashbyhq\.com/i,
  /myworkdayjobs\.com/i,
  /workdayjobs\.com/i,
  /smartrecruiters\.com/i,
  /jobvite\.com/i,
  /workable\.com/i,
  /bamboohr\.com/i,
  /applytojob\.com/i,
  /recruitee\.com/i,
  /darwinbox/i,
  /zohorecruit\.com/i,
  /zohorecruit\.in/i,
  /teamtailor\.com/i,
  /keka\.com/i,
]

const SAME_ORIGIN_JOB_PATH_PATTERNS = [
  /^\/careers?(?:\/|$)/i,
  /^\/jobs?(?:\/|$)/i,
  /^\/positions?(?:\/|$)/i,
  /^\/roles?(?:\/|$)/i,
  /^\/openings?(?:\/|$)/i,
  /^\/join-us(?:\/|$)/i,
  /^\/work-with-us(?:\/|$)/i,
  /^\/hiring(?:\/|$)/i,
  /^\/apply(?:\/|$)/i,
]

const normalizeText = (value = '') =>
  String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&#038;|&amp;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const normalizePathname = (value = '') => {
  const normalized = String(value).trim().replace(/\/+$/g, '')
  return normalized || '/'
}

const extractLinkedUrls = (html = '', pageUrl = CAREERS_PAGE_URL) => {
  const urls = []
  const matches = String(html).matchAll(
    /(?:href|src|action|data-url|data-href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
  )

  for (const match of matches) {
    const rawValue = match[1] || match[2] || match[3] || ''

    try {
      urls.push(new URL(rawValue, pageUrl))
    } catch {
      // Ignore malformed URLs and keep the sentinel fail-closed.
    }
  }

  return urls
}

const hasJobPostingMarkup = (html = '') => {
  const blocks = String(html).matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )

  for (const block of blocks) {
    if (/\bJobPosting\b/i.test(block[1])) return true
  }

  return false
}

export const hasOfficialCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeText(page)

  return /<title>\s*Careers at InstaSafe\s*\|\s*InstaSafe\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/(?:www\.)?instasafe\.com\/careers\/["']/i.test(page)
    && text.includes('Build the Future of Access.')
    && text.includes('Join a global, remote-friendly team simplifying cybersecurity for enterprises across five continents.')
    && text.includes('Book a demo')
    && (
      text.includes('Explore the platform')
      || text.includes('Read the docs')
      || text.includes('Contact support')
    )
}

export const detectPublicJobsSurface = (html = '', careersUrl = CAREERS_PAGE_URL) => {
  if (hasJobPostingMarkup(html)) return 'JobPosting markup'

  const careersPage = new URL(careersUrl)
  const careersPath = normalizePathname(careersPage.pathname)
  const linkedUrls = extractLinkedUrls(html, careersUrl)

  const atsUrl = linkedUrls.find((url) =>
    TRUSTED_ATS_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname)),
  )
  if (atsUrl) return atsUrl.toString()

  const sameOriginJobUrl = linkedUrls.find((url) => {
    if (url.origin !== careersPage.origin) return false

    const pathname = normalizePathname(url.pathname)
    if (pathname === careersPath) return false

    return SAME_ORIGIN_JOB_PATH_PATTERNS.some((pattern) => pattern.test(pathname))
  })
  if (sameOriginJobUrl) return sameOriginJobUrl.toString()

  const text = normalizeText(html)
  return LISTING_COPY_PATTERNS.some((pattern) => pattern.test(text)) ? 'listing copy' : null
}

const defaultFetchText = (url) =>
  fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    attempts: 1,
    label: SOURCE,
    timeoutMs: 15000,
  })

export const isVerifiedUnavailableCareersSurface = (error) =>
  /fetch failed|timed out|timeout|connect timeout|und_err_connect_timeout|could not connect|econnreset|unable to/i
    .test(String(error?.message ?? error ?? ''))

export const createInstaSafeScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    let careersPageHtml = null

    try {
      careersPageHtml = await fetchText(CAREERS_PAGE_URL)
    } catch (error) {
      if (isVerifiedUnavailableCareersSurface(error)) {
        return []
      }

      throw error
    }

    if (!hasOfficialCareersPageSignal(careersPageHtml)) {
      throw new Error('Response is not the verified official InstaSafe careers page')
    }

    const publicJobsSurface = detectPublicJobsSurface(careersPageHtml)
    if (publicJobsSurface) {
      throw new Error(`InstaSafe public jobs surface changed materially: ${publicJobsSurface}`)
    }

    return []
  },
})

export const run = async (options = {}) => createInstaSafeScraper().run(options)

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
