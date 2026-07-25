import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { IXIGO_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = IXIGO_CATALOG.source
export const COMPANY = IXIGO_CATALOG.companyName
export const PROVIDER_METADATA = IXIGO_CATALOG
export const HOMEPAGE_URL = IXIGO_CATALOG.homepageUrl
export const LEGACY_CAREERS_URL = IXIGO_CATALOG.legacyCareersUrl
export const CURRENT_CAREERS_URL = IXIGO_CATALOG.currentCareersUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;|&#038;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;|&#8217;|&rsquo;/gi, "'")
  .replace(/&#8211;|&#8212;|&ndash;|&mdash;/gi, '-')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|section|article|a)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeComparableUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    url.hash = ''
    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, '')
    }
    return url.toString()
  } catch {
    return String(value ?? '')
  }
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const hasOfficialCareersSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml) || ''

  return /<title>\s*ixigo careers\s*<\/title>/i.test(rawHtml)
    && normalized.includes('Join our team of 250+ passionate folks')
    && normalized.includes('we are changing the way India travels.')
    && normalized.includes('Open roles')
}

export const hasVerifiedNoJobsSignal = (html = '') => {
  const normalized = normalizeWhitespace(html) || ''

  return normalized.includes('No Jobs Found')
    && normalized.includes('Could not find an open position that excites you ?')
    && normalized.includes('Apply for Another Position')
}

const verifyCurrentNoJobsPage = (page) => {
  if (page.status !== 200 || normalizeComparableUrl(page.url) !== normalizeComparableUrl(CURRENT_CAREERS_URL)) {
    throw new Error('ixigo legacy careers redirect no longer lands on the verified current careers page')
  }

  if (!hasOfficialCareersSignal(page.html)) {
    throw new Error('The official ixigo careers page no longer matches the verified first-party surface')
  }

  if (!hasVerifiedNoJobsSignal(page.html)) {
    throw new Error('The ixigo official careers page now exposes public jobs or no longer matches the verified no-jobs surface')
  }
}

export const createIxigoScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const legacyCareersPage = await fetchPage(LEGACY_CAREERS_URL)
    verifyCurrentNoJobsPage(legacyCareersPage)

    const currentCareersPage = await fetchPage(CURRENT_CAREERS_URL)
    verifyCurrentNoJobsPage(currentCareersPage)

    return []
  },
})

export const run = async (options = {}) => createIxigoScraper().run(options)

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
