import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import LINEAR_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const SOURCE = LINEAR_CATALOG.source
export const COMPANY = LINEAR_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = LINEAR_CATALOG.officialBrandName
export const VERIFIED_ON = LINEAR_CATALOG.verifiedOn
export const PROVIDER_METADATA = LINEAR_CATALOG
export const CAREERS_PAGE_URL = LINEAR_CATALOG.companyCareerPage

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&#038;|&amp;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const toAbsoluteUrl = (value) => {
  try {
    return new URL(value, CAREERS_PAGE_URL).toString()
  } catch {
    return null
  }
}

const extractSpanTexts = (html = '') =>
  [...String(html).matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)]
    .map((match) => normalizeWhitespace(match[1]))
    .filter(Boolean)

export const hasVerifiedCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)?.toLowerCase() || ''

  return /<title>\s*we(?:&rsquo;|&#8217;|&#x27;|')?re hiring\s+[–-]\s+linear\s*<\/title>/i.test(page)
    && normalized.includes('help us craft high-quality tools')
    && normalized.includes('open roles')
    && /href=["'][^"']*\/careers\/[^"'/][^"']*["']/i.test(page)
}

export const extractRoleSummaries = (html = '') => {
  const roles = []

  for (const match of String(html ?? '').matchAll(/<a[^>]*href=["']([^"']*\/careers\/[^"'/][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = toAbsoluteUrl(match[1])
    const spans = extractSpanTexts(match[2])
    const title = spans[0] || normalizeWhitespace(match[2])
    const location = spans[1] || null

    if (!url || !title) continue

    roles.push({ title, location, url })
  }

  return roles
}

const hasIndiaRole = (roles = []) =>
  roles.some((role) => /\bindia\b/i.test(String(role.location ?? '')))

const allRolesStayOnFirstPartyDomain = (roles = []) =>
  roles.every((role) => {
    try {
      return new URL(role.url).hostname === 'linear.app'
    } catch {
      return false
    }
  })

export const createLinearScraper = () => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_PAGE_URL)

    if (!hasVerifiedCareersPageSignal(careersHtml)) {
      throw new Error('Verified Linear careers page changed materially')
    }

    const roles = extractRoleSummaries(careersHtml)
    if (roles.length === 0) {
      throw new Error('Verified Linear role listing changed materially')
    }

    if (!allRolesStayOnFirstPartyDomain(roles)) {
      throw new Error('Verified Linear same-domain role-link contract changed materially')
    }

    if (hasIndiaRole(roles)) {
      throw new Error('Verified Linear India slice changed materially')
    }

    return []
  },
})

export const run = async (options = {}) => createLinearScraper(options).run(options)

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
