import path from 'node:path'
import { fileURLToPath } from 'node:url'

import EDELWEISS_CATALOG, { VERIFIED_SURFACE_SUMMARY } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = EDELWEISS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_AT = PROVIDER_METADATA.verifiedOn
export const ROOT_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const APPLICATION_EMAIL = PROVIDER_METADATA.applicationEmail
export const APPLICATION_URL = PROVIDER_METADATA.applicationUrl
export { VERIFIED_SURFACE_SUMMARY }

export const BLOCKED_ROUTE_URLS = [
  ROOT_URL,
  CAREERS_URL,
  'https://www.edelweissfin.com/robots.txt',
  'https://www.edelweissfin.com/sitemap.xml',
  'https://www.edelweissfin.com/careers',
  'https://www.edelweissfin.com/career',
  'https://www.edelweissfin.com/jobs',
  'https://www.edelweissfin.com/join-us',
  'https://www.edelweissfin.com/work-with-us',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOB_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions?\b/i,
  /\bjob openings?\b/i,
  /\bsearch jobs\b/i,
  /\bview jobs\b/i,
  /\bopen roles\b/i,
  /\bapply now\b/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /workdayjobs/i,
  /myworkdayjobs/i,
  /smartrecruiters/i,
  /darwinbox/i,
  /jobvite/i,
  /icims/i,
  /taleo/i,
  /peoplestrong/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&lsquo;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const extractTitle = (html = '') => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1])
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

export const hasPublicJobListingSignal = (html = '') =>
  PUBLIC_JOB_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasVerifiedInformationalCareersSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return extractTitle(rawHtml) === 'Careers At Edelweiss'
    && /CAREERS AT EDELWEISS/i.test(normalized)
    && /LIFE AT EDELWEISS/i.test(normalized)
    && /Want to join the Edelweiss family\?/i.test(normalized)
    && /GroupTalent\.Acquisition@edelweissfin\.com/i.test(normalized)
    && !hasPublicJobListingSignal(rawHtml)
}

export const isVerifiedBlockedDirectFetchSurface = (page = {}, requestedUrl) => {
  const rawHtml = String(page?.html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return Number(page?.status) === 403
    && (page?.url || requestedUrl) === requestedUrl
    && extractTitle(rawHtml) === 'Access Denied'
    && /Access Denied/i.test(normalized)
    && /You don't have permission to access/i.test(normalized)
    && /errors\.edgesuite\.net/i.test(normalized)
    && !hasPublicJobListingSignal(rawHtml)
}

export const createEdelweissScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    for (const url of BLOCKED_ROUTE_URLS) {
      const page = await fetchPage(url)

      if (hasPublicJobListingSignal(page?.html)) {
        throw new Error(`Edelweiss blocked direct-fetch route now appears to expose public jobs: ${url}`)
      }

      if (!isVerifiedBlockedDirectFetchSurface(page, url)) {
        throw new Error(`Edelweiss verified blocked direct-fetch surface changed: ${url}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createEdelweissScraper().run(options)

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
