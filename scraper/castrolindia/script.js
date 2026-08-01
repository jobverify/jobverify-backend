import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { withRetry } from '../../scraper-support/utils/retry.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'castrolindia'
export const COMPANY = 'Castrol India'
export const SITEMAP_URL = 'https://www.castrol.com/en_in/india/home/sitemap.html'
export const CAREERS_PAGE_URL = 'https://www.castrol.com/en_in/india/home/about-castrol/careers.html'
export const GRADUATE_PROGRAMMES_URL =
  'https://www.castrol.com/en_in/india/home/about-castrol/careers/graduate-programmes.html'
export const BP_CAREERS_URL = 'https://www.bp.com/en/global/corporate/careers.html'
export const BP_SEARCH_APPLY_URL =
  'https://www.bp.com/en/global/corporate/careers/search-and-apply.html'
export const BP_ALGOLIA_APP_ID = 'UM59DWRPA1'
export const BP_ALGOLIA_API_KEY = '33719eb8d9f28725f375583b7e78dbab'
export const BP_ALGOLIA_INDEX_NAME = 'production_bp_jobs'
export const BP_ALGOLIA_QUERY_URL =
  `https://${BP_ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${BP_ALGOLIA_INDEX_NAME}/query`

const MERI_CASTROL_KAHAANI_PATH =
  '/en_in/india/home/about-castrol/careers/meri-castrol-kahaani.html'
const POWER_UP_PATH = '/en_in/india/home/about-castrol/careers/power-up.html'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const JOB_LISTING_SIGNAL_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bopen positions?\b/i,
  /\bjob alerts?\b/i,
  /\bsearch jobs\b/i,
  /\bkeyword search\b/i,
  /\brequisition(?:\s+id)?\b/i,
  /\bjob description\b/i,
  /\bjob details\b/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /greenhouse/i,
  /lever\.co/i,
  /ashbyhq/i,
  /smartrecruiters/i,
  /jobvite/i,
  /successfactors/i,
  /icims/i,
  /phenom/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#0*39;|&apos;|&#x27;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined
  }

  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

const defaultFetchPage = (url) => withRetry(async () => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: createTimeoutSignal(15000),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}, {
  attempts: 3,
  baseDelayMs: 2000,
  label: SOURCE,
})

export const buildBpAlgoliaSearchParams = ({
  page = 0,
  hitsPerPage = 100,
} = {}) => new URLSearchParams({
  page: String(page),
  hitsPerPage: String(hitsPerPage),
  facets: '*',
  facetFilters: JSON.stringify(['location_list:India']),
}).toString()

export const buildBpAlgoliaJobsRequest = (options = {}) => ({
  url: BP_ALGOLIA_QUERY_URL,
  params: buildBpAlgoliaSearchParams(options),
})

const defaultFetchAlgoliaJobs = (request = buildBpAlgoliaJobsRequest()) => withRetry(async () => {
  const response = await fetch(request.url, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Algolia-API-Key': BP_ALGOLIA_API_KEY,
      'X-Algolia-Application-Id': BP_ALGOLIA_APP_ID,
    },
    body: JSON.stringify({ params: request.params }),
    signal: createTimeoutSignal(20000),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${request.url}`)
  }

  return response.json()
}, {
  attempts: 3,
  baseDelayMs: 2000,
  label: `${SOURCE}-bp-algolia`,
})

export const hasPublicJobListingsSignal = (html) =>
  JOB_LISTING_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasOfficialSitemapSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()

  return normalized.includes('sitemap | castrol india')
    && page.includes('/en_in/india/home/about-castrol/careers.html')
    && page.includes('/en_in/india/home/about-castrol/careers/graduate-programmes.html')
    && page.includes(MERI_CASTROL_KAHAANI_PATH)
    && page.includes(POWER_UP_PATH)
}

export const hasOfficialCareersPageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()

  return normalized.includes('careers | castrol india')
    && normalized.includes('find a job at castrol and build a career with no limit')
    && normalized.includes('be part of our story')
    && normalized.includes('working with us offers reward, prestige and the opportunity to do brilliant things.')
    && page.includes('/en_in/india/home/about-castrol/careers/graduate-programmes.html')
    && page.includes('https://www.bp.com/en/global/corporate/careers/search-and-apply.html')
    && page.includes(MERI_CASTROL_KAHAANI_PATH)
}

export const hasOfficialGraduateProgrammesSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()

  return normalized.includes('graduate programmes | castrol india')
    && normalized.includes('graduate programmes')
    && normalized.includes('development programmes')
    && normalized.includes('our graduates are curious, driven and have a thirst for knowledge.')
    && normalized.includes('as a graduate with castrol, you can expect:')
    && page.includes('https://www.bp.com/en/global/corporate/careers.html')
}

export const hasBlockedBpCareersSignal = ({ status, html } = {}) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()
  const rawLower = page.toLowerCase()

  return status === 403
    && normalized.includes('something went wrong')
    && normalized.includes('an unexpected server error has occurred.')
    && normalized.includes('linkedin')
    && (
      rawLower.includes('company/bp')
      || rawLower.includes('bp_plc')
      || rawLower.includes('bp logo')
    )
}

export const hasOfficialBpSearchSignal = ({ status, url, html } = {}) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()

  return Number(status) === 200
    && (
      /careers\.bp\.com\/listing/i.test(String(url ?? ''))
      || normalized.includes('job opportunities at bp')
      || normalized.includes('search and apply')
    )
    && /algoliasearch|instantsearch|production_bp_jobs/i.test(page)
}

const firstValue = (value) => {
  if (Array.isArray(value)) return normalizeWhitespace(value[0])
  return normalizeWhitespace(value)
}

const isIndiaHit = (hit = {}) => (
  /india/i.test(firstValue(hit.primary_country) || '')
  || /india/i.test(firstValue(hit.location) || '')
)

const extractCity = (hit = {}) => {
  const explicitCity = firstValue(hit.city)
  if (explicitCity) return explicitCity

  const location = firstValue(hit.location)
  const match = location?.match(/\|\s*([^,|]+),\s*India/i)
  return normalizeWhitespace(match?.[1])
}

export const extractBpIndiaJobs = (payload = {}) => (
  (Array.isArray(payload?.hits) ? payload.hits : [])
    .filter(isIndiaHit)
    .map((hit) => {
      const title = normalizeWhitespace(hit.title)
      const jobId = normalizeWhitespace(hit.id)
      const requisitionId = firstValue(hit.job_code) || normalizeWhitespace(hit.external_id)
      const applyUrl = firstValue(hit.job_detail_link)

      if (!title || !jobId || !applyUrl) return null

      return {
        title,
        company: COMPANY,
        department: firstValue(hit.group) || firstValue(hit.business_area),
        location: firstValue(hit.location) || 'India',
        city: extractCity(hit),
        country: 'India',
        jobId,
        requisitionId,
        sourceUrl: applyUrl,
        applyUrl,
        employmentType: firstValue(hit.time_type) || firstValue(hit.job_type),
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: normalizeWhitespace(hit.description) || null,
        remoteStatus: firstValue(hit.remote_type),
      }
    })
    .filter(Boolean)
)

const isExpectedBpHandoffFailure = (error) => {
  const normalized = normalizeWhitespace(error?.message).toLowerCase()

  return normalized.includes('fetch failed')
    || normalized.includes('timed out')
    || normalized.includes('econnrefused')
    || normalized.includes('enotfound')
    || normalized.includes('networkerror')
}

const verifyBlockedBpHandoff = async ({ fetchPage, url, label }) => {
  try {
    const page = await fetchPage(url)
    if (hasBlockedBpCareersSignal(page)) {
      return
    }

    throw new Error(`Castrol India ${label} no longer matches the verified blocked state`)
  } catch (error) {
    if (isExpectedBpHandoffFailure(error)) {
      return
    }

    throw error
  }
}

export const createCastrolIndiaScraper = () => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchAlgoliaJobs = defaultFetchAlgoliaJobs,
  } = {}) {
    const sitemapPage = await fetchPage(SITEMAP_URL)
    if (sitemapPage.status !== 200 || !hasOfficialSitemapSignal(sitemapPage.html)) {
      throw new Error('Castrol India careers sitemap no longer matches the verified official surface')
    }

    const careersPage = await fetchPage(CAREERS_PAGE_URL)
    if (careersPage.status !== 200 || !hasOfficialCareersPageSignal(careersPage.html)) {
      throw new Error('Castrol India careers page no longer matches the verified official surface')
    }
    if (hasPublicJobListingsSignal(careersPage.html)) {
      throw new Error('Castrol India careers page now appears to expose public job listings')
    }

    const graduateProgrammesPage = await fetchPage(GRADUATE_PROGRAMMES_URL)
    if (
      graduateProgrammesPage.status !== 200
      || !hasOfficialGraduateProgrammesSignal(graduateProgrammesPage.html)
    ) {
      throw new Error('Castrol India graduate programmes page no longer matches the verified official surface')
    }
    if (hasPublicJobListingsSignal(graduateProgrammesPage.html)) {
      throw new Error('Castrol India graduate programmes page now appears to expose public job listings')
    }

    const bpSearchPage = await fetchPage(BP_SEARCH_APPLY_URL)
    if (!hasOfficialBpSearchSignal(bpSearchPage)) {
      throw new Error('Castrol India verified public BP jobs surface changed')
    }

    const jobs = extractBpIndiaJobs(
      await fetchAlgoliaJobs(buildBpAlgoliaJobsRequest()),
    )

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createCastrolIndiaScraper().run(options)

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
