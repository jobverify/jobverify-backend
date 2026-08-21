import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { LAVA_INTERNATIONAL_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = LAVA_INTERNATIONAL_CATALOG.source
export const COMPANY = LAVA_INTERNATIONAL_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = LAVA_INTERNATIONAL_CATALOG.officialBrandName
export const VERIFIED_ON = LAVA_INTERNATIONAL_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = LAVA_INTERNATIONAL_CATALOG.verifiedSurfaceSummary
export const PROVIDER_METADATA = LAVA_INTERNATIONAL_CATALOG
export const HOMEPAGE_URL = LAVA_INTERNATIONAL_CATALOG.homepageUrl
export const ABOUT_PAGE_URL = LAVA_INTERNATIONAL_CATALOG.aboutPageUrl
export const CAREERS_URL = LAVA_INTERNATIONAL_CATALOG.companyCareerPage
export const APPLICATION_URL = LAVA_INTERNATIONAL_CATALOG.applicationUrl
export const APPLICATION_EMAIL = LAVA_INTERNATIONAL_CATALOG.applicationEmail ?? null
export const OPEN_POSITION_LIST_API_URL = 'https://www.lavamobiles.com/api/openpositionlist'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOB_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
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
  /icims/i,
  /taleo/i,
]

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return {
    ok: response.ok,
    status: response.status,
    url: response.url,
    text: await response.text(),
  }
}

const defaultFetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain,*/*',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&lsquo;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export const hasOfficialAboutPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title[^>]*>\s*About LAVA/i.test(page)
    && normalized.includes('Our Culture and Philosophy')
    && normalized.includes('A strong culture is what separates great companies from those that perish sooner or later.')
    && normalized.includes('Lava International Limited')
}

export const hasCareersLandingSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title[^>]*>\s*Career Lava Mobiles - Career Opportunities in Telecom\s*<\/title>/i.test(page)
    && normalized.includes('Join Us')
    && normalized.includes('It is not just a career.')
    && normalized.includes("it's an opportunity to shape the future")
    && /href=["'](?:https:\/\/www\.lavamobiles\.com)?\/career\/joblist["']/i.test(page)
}

export const hasJobListPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /"page"\s*:\s*"\/career\/joblist"/i.test(page)
    && normalized.includes('Clear Filter')
    && normalized.includes('Job Title :')
    && normalized.includes('Upload Resume')
    && normalized.includes('Lava International Limited')
}

export const pageExposesPublicJobListings = (html = '') =>
  PUBLIC_JOB_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasEmptyOpenPositionListPayload = (payload) =>
  Array.isArray(payload) && payload.length === 0

const isKnownTemporaryOpenPositionApiFailure = (error) =>
  new RegExp(`^HTTP 500 for ${OPEN_POSITION_LIST_API_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
    .test(String(error?.message ?? error))

export const createLavaInternationalScraper = () => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchJson = defaultFetchJson,
  } = {}) {
    const aboutPage = await fetchPage(ABOUT_PAGE_URL)
    if (Number(aboutPage.status) !== 200 || !hasOfficialAboutPageSignal(aboutPage.text)) {
      throw new Error('The verified official about page for Lava International no longer matches the first-party surface')
    }

    if (pageExposesPublicJobListings(aboutPage.text)) {
      throw new Error('The official Lava International about page now appears to expose public job listings')
    }

    const careersPage = await fetchPage(CAREERS_URL)
    if (Number(careersPage.status) !== 200 || !hasCareersLandingSignal(careersPage.text)) {
      throw new Error('The verified careers landing page for Lava International no longer matches the first-party surface')
    }

    if (pageExposesPublicJobListings(careersPage.text)) {
      throw new Error('The official Lava International careers landing page now appears to expose public job listings')
    }

    const jobListPage = await fetchPage(APPLICATION_URL)
    if (Number(jobListPage.status) !== 200 || !hasJobListPageSignal(jobListPage.text)) {
      throw new Error('The verified job-list page for Lava International no longer matches the first-party surface')
    }

    if (pageExposesPublicJobListings(jobListPage.text)) {
      throw new Error('The official Lava International job-list page now appears to expose structured public job listings')
    }

    let openPositionsPayload

    try {
      openPositionsPayload = await fetchJson(OPEN_POSITION_LIST_API_URL)
    } catch (error) {
      if (isKnownTemporaryOpenPositionApiFailure(error)) {
        return []
      }

      throw error
    }

    if (!hasEmptyOpenPositionListPayload(openPositionsPayload)) {
      throw new Error('The verified open-position API changed materially')
    }

    return []
  },
})

export const run = async (options = {}) => createLavaInternationalScraper().run(options)

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
