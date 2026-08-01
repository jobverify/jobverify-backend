import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { CONDUKTOR_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = CONDUKTOR_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const CAREERS_PAGE_URL = PROVIDER_METADATA.companyCareerPage
export const OPEN_ROLES_PAGE_URL = PROVIDER_METADATA.openRolesPageUrl
export const NO_OPEN_ROLES_HEADING = 'No Open Roles Right Now'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

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

export const hasOfficialCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Careers\s*-\s*Join Our Team\s*\|\s*Conduktor\s*<\/title>/i.test(page)
    && text.includes('Join a Team of Builders')
    && text.includes('Open Roles')
    && /href=["'](?:(?:https:\/\/www\.conduktor\.io)?\/|\.\/)careers\/open-roles["']/i.test(page)
}

export const hasOfficialOpenRolesPageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Open Roles\s*\|\s*Conduktor\s*<\/title>/i.test(page)
    && text.includes('Open Roles')
    && text.includes('Conduktor')
}

export const hasNoOpenRolesSignal = (html = '') => {
  const text = normalizeWhitespace(html)

  return text.includes(NO_OPEN_ROLES_HEADING)
    && text.includes("We don't have any open positions at the moment")
}

export const hasPublicJobListingSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /jobs\.lever\.co\/conduktor\/[a-z0-9-]+/i.test(page)
    || /\btechnical support engineer\b/i.test(text)
    || /\bapply\b/i.test(text)
}

const sameUrl = (left, right) => {
  const normalizeUrl = (value) => String(value ?? '').replace(/\/+$/g, '')
  return normalizeUrl(left) === normalizeUrl(right)
}

export const createConduktorScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const careersPage = await fetchPage(CAREERS_PAGE_URL)

    if (
      careersPage.status !== 200
      || !sameUrl(careersPage.url, CAREERS_PAGE_URL)
      || !hasOfficialCareersPageSignal(careersPage.html)
    ) {
      throw new Error('Conduktor verified careers page no longer matches the known public surface')
    }

    const openRolesPage = await fetchPage(OPEN_ROLES_PAGE_URL)

    if (
      openRolesPage.status !== 200
      || !sameUrl(openRolesPage.url, OPEN_ROLES_PAGE_URL)
      || !hasOfficialOpenRolesPageSignal(openRolesPage.html)
    ) {
      throw new Error('Conduktor verified open roles page no longer matches the known public surface')
    }

    if (hasPublicJobListingSignal(openRolesPage.html)) {
      throw new Error('Conduktor open roles page now appears to expose public jobs')
    }

    if (!hasNoOpenRolesSignal(openRolesPage.html)) {
      throw new Error('Conduktor verified no-open-roles surface no longer matches the known public surface')
    }

    return []
  },
})

export const run = async (options = {}) => createConduktorScraper().run(options)

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
