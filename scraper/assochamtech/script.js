import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ASSOCHAM_TECH_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = ASSOCHAM_TECH_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_AT = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const APPLICATION_EMAIL = PROVIDER_METADATA.applicationEmail
export const APPLICATION_URL = PROVIDER_METADATA.applicationUrl
export const NO_PUBLIC_JOB_ROUTE_URLS = [
  'https://www.assocham.org/careers',
  'https://www.assocham.org/careers/',
  'https://www.assocham.org/career',
  'https://www.assocham.org/career/',
  'https://www.assocham.org/jobs',
  'https://www.assocham.org/jobs/',
  'https://www.assocham.org/join-us',
  'https://www.assocham.org/join-us/',
  'https://www.assocham.org/work-with-us',
  'https://www.assocham.org/work-with-us/',
  'https://www.assocham.org/recruitment',
  'https://www.assocham.org/recruitment/',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOB_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bopen roles\b/i,
  /\bjob openings\b/i,
  /\bvacancies\b/i,
  /\bview jobs\b/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /successfactors/i,
  /darwinbox/i,
  /oraclecloud/i,
  /icims/i,
  /workable\.com/i,
]

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
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

const toAbsoluteUrl = (value, baseUrl = HOMEPAGE_URL) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const getFinalUrl = (page, fallbackUrl) => page?.url || page?.finalUrl || fallbackUrl

export const extractCareersUrl = (html = '') => {
  for (const match of String(html ?? '').matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const href = match[1]

    if (/^careers?$/i.test(text) || /career\.php/i.test(href)) {
      return toAbsoluteUrl(href, HOMEPAGE_URL)
    }
  }

  return null
}

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*ASSOCHAM \| Knowledge Architect of India\s*<\/title>/i.test(rawHtml)
    && /Knowledge Architect of India/i.test(normalized)
    && /Careers/i.test(normalized)
    && extractCareersUrl(rawHtml) === CAREERS_URL
}

export const pageExposesPublicJobListings = (html) =>
  PUBLIC_JOB_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasGenericCareersIntakeSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*ASSOCHAM \| Knowledge Architect of India\s*<\/title>/i.test(rawHtml)
    && /\bCareers\b/i.test(normalized)
    && /Submit Your Profile/i.test(normalized)
    && /Apply for internship/i.test(normalized)
    && /hr@assocham\.com/i.test(normalized)
    && /job_title/i.test(rawHtml)
    && /resume/i.test(rawHtml)
    && !pageExposesPublicJobListings(rawHtml)
}

export const isVerifiedNoPublicJobRoute = (page = {}, requestedUrl) => {
  const rawHtml = String(page.html ?? '')
  const finalUrl = getFinalUrl(page, requestedUrl)

  return Number(page.status) === 404
    && finalUrl === requestedUrl
    && /404 Not Found/i.test(rawHtml)
    && !pageExposesPublicJobListings(rawHtml)
}

export const createAssochamTechScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Assocham Tech verified official homepage no longer matches the known public surface')
    }

    if (extractCareersUrl(homepage.html) !== CAREERS_URL) {
      throw new Error('Assocham Tech verified careers handoff no longer matches the known public surface')
    }

    const careersPage = await fetchPage(CAREERS_URL)
    if (getFinalUrl(careersPage, CAREERS_URL) !== CAREERS_URL) {
      throw new Error('Assocham Tech verified careers route no longer matches the known public surface')
    }

    if (pageExposesPublicJobListings(careersPage.html)) {
      throw new Error('Assocham Tech careers page now appears to expose a public jobs surface')
    }

    if (careersPage.status !== 200 || !hasGenericCareersIntakeSignal(careersPage.html)) {
      throw new Error('Assocham Tech verified generic careers intake surface no longer matches the known public page')
    }

    for (const routeUrl of NO_PUBLIC_JOB_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)

      if (!isVerifiedNoPublicJobRoute(routePage, routeUrl)) {
        throw new Error(`Assocham Tech verified no-public-job route changed: ${getFinalUrl(routePage, routeUrl)}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createAssochamTechScraper().run(options)

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
