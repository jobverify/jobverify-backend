import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { shouldContinueWorkdayJobsApiPagination } from '../myworkday/engine.js'
import { fetchJsonWithRetry } from '../utils/fetch.js'
import PIRAMAL_PHARMA_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PAGE_SIZE = 20

export const PROVIDER_METADATA = PIRAMAL_PHARMA_CATALOG
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const SOURCE = PROVIDER_METADATA.source
export const COUNTRY_FILTER = PROVIDER_METADATA.countryFilter
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const WORKDAY_BOARD_URL = PROVIDER_METADATA.officialWorkdayBoardUrl
export const JOBS_API_URL = PROVIDER_METADATA.jobsApiUrl
export const VERIFIED_INDIA_COUNTRY_FACET_ID = PROVIDER_METADATA.verifiedIndiaCountryFacetId
export const VERIFIED_INDIA_JOB_URL = PROVIDER_METADATA.verifiedIndiaJobUrl
export const VERIFIED_INDIA_APPLY_URL = PROVIDER_METADATA.verifiedIndiaApplyUrl

const WORKDAY_BOARD_ACCEPTED_URLS = [
  WORKDAY_BOARD_URL,
  'https://piramalpharma.wd102.myworkdayjobs.com/en-US/PIRAMAL_EXTERNAL_CAREERS',
]

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#038;|&amp;/gi, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeComparableUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return String(value ?? '').replace(/\/$/, '')
  }
}

const sameUrl = (left, right) => normalizeComparableUrl(left) === normalizeComparableUrl(right)

const getFinalUrl = (page, fallbackUrl) => page?.url || page?.finalUrl || fallbackUrl

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

const defaultFetchJson = (url, body) => fetchJsonWithRetry(url, {
  method: 'POST',
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
    'content-type': 'application/json',
  },
  body,
  attempts: 3,
  baseDelayMs: 2000,
  timeoutMs: 20000,
  label: SOURCE,
})

const isAcceptedWorkdayBoardUrl = (value) =>
  WORKDAY_BOARD_ACCEPTED_URLS.some((candidate) => sameUrl(value, candidate))

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')

  return /Piramal Pharma Limited Careers/i.test(page)
    && /Explore Opportunities/i.test(page)
    && /Apply Now/i.test(page)
    && /piramalpharma\.wd102\.myworkdayjobs\.com\/PIRAMAL_EXTERNAL_CAREERS/i.test(page)
}

export const extractVerifiedWorkdayBoardUrl = (html = '') => {
  for (const match of String(html ?? '').matchAll(/href=["']([^"']+)["']/gi)) {
    if (isAcceptedWorkdayBoardUrl(match[1])) {
      return WORKDAY_BOARD_URL
    }
  }

  return null
}

export const hasOfficialWorkdayBoardSignal = (page = {}) => {
  const finalUrl = getFinalUrl(page, WORKDAY_BOARD_URL)
  const html = String(page.html ?? '')

  return Number(page.status) === 200
    && isAcceptedWorkdayBoardUrl(finalUrl)
    && /rel=["']canonical["'][^>]*href=["']https:\/\/piramalpharma\.wd102\.myworkdayjobs\.com\/(?:en-US\/)?PIRAMAL_EXTERNAL_CAREERS["']/i.test(html)
    && /property=["']og:title["'][^>]*content=["']Careers["']/i.test(html)
    && /Piramal Pharma Limited/i.test(html)
    && /PIRAMAL_EXTERNAL_CAREERS/i.test(html)
}

const extractLocationCountryFacetValues = (payload = {}) => {
  const locationFacet = (Array.isArray(payload?.facets) ? payload.facets : [])
    .find((facet) => facet?.facetParameter === 'locationMainGroup')

  const countryFacet = (Array.isArray(locationFacet?.values) ? locationFacet.values : [])
    .find((facet) => facet?.facetParameter === 'locationCountry')

  if (!countryFacet || !Array.isArray(countryFacet.values)) {
    throw new Error('Piramal Pharma verified India country facet changed materially')
  }

  return countryFacet.values
}

export const extractIndiaCountryFacetIds = (payload = {}) =>
  extractLocationCountryFacetValues(payload)
    .filter((value) => normalizeWhitespace(value?.descriptor)?.toLowerCase() === 'india')
    .map((value) => normalizeWhitespace(value?.id))
    .filter(Boolean)

export const buildUnfilteredJobsRequestBody = ({
  offset = 0,
  limit = PAGE_SIZE,
} = {}) => JSON.stringify({
  appliedFacets: {},
  limit,
  offset,
  searchText: '',
})

export const buildIndiaJobsRequestBody = ({
  offset = 0,
  limit = PAGE_SIZE,
  countryFacetIds = [],
} = {}) => JSON.stringify({
  appliedFacets: {
    locationCountry: countryFacetIds,
  },
  limit,
  offset,
  searchText: '',
})

const extractJobId = (posting = {}) => {
  const firstBulletField = Array.isArray(posting?.bulletFields)
    ? posting.bulletFields.find(Boolean)
    : null

  if (firstBulletField) return normalizeWhitespace(firstBulletField)

  return String(posting?.externalPath ?? '').match(/_([A-Z0-9]+(?:-[A-Z0-9]+)?)$/i)?.[1] || null
}

const buildDetailUrl = (externalPath) => {
  const normalized = String(externalPath ?? '')
  if (!normalized) return null
  if (/^https?:\/\//i.test(normalized)) return normalized.split('?')[0]
  if (!normalized.startsWith('/')) return null
  return `${WORKDAY_BOARD_URL}${normalized}`.split('?')[0]
}

const buildApplyUrl = (externalPath) => {
  const detailUrl = buildDetailUrl(externalPath)
  return detailUrl ? `${detailUrl}/apply` : null
}

const parseIndiaLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) {
    return {
      location: null,
      city: null,
      state: null,
      country: COUNTRY_FILTER,
    }
  }

  if (normalized.toLowerCase() === 'india') {
    return {
      location: COUNTRY_FILTER,
      city: null,
      state: null,
      country: COUNTRY_FILTER,
    }
  }

  const cityStateMatch = normalized.match(/^(.+?),\s*([A-Za-z]{2,3})$/)
  if (cityStateMatch?.[1] && cityStateMatch?.[2]) {
    const city = normalizeWhitespace(cityStateMatch[1])
    const state = normalizeWhitespace(cityStateMatch[2]?.toUpperCase())

    return {
      location: `${city}, ${state}, ${COUNTRY_FILTER}`,
      city,
      state,
      country: COUNTRY_FILTER,
    }
  }

  return {
    location: `${normalized}, ${COUNTRY_FILTER}`,
    city: normalized,
    state: null,
    country: COUNTRY_FILTER,
  }
}

const normalizePosting = (posting = {}, scrapedAt) => {
  const title = normalizeWhitespace(posting?.title)
  const locationText = normalizeWhitespace(posting?.locationsText)
  const jobId = extractJobId(posting)
  const sourceUrl = buildDetailUrl(posting?.externalPath)
  const applyUrl = buildApplyUrl(posting?.externalPath)

  if (!title || !jobId || !sourceUrl || !applyUrl) {
    throw new Error('Piramal Pharma verified Workday jobs payload changed materially')
  }

  const locationBits = parseIndiaLocation(locationText)

  return {
    jobId,
    title,
    company: COMPANY_NAME,
    department: null,
    location: locationBits.location,
    city: locationBits.city,
    state: locationBits.state,
    country: locationBits.country,
    sourceUrl,
    applyUrl,
    employmentType: normalizeWhitespace(posting?.timeType),
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: normalizeWhitespace(posting?.postedOn),
    closingDate: null,
    jobDescription: null,
    requisitionId: jobId,
    source: SOURCE,
    link: applyUrl,
    scrapedAt,
  }
}

export const extractJobsFromPayload = (payload = {}, scrapedAt) => {
  const postings = Array.isArray(payload?.jobPostings) ? payload.jobPostings : null
  if (!postings) {
    throw new Error('Piramal Pharma verified Workday jobs payload changed materially')
  }

  return postings.map((posting) => normalizePosting(posting, scrapedAt))
}

export const createPiramalPharmaScraper = ({
  now: defaultNow = () => new Date().toISOString(),
  maxPages = Number.POSITIVE_INFINITY,
  maxJobs = null,
} = {}) => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchJson = defaultFetchJson,
    now = defaultNow,
  } = {}) {
    const careersPage = await fetchPage(CAREERS_URL)
    if (
      careersPage.status !== 200
      || !sameUrl(careersPage.url, CAREERS_URL)
      || !hasOfficialCareersSignal(careersPage.html)
    ) {
      throw new Error('Piramal Pharma verified official careers surface changed materially')
    }

    const verifiedBoardUrl = extractVerifiedWorkdayBoardUrl(careersPage.html)
    if (!sameUrl(verifiedBoardUrl, WORKDAY_BOARD_URL)) {
      throw new Error('Piramal Pharma verified Workday handoff changed materially')
    }

    const workdayBoardPage = await fetchPage(WORKDAY_BOARD_URL)
    if (!hasOfficialWorkdayBoardSignal(workdayBoardPage)) {
      throw new Error('Piramal Pharma verified public Workday board changed materially')
    }

    const unfilteredPayload = await fetchJson(
      JOBS_API_URL,
      buildUnfilteredJobsRequestBody({ offset: 0 }),
    )
    const countryFacetIds = extractIndiaCountryFacetIds(unfilteredPayload)

    if (countryFacetIds.length === 0) {
      return []
    }

    const scrapedAt = now()
    const jobs = []
    const seenJobIds = new Set()
    let offset = 0

    for (let page = 1; page <= maxPages; page += 1) {
      const payload = await fetchJson(
        JOBS_API_URL,
        buildIndiaJobsRequestBody({ offset, countryFacetIds }),
      )
      const postings = Array.isArray(payload?.jobPostings) ? payload.jobPostings : []

      if (page === 1 && postings.length === 0) {
        return []
      }

      for (const job of extractJobsFromPayload(payload, scrapedAt)) {
        if (seenJobIds.has(job.jobId)) continue

        seenJobIds.add(job.jobId)
        jobs.push(job)
      }

      offset += postings.length
      if (!shouldContinueWorkdayJobsApiPagination({
        jobsCount: postings.length,
        offsetAfterPage: offset,
        payloadTotal: payload?.total || 0,
        pageSize: PAGE_SIZE,
      })) {
        break
      }
    }

    return maxJobs ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async (options = {}) => createPiramalPharmaScraper(options).run(options)

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
