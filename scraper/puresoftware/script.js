import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'puresoftware'
export const COMPANY = 'PureSoftware'
export const OFFICIAL_BRAND = 'PureSoftware'
export const CAREERS_URL = 'https://puresoftware.com/'
export const MOVED_URL = 'https://www.puresoftware.com/'
export const HANDOFF_URL = 'https://www.happiestminds.com/'
export const HAPPIEST_MINDS_CAREERS_URL = 'https://careers.happiestminds.com/'
export const DISPOSITION = 'verified-first-party-happiestminds-handoff-no-public-careers'
export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, August 15, 2026 that https://puresoftware.com/ still maps to Happiest Minds\' shared web presence, but the fetch path from this environment now commonly sees a 307 JavaScript challenge page before browser-grade redirection continues to https://www.happiestminds.com/. Browser verification still resolves the domain to the Happiest Minds homepage, which exposes careers.happiestminds.com as the live careers handoff. PureSoftware no longer exposes an exact-company public jobs inventory on its own domain, so this provider returns [] while the separate happiestminds scraper owns the actual shared careers surface. Historical fallback acceptance remains in place for the older "We\'ve Moved" page and the legacy Sucuri placeholder if they reappear.'

const MOVED_TITLE_PATTERN =
  /<title[^>]*>\s*We(?:'|\u2019|&#8217;|&rsquo;)ve Moved\s*<\/title>/i
const HAPPIEST_MINDS_TITLE_PATTERN =
  /<title[^>]*>\s*Happiest Minds\s*\|\s*AI First Customer-Centric Digital Engineering and Mindful IT Company\s*<\/title>/i
const META_REFRESH_PATTERN =
  /<meta\b[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=https:\/\/www\.happiestminds\.com\/["'][^>]*>/i
const SCRIPT_REDIRECT_PATTERN =
  /window\.location\.href\s*=\s*["']https:\/\/www\.happiestminds\.com\/["']/i
const REDIRECT_COPY_PATTERN = /\bRedirecting you in\b/i
const HAPPIEST_MINDS_CAREERS_LINK_PATTERN = /https:\/\/careers\.happiestminds\.com\/?/i
const VERIFIED_PLACEHOLDER_TEXT = 'TEST DIMPLE'
const JAVASCRIPT_CHALLENGE_TITLE_PATTERN = /<title[^>]*>\s*You are being redirected\.\.\.\s*<\/title>/i
const JAVASCRIPT_CHALLENGE_COPY_PATTERN = /\bJavascript is required\.\s*Please enable javascript before you are allowed to see this page\./i

const normalizeText = (value = '') =>
  String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()

const normalizePageUrl = (value = '') => {
  const normalized = String(value).trim().replace(/\/+$/, '')
  return normalized ? `${normalized}/` : ''
}

const resolvePageUrl = (page = {}, fallbackUrl) => page?.url || page?.finalUrl || fallbackUrl

const normalizeHeaderMap = (headers = {}) =>
  Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [String(key).toLowerCase(), String(value)]),
  )

const isKnownPlaceholderUrl = (value = '') => {
  const finalUrl = normalizePageUrl(value)
  return finalUrl === CAREERS_URL || finalUrl === MOVED_URL
}

export const isVerifiedMovedPage = (page = {}, requestedUrl = CAREERS_URL) => {
  const rawHtml = String(page?.html ?? '')
  const text = normalizeText(rawHtml)
  const finalUrl = normalizePageUrl(resolvePageUrl(page, requestedUrl))

  return Number(page?.status) === 200
    && finalUrl === MOVED_URL
    && MOVED_TITLE_PATTERN.test(rawHtml)
    && META_REFRESH_PATTERN.test(rawHtml)
    && SCRIPT_REDIRECT_PATTERN.test(rawHtml)
    && REDIRECT_COPY_PATTERN.test(text)
}

export const isVerifiedPlaceholderPage = (page = {}, requestedUrl = CAREERS_URL) => {
  const text = normalizeText(page?.html ?? '')
  const finalUrl = normalizePageUrl(resolvePageUrl(page, requestedUrl))
  const headers = normalizeHeaderMap(page?.headers)
  const server = headers.server ?? ''
  const contentType = headers['content-type'] ?? ''

  return Number(page?.status) === 200
    && isKnownPlaceholderUrl(finalUrl)
    && text === VERIFIED_PLACEHOLDER_TEXT
    && /Sucuri\/Cloudproxy/i.test(server)
    && /text\/html/i.test(contentType)
}

export const isVerifiedHappiestMindsHomepageHandoffPage = (page = {}, requestedUrl = CAREERS_URL) => {
  const rawHtml = String(page?.html ?? '')
  const text = normalizeText(rawHtml)
  const finalUrl = normalizePageUrl(resolvePageUrl(page, requestedUrl))

  return Number(page?.status) === 200
    && finalUrl === HANDOFF_URL
    && HAPPIEST_MINDS_TITLE_PATTERN.test(rawHtml)
    && /Experience The Culture Of Happiness At Happiest Minds/i.test(text)
    && /\bJOIN US\b/i.test(text)
    && HAPPIEST_MINDS_CAREERS_LINK_PATTERN.test(rawHtml)
}

export const isVerifiedJavascriptChallengePage = (page = {}, requestedUrl = CAREERS_URL) => {
  const rawHtml = String(page?.html ?? '')
  const text = normalizeText(rawHtml)
  const finalUrl = normalizePageUrl(resolvePageUrl(page, requestedUrl))

  return Number(page?.status) === 307
    && finalUrl === normalizePageUrl(requestedUrl)
    && JAVASCRIPT_CHALLENGE_TITLE_PATTERN.test(rawHtml)
    && JAVASCRIPT_CHALLENGE_COPY_PATTERN.test(text)
}

export const isVerifiedKnownNoJobsSurface = (page = {}, requestedUrl = CAREERS_URL) =>
  isVerifiedHappiestMindsHomepageHandoffPage(page, requestedUrl)
  || isVerifiedJavascriptChallengePage(page, requestedUrl)
  || isVerifiedMovedPage(page, requestedUrl)
  || isVerifiedPlaceholderPage(page, requestedUrl)

const assertVerifiedKnownNoJobsSurface = (page = {}, requestedUrl = CAREERS_URL) => {
  if (isVerifiedKnownNoJobsSurface(page, requestedUrl)) return

  throw new Error(
    'PureSoftware verified no-jobs first-party surface no longer matches the trusted Happiest Minds homepage handoff or historical fallback surfaces.',
  )
}

export const createPureSoftwareScraper = ({ careersUrl = CAREERS_URL } = {}) => ({
  async run({ fetchPage = defaultFetchPage, fetchHtml } = {}) {
    const getPage =
      typeof fetchHtml === 'function'
        ? async (url) => ({
            status: 200,
            url: MOVED_URL,
            html: await fetchHtml(url),
          })
        : fetchPage

    const landingPage = await getPage(careersUrl)
    assertVerifiedKnownNoJobsSurface(landingPage, careersUrl)
    return []
  },
})

export const run = async (options = {}) => createPureSoftwareScraper().run(options)

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (compatible; Jobverify/1.0)',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    headers: Object.fromEntries(response.headers),
    html: await response.text(),
  }
}

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
