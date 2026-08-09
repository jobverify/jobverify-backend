import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import CIRCLECI_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const SOURCE = CIRCLECI_CATALOG.source
export const COMPANY = CIRCLECI_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = CIRCLECI_CATALOG.officialBrandName
export const VERIFIED_ON = CIRCLECI_CATALOG.verifiedOn
export const PROVIDER_METADATA = CIRCLECI_CATALOG
export const CAREERS_PAGE_URL = CIRCLECI_CATALOG.companyCareerPage

const ROLE_LOCATION_PATTERN =
  /\s+(Remote(?:,\s*[^<]+)?|London(?:,\s*[^<]+)?|Mexico City(?:,\s*[^<]+)?|San Francisco(?:,\s*[^<]+)?|Toronto(?:,\s*[^<]+)?|[A-Za-z .'-]+,\s*India|Ontario,\s*Canada|Ontario|UK|Canada|United States)\s*$/i

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

const splitRoleLabel = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return { title: null, location: null }

  const match = normalized.match(ROLE_LOCATION_PATTERN)
  if (!match) {
    return { title: normalized, location: null }
  }

  return {
    title: normalized.slice(0, match.index).trim() || null,
    location: match[1].trim(),
  }
}

export const hasVerifiedCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)?.toLowerCase() || ''

  return /<title>\s*career opportunities\s*-\s*circleci\s*<\/title>/i.test(page)
    && normalized.includes('posting expired')
    && normalized.includes('current open roles')
    && /href=["'][^"']*\/careers\/jobs\/[^"']+["']/i.test(page)
}

export const extractRoleSummaries = (html = '') => {
  const roles = []
  const page = String(html ?? '')

  for (const sectionMatch of page.matchAll(/<section\b[^>]*>([\s\S]*?)<\/section>/gi)) {
    const sectionHtml = sectionMatch[1]
    const department = normalizeWhitespace(
      sectionHtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || null,
    )

    if (!department) continue

    for (const linkMatch of sectionHtml.matchAll(/<a[^>]*href=["']([^"']*\/careers\/jobs\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      const url = toAbsoluteUrl(linkMatch[1])
      const { title, location } = splitRoleLabel(linkMatch[2])

      if (!url || !title || !location) continue

      roles.push({
        title,
        location,
        department,
        url,
      })
    }
  }

  return roles
}

const hasIndiaRole = (roles = []) =>
  roles.some((role) => /\bindia\b/i.test(String(role.location ?? '')))

const allRolesStayOnFirstPartyDomain = (roles = []) =>
  roles.every((role) => {
    try {
      return new URL(role.url).hostname === 'circleci.com'
    } catch {
      return false
    }
  })

export const createCircleCiScraper = () => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_PAGE_URL)

    if (!hasVerifiedCareersPageSignal(careersHtml)) {
      throw new Error('Verified CircleCI careers page changed materially')
    }

    const roles = extractRoleSummaries(careersHtml)
    if (roles.length === 0) {
      throw new Error('Verified CircleCI role listing changed materially')
    }

    if (!allRolesStayOnFirstPartyDomain(roles)) {
      throw new Error('Verified CircleCI same-domain role-link contract changed materially')
    }

    if (hasIndiaRole(roles)) {
      throw new Error('Verified CircleCI India slice changed materially')
    }

    return []
  },
})

export const run = async (options = {}) => createCircleCiScraper(options).run(options)

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
