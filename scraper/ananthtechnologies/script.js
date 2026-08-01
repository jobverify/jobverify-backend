import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ANANTH_TECHNOLOGIES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = ANANTH_TECHNOLOGIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_AT = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_ENTRY_URL = PROVIDER_METADATA.careersEntryUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const APPLICATION_EMAIL = PROVIDER_METADATA.applicationEmail
export const APPLICATION_URL = PROVIDER_METADATA.applicationUrl
export const NO_PUBLIC_JOB_ROUTE_URLS = [
  'https://ananthtech.com/jobs',
  'https://ananthtech.com/jobs/',
  'https://www.ananthtech.com/jobs',
  'https://www.ananthtech.com/jobs/',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOB_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bopen roles\b/i,
  /\bapply now\b/i,
  /\bview jobs\b/i,
  /\bjob vacancy\b/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /successfactors/i,
  /oraclecloud/i,
  /darwinbox/i,
  /icims/i,
  /taleo/i,
  /peoplestrong/i,
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

const getFinalUrl = (page, fallbackUrl) => page?.url || page?.finalUrl || fallbackUrl

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*Ananth Technologies \| Aerospace &amp; Defence\s*<\/title>/i.test(rawHtml)
    && /\bSATCOM\b/i.test(normalized)
    && /\bBROADBAND\b/i.test(normalized)
    && /\bFacilities\b/i.test(normalized)
    && /\bCareers\b/i.test(normalized)
    && /KA-Band High-Throughput Satellite/i.test(normalized)
    && /Featured Mission SPADEX/i.test(normalized)
}

export const hasResumeOnlyCareersSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*Ananth Technologies \| Aerospace &amp; Defence\s*<\/title>/i.test(rawHtml)
    && /Join Our Team/i.test(normalized)
    && /Shape the future of aerospace technology/i.test(normalized)
    && /Build Your Legacy in Aerospace/i.test(normalized)
    && /Ready to launch your career/i.test(normalized)
    && /always looking for exceptional talent/i.test(normalized)
    && /Hardware, Software, RF and Microwave and Mechanical systems design and manufacturing/i.test(normalized)
    && /jobs@ananthtech\.com/i.test(normalized)
    && /mailto:jobs@ananthtech\.com/i.test(rawHtml)
}

export const pageExposesPublicJobListings = (html) =>
  PUBLIC_JOB_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const isVerifiedNoPublicJobRoute = (page = {}, requestedUrl) => {
  const rawHtml = String(page.html ?? '')
  const finalUrl = getFinalUrl(page, requestedUrl)

  return Number(page.status) === 403
    && finalUrl === requestedUrl
    && /403 Forbidden/i.test(rawHtml)
    && /(AccessDenied|Access Denied)/i.test(rawHtml)
    && !pageExposesPublicJobListings(rawHtml)
}

export const createAnanthTechnologiesScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Ananth Technologies verified official homepage no longer matches the known public surface')
    }

    const careersPage = await fetchPage(CAREERS_ENTRY_URL)
    if (getFinalUrl(careersPage, CAREERS_ENTRY_URL) !== CAREERS_URL) {
      throw new Error('Ananth Technologies verified careers route no longer matches the known public surface')
    }

    if (pageExposesPublicJobListings(careersPage.html)) {
      throw new Error('Ananth Technologies careers page now appears to expose a public jobs surface')
    }

    if (careersPage.status !== 200 || !hasResumeOnlyCareersSignal(careersPage.html)) {
      throw new Error('Ananth Technologies verified resume-only careers surface no longer matches the known public page')
    }

    for (const routeUrl of NO_PUBLIC_JOB_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)

      if (!isVerifiedNoPublicJobRoute(routePage, routeUrl)) {
        throw new Error(`Ananth Technologies verified no-public-job route changed: ${getFinalUrl(routePage, routeUrl)}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createAnanthTechnologiesScraper().run(options)

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
