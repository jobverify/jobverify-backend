import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SHAZAM_NO_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const REQUEST_TIMEOUT_MS = 15000

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const APPLE_CAREERS_SEARCH_URL = PROVIDER_METADATA.appleCareersSearchUrl

const stripTags = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')

const normalizeWhitespace = (value) => stripTags(value)
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchPage = async (url) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    })

    clearTimeout(timeout)

    return {
      status: response.status,
      url: response.url,
      html: await response.text(),
    }
  } finally {
    clearTimeout(timeout)
  }
}

export const containsLiteralBacklogRow = (html = '') =>
  normalizeWhitespace(html).toLowerCase().includes('shazam? no')

export const extractAppleCareersSearchUrl = (html = '') => {
  const match = String(html ?? '').match(/https:\/\/jobs\.apple\.com\/en-us\/search\?product=apple-music-APPMU/i)
  return match ? match[0] : null
}

export const hasVerifiedShazamBrandPageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Shazam - Music Discovery, Charts & Song Lyrics\s*<\/title>/i.test(page)
    && text.includes('Find music, concerts and more with Shazam')
    && text.includes('Shazam Footer')
    && text.includes('Careers')
    && text.includes('Apple Inc. and its affiliates')
}

export const hasVerifiedAppleCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Search Jobs - Apple Music - Jobs - Careers at Apple\s*<\/title>/i.test(page)
    && text.includes('Find your perfect role.')
    && text.includes('QA Lead - Shazam (12 Month Contract)')
    && text.includes('tech hub of the Shazam team')
}

export const createShazamNoScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const shazamPage = await fetchPage(HOMEPAGE_URL)

    if (containsLiteralBacklogRow(shazamPage?.html)) {
      throw new Error('Shazam? no exact-row literal now appears on a first-party surface and must be re-evaluated')
    }

    if (shazamPage?.status !== 200 || !hasVerifiedShazamBrandPageSignal(shazamPage?.html)) {
      throw new Error('Shazam? no verified Shazam brand page no longer matches the trusted noisy-row evidence')
    }

    if (extractAppleCareersSearchUrl(shazamPage?.html) !== APPLE_CAREERS_SEARCH_URL) {
      throw new Error('Shazam? no verified Apple careers handoff changed materially')
    }

    const appleCareersPage = await fetchPage(APPLE_CAREERS_SEARCH_URL)

    if (appleCareersPage?.status !== 200 || !hasVerifiedAppleCareersSignal(appleCareersPage?.html)) {
      throw new Error('Shazam? no verified Apple careers surface no longer matches the trusted first-party evidence')
    }

    return []
  },
})

export const run = async (options = {}) => createShazamNoScraper().run(options)

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
