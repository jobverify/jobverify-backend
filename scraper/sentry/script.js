import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import SENTRY_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const SOURCE = SENTRY_CATALOG.source
export const COMPANY = SENTRY_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = SENTRY_CATALOG.officialBrandName
export const VERIFIED_ON = SENTRY_CATALOG.verifiedOn
export const PROVIDER_METADATA = SENTRY_CATALOG
export const CAREERS_PAGE_URL = SENTRY_CATALOG.companyCareerPage

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&#038;|&amp;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
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

export const hasVerifiedCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)?.toLowerCase() || ''

  return /<title>\s*careers\s*\|\s*sentry\s*<\/title>/i.test(page)
    && normalized.includes('work at sentry')
    && normalized.includes('browse our openings')
    && normalized.includes('open positions across')
    && normalized.includes('all offices')
    && normalized.includes('all teams')
    && /id=["']openings-list["']/i.test(page)
    && /href=["'][^"']*\/careers\/[0-9a-f-]{36}\/?["']/i.test(page)
}

export const extractRoleSummaries = (html = '') => {
  const roles = []

  for (const match of String(html ?? '').matchAll(
    /<a[^>]*href=["']([^"']*\/careers\/[0-9a-f-]{36}\/?)["'][^>]*class=["'][^"']*_jobLink_[^"']*["'][^>]*>[\s\S]*?<span[^>]*class=["'][^"']*_jobTitle_[^"']*["'][^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class=["'][^"']*_jobLocation_[^"']*["'][^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/a>/gi,
  )) {
    const url = toAbsoluteUrl(match[1])
    const title = normalizeWhitespace(match[2])
    const location = normalizeWhitespace(match[3])

    if (!url || !title || !location) continue

    roles.push({
      title,
      location,
      label: `${title} ${location}`,
      url,
    })
  }

  return [...new Map(roles.map((role) => [role.url, role])).values()]
}

const hasIndiaRole = (roles = []) =>
  roles.some((role) => /\bindia\b/i.test(String(role.label ?? '')))

const allRolesStayOnFirstPartyDomain = (roles = []) =>
  roles.every((role) => {
    try {
      return new URL(role.url).hostname === 'sentry.io'
    } catch {
      return false
    }
  })

export const createSentryScraper = () => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_PAGE_URL)

    if (!hasVerifiedCareersPageSignal(careersHtml)) {
      throw new Error('Verified Sentry careers page changed materially')
    }

    const roles = extractRoleSummaries(careersHtml)
    if (roles.length === 0) {
      throw new Error('Verified Sentry role listing changed materially')
    }

    if (!allRolesStayOnFirstPartyDomain(roles)) {
      throw new Error('Verified Sentry same-domain role-link contract changed materially')
    }

    if (hasIndiaRole(roles)) {
      throw new Error('Verified Sentry India slice changed materially')
    }

    return []
  },
})

export const run = async (options = {}) => createSentryScraper(options).run(options)

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
