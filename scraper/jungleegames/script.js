import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { JUNGLEE_GAMES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = JUNGLEE_GAMES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const GROW_PAGE_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_EMPTY_DEPARTMENT_URL = PROVIDER_METADATA.verifiedEmptyDepartmentPageUrl
export const COMPANY_DOMAIN = PROVIDER_METADATA.companyDomain
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOB_PATTERNS = [
  /\bapply now\b/i,
  /\blocation:\s*[a-z]/i,
  /\byou(?:'|’)re applying!?/i,
]

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;|&rsquo;|&#8217;/gi, "'")
  .replace(/&#8211;|&#8212;|&ndash;|&mdash;/gi, '-')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) =>
  decodeHtmlEntities(String(value ?? ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const toAbsoluteUrl = (value, baseUrl = HOMEPAGE_URL) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const defaultFetchText = async (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const extractGrowPageUrl = (html) => {
  for (const match of String(html ?? '').matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = toAbsoluteUrl(match[1], HOMEPAGE_URL)
    const text = normalizeWhitespace(match[2])?.toLowerCase() || ''

    if (href === GROW_PAGE_URL) return href
    if (text === 'view all jobs') return GROW_PAGE_URL
  }

  return null
}

export const hasVerifiedHomepageSignals = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /junglee games/i.test(page)
    && normalized.includes('Play To Grow')
    && normalized.includes('Join Our Team')
    && normalized.includes('Junglee Games India Private Limited')
    && extractGrowPageUrl(page) === GROW_PAGE_URL
}

export const hasVerifiedGrowPageSignals = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /our existing openings to join \| jungleegames\.com/i.test(page)
    && normalized.includes('In What Field Would You Like to Grow?')
    && normalized.includes('Browse every open role and find the best fit for your journey.')
    && normalized.includes('View all jobs')
    && normalized.includes('GPTW Certified')
}

export const hasVerifiedEmptyDepartmentSignals = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /our existing openings to join \| jungleegames\.com/i.test(page)
    && normalized.includes('No Open Roles In This Department')
    && normalized.includes('View All Other Open Roles')
    && normalized.includes('All Jobs')
}

export const hasPublicJobSignals = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return PUBLIC_JOB_PATTERNS.some((pattern) => pattern.test(page) || pattern.test(normalized))
}

export const createJungleeGamesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasVerifiedHomepageSignals(homepageHtml)) {
      throw new Error('Junglee Games verified homepage no longer matches the known first-party surface')
    }
    if (hasPublicJobSignals(homepageHtml)) {
      throw new Error('Junglee Games homepage now appears to expose a public jobs surface')
    }

    const growPageHtml = await fetchText(GROW_PAGE_URL)
    if (!hasVerifiedGrowPageSignals(growPageHtml)) {
      throw new Error('Junglee Games verified grow page no longer matches the known first-party surface')
    }
    if (hasPublicJobSignals(growPageHtml)) {
      throw new Error('Junglee Games grow page now appears to expose a public jobs surface')
    }

    const emptyDepartmentHtml = await fetchText(VERIFIED_EMPTY_DEPARTMENT_URL)
    if (hasPublicJobSignals(emptyDepartmentHtml)) {
      throw new Error('Junglee Games verified empty department page now appears to expose a public jobs surface')
    }
    if (!hasVerifiedEmptyDepartmentSignals(emptyDepartmentHtml)) {
      throw new Error(
        'Junglee Games verified empty department page no longer matches the known first-party surface',
      )
    }

    return []
  },
})

export const run = async (options = {}) => createJungleeGamesScraper().run(options)

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
