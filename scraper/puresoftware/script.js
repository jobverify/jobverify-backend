import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'puresoftware'
export const COMPANY = 'PureSoftware'
export const OFFICIAL_BRAND = 'PureSoftware'
export const CAREERS_URL = 'https://puresoftware.com/'
export const MOVED_URL = 'https://www.puresoftware.com/'
export const HANDOFF_URL = 'https://www.happiestminds.com/'
export const DISPOSITION = 'verified-first-party-placeholder-no-public-careers'
export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Tuesday, August 4, 2026 that runtime fetches to both https://puresoftware.com/ and https://www.puresoftware.com/ returned a Sucuri/Cloudproxy-served placeholder body of "TEST DIMPLE" instead of a trustworthy PureSoftware public jobs surface. The older static "We\'ve Moved" Happiest Minds handoff may still appear in other caches, but neither verified surface exposes an exact-company public jobs inventory for PureSoftware.'

const MOVED_TITLE_PATTERN =
  /<title[^>]*>\s*We(?:'|\u2019|&#8217;|&rsquo;)ve Moved\s*<\/title>/i
const META_REFRESH_PATTERN =
  /<meta\b[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=https:\/\/www\.happiestminds\.com\/["'][^>]*>/i
const SCRIPT_REDIRECT_PATTERN =
  /window\.location\.href\s*=\s*["']https:\/\/www\.happiestminds\.com\/["']/i
const REDIRECT_COPY_PATTERN = /\bRedirecting you in\b/i
const VERIFIED_PLACEHOLDER_TEXT = 'TEST DIMPLE'

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

export const isVerifiedKnownNoJobsSurface = (page = {}, requestedUrl = CAREERS_URL) =>
  isVerifiedMovedPage(page, requestedUrl) || isVerifiedPlaceholderPage(page, requestedUrl)

const assertVerifiedKnownNoJobsSurface = (page = {}, requestedUrl = CAREERS_URL) => {
  if (isVerifiedKnownNoJobsSurface(page, requestedUrl)) return

  throw new Error(
    'PureSoftware verified no-jobs first-party surface no longer matches the trusted placeholder or historical Happiest Minds handoff.',
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
      'User-Agent': 'Mozilla/5.0 (compatible; Jobify/1.0)',
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
