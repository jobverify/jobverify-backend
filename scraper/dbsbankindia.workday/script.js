import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { extractWorkdayJobDetail } from '../../scraper-support/detailExtractors/workday.js'
import { shouldContinueWorkdayJobsApiPagination } from '../../scraper-support/myworkday/engine.js'
import { fetchJsonWithRetry } from '../../scraper-support/utils/fetch.js'
import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'
import DBS_BANK_INDIA_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = DBS_BANK_INDIA_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const WORKDAY_BOARD_URL = PROVIDER_METADATA.officialWorkdayBoardUrl
export const JOBS_API_URL = PROVIDER_METADATA.jobsApiUrl
export const VERIFIED_AT = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const VERIFIED_INDIA_COUNTRY_FACET_ID = PROVIDER_METADATA.verifiedIndiaCountryFacetId
export const WORKDAY_BOARD_ACCEPTED_URLS = [
  WORKDAY_BOARD_URL,
  'https://dbs.wd3.myworkdayjobs.com/en-US/DBS_Careers',
]

const PAGE_SIZE = 20
const DETAIL_FETCH_CONCURRENCY = 2
const DETAIL_FETCH_ATTEMPTS = 3
const DETAIL_RETRY_BASE_DELAY_MS = 1500
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

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

const defaultFetchPage = async (url) => {
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

const extractLocationCountryFacetValues = (payload = {}) => {
  const locationCountryFacet = (Array.isArray(payload?.facets) ? payload.facets : [])
    .find((facet) => facet?.facetParameter === 'locationMainGroup')
    ?.values?.find((value) => value?.facetParameter === 'locationCountry')

  if (!locationCountryFacet || !Array.isArray(locationCountryFacet.values)) {
    throw new Error('DBS Bank India verified India country facet changed materially')
  }

  return locationCountryFacet.values
}

const isLikelyWorkdayRequisitionId = (value) => {
  const token = normalizeWhitespace(value)
  if (!token || /[,\s]/.test(token)) {
    return false
  }

  return /^(?:WD\d+(?:-\d+)?|[A-Z]{0,6}[A-Z0-9_-]*\d[A-Z0-9_-]*|\d{5,})$/i.test(token)
}

const extractJobId = (posting = {}) => {
  const requisitionId = Array.isArray(posting?.bulletFields)
    ? posting.bulletFields
      .map(normalizeWhitespace)
      .find((value) => isLikelyWorkdayRequisitionId(value))
    : null

  if (requisitionId) return requisitionId

  const externalPathRequisitionId = normalizeWhitespace(
    String(posting?.externalPath ?? '').match(/_([^/?#/_]+)(?:[/?#]|$)/i)?.[1],
  )

  return isLikelyWorkdayRequisitionId(externalPathRequisitionId)
    ? externalPathRequisitionId
    : null
}

const buildDetailUrl = (externalPath) => {
  if (!externalPath) return null

  try {
    if (String(externalPath).startsWith('/')) {
      return `${WORKDAY_BOARD_URL}${externalPath}`.split('?')[0]
    }

    return new URL(String(externalPath), `${WORKDAY_BOARD_URL}/`).toString().split('?')[0]
  } catch {
    return null
  }
}

const cleanLocationText = (value) => normalizeWhitespace(value)?.replace(/-DBIL\b/gi, '').trim() || null

const extractCityFromLocation = (value) => {
  const cleaned = cleanLocationText(value)
  if (!cleaned) return null

  if (/^new delhi$/i.test(cleaned)) {
    return 'New Delhi'
  }

  return normalizeCity(cleaned) || cleaned
}

const normalizeIndiaLocation = (value) => {
  const city = extractCityFromLocation(value)
  return city ? `${city}, India` : null
}

const mapWithConcurrency = async (items, concurrency, mapper) => {
  const limit = Math.max(1, Number.parseInt(concurrency, 10) || 1)
  const results = new Array(items.length)
  let nextIndex = 0
  let firstError = null

  const worker = async () => {
    while (!firstError) {
      const currentIndex = nextIndex
      nextIndex += 1

      if (currentIndex >= items.length) return
      try {
        results[currentIndex] = await mapper(items[currentIndex], currentIndex)
      } catch (error) {
        firstError ||= error
        return
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  )

  if (firstError) throw firstError
  return results
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const mergePostingDetail = (job, detail = {}) => ({
  ...job,
  postedAt: detail.postingDate ?? job.postedAt,
  postingDate: detail.postingDate ?? job.postingDate ?? null,
  jobDescription: detail.jobDescription ?? job.jobDescription,
  minimumQualification: detail.minimumQualification ?? job.minimumQualification,
  preferredQualification: detail.preferredQualification ?? job.preferredQualification,
  requiredSkills: Array.isArray(detail.requiredSkills)
    ? detail.requiredSkills
    : job.requiredSkills,
  experienceRequired: detail.experienceRequired ?? job.experienceRequired,
  publicExperienceChecked: detail.publicExperienceChecked ?? job.publicExperienceChecked ?? false,
  requisitionId: detail.requisitionId ?? job.requisitionId,
})

const fetchPostingDetail = async (
  job,
  fetchPage,
  {
    detailFetchAttempts = DETAIL_FETCH_ATTEMPTS,
    detailRetryBaseDelayMs = DETAIL_RETRY_BASE_DELAY_MS,
  } = {},
) => {
  for (let attempt = 1; attempt <= detailFetchAttempts; attempt += 1) {
    try {
      const detailPage = await fetchPage(job.link)
      if (detailPage.status !== 200) {
        const error = new Error(`HTTP ${detailPage.status}`)
        error.httpStatus = detailPage.status
        throw error
      }

      return extractWorkdayJobDetail(detailPage.html)
    } catch (error) {
      const status = Number(error?.httpStatus)
      const shouldRetry = attempt < detailFetchAttempts
        && (status === 429 || (status >= 500 && status <= 599))

      if (!shouldRetry) {
        throw error
      }

      await delay(detailRetryBaseDelayMs * (2 ** (attempt - 1)))
    }
  }

  return {}
}

const enrichPostingWithDetail = async (job, fetchPage, options = {}) => {
  try {
    return mergePostingDetail(job, await fetchPostingDetail(job, fetchPage, options))
  } catch (error) {
    console.warn(`  [${SOURCE}] Failed to enrich details for ${job.link}: ${error.message}`)
    return job
  }
}

const normalizePosting = (posting, scrapedAt) => {
  const title = normalizeWhitespace(posting?.title)
  const summaryLocation = normalizeWhitespace(posting?.locationsText)
  const link = buildDetailUrl(posting?.externalPath)
  const jobId = extractJobId(posting)
  const city = extractCityFromLocation(summaryLocation)
  const location = normalizeIndiaLocation(summaryLocation)

  if (!title || !summaryLocation || !link || !jobId || !city || !location) {
    throw new Error('DBS Bank India verified India Workday jobs payload changed materially')
  }

  return {
    jobId,
    title,
    company: COMPANY,
    department: null,
    location,
    city,
    locations: [summaryLocation],
    link,
    source: SOURCE,
    postedAt: null,
    closingDate: null,
    jobDescription: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    experienceRequired: null,
    requisitionId: jobId,
    scrapedAt,
  }
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')

  return /<title>\s*Careers at DBS \| DBS Bank\s*<\/title>/i.test(page)
    && />\s*Explore Jobs\s*</i.test(page)
    && /\/gsmc-grp\/careers\/teams\/india\.page/i.test(page)
}

export const extractVerifiedWorkdayBoardUrl = (html = '') => {
  for (const match of String(html ?? '').matchAll(/href=["']([^"']+)["']/gi)) {
    if (isAcceptedWorkdayBoardUrl(match[1])) {
      return WORKDAY_BOARD_URL
    }
  }

  return null
}

export const hasOfficialWorkdayBoardSignal = (html = '') => {
  const page = String(html ?? '')

  return /rel=["']canonical["'][^>]*href=["']https:\/\/dbs\.wd3\.myworkdayjobs\.com\/DBS_Careers["']/i.test(page)
    && /property=["']og:url["'][^>]*content=["']https:\/\/dbs\.wd3\.myworkdayjobs\.com\/DBS_Careers["']/i.test(page)
    && /property=["']og:description["'][^>]*content=["'][^"']*DBS is more than a bank/i.test(page)
    && /tenant:\s*"dbs"/i.test(page)
    && /siteId:\s*"DBS_Careers"/i.test(page)
}

export const buildUnfilteredJobsRequestBody = ({
  offset = 0,
  limit = PAGE_SIZE,
} = {}) => JSON.stringify({
  appliedFacets: {},
  limit,
  offset,
  searchText: '',
})

export const extractIndiaCountryFacetId = (payload = {}) => {
  const indiaFacet = extractLocationCountryFacetValues(payload)
    .find((value) => normalizeWhitespace(value?.descriptor) === 'India')

  const facetId = normalizeWhitespace(indiaFacet?.id)
  if (!facetId || facetId !== VERIFIED_INDIA_COUNTRY_FACET_ID) {
    throw new Error('DBS Bank India verified India country facet changed materially')
  }

  return facetId
}

export const buildIndiaJobsRequestBody = ({
  offset = 0,
  limit = PAGE_SIZE,
  countryFacetId = VERIFIED_INDIA_COUNTRY_FACET_ID,
} = {}) => JSON.stringify({
  appliedFacets: {
    locationCountry: [countryFacetId],
  },
  limit,
  offset,
  searchText: '',
})

export const createDbsBankIndiaScraper = ({
  now: defaultNow = () => new Date().toISOString(),
  maxPages = Number.POSITIVE_INFINITY,
  detailFetchConcurrency: defaultDetailFetchConcurrency = DETAIL_FETCH_CONCURRENCY,
  detailFetchAttempts: defaultDetailFetchAttempts = DETAIL_FETCH_ATTEMPTS,
  detailRetryBaseDelayMs: defaultDetailRetryBaseDelayMs = DETAIL_RETRY_BASE_DELAY_MS,
} = {}) => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchJson = defaultFetchJson,
    now = defaultNow,
    detailFetchConcurrency = defaultDetailFetchConcurrency,
    detailFetchAttempts = defaultDetailFetchAttempts,
    detailRetryBaseDelayMs = defaultDetailRetryBaseDelayMs,
  } = {}) {
    const careersPage = await fetchPage(CAREERS_URL)
    if (
      careersPage.status !== 200
      || !sameUrl(careersPage.url, CAREERS_URL)
      || !hasOfficialCareersSignal(careersPage.html)
    ) {
      throw new Error('DBS Bank India verified official careers surface changed materially')
    }

    const verifiedBoardUrl = extractVerifiedWorkdayBoardUrl(careersPage.html)
    if (!sameUrl(verifiedBoardUrl, WORKDAY_BOARD_URL)) {
      throw new Error('DBS Bank India verified Workday handoff changed materially')
    }

    const workdayBoardPage = await fetchPage(WORKDAY_BOARD_URL)
    if (
      workdayBoardPage.status !== 200
      || !isAcceptedWorkdayBoardUrl(workdayBoardPage.url)
      || !hasOfficialWorkdayBoardSignal(workdayBoardPage.html)
    ) {
      throw new Error('DBS Bank India verified public Workday board changed materially')
    }

    const unfilteredPayload = await fetchJson(
      JOBS_API_URL,
      buildUnfilteredJobsRequestBody({ offset: 0 }),
    )
    const countryFacetId = extractIndiaCountryFacetId(unfilteredPayload)

    const scrapedAt = now()
    const jobs = []
    const seenJobIds = new Set()
    let offset = 0

    for (let page = 1; page <= maxPages; page += 1) {
      const payload = await fetchJson(
        JOBS_API_URL,
        buildIndiaJobsRequestBody({ offset, countryFacetId }),
      )
      const postings = Array.isArray(payload?.jobPostings) ? payload.jobPostings : []

      if (page === 1 && postings.length === 0) {
        return []
      }

      for (const posting of postings) {
        const job = normalizePosting(posting, scrapedAt)
        if (seenJobIds.has(job.jobId)) {
          continue
        }

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

    const enrichedJobs = await mapWithConcurrency(
      jobs,
      detailFetchConcurrency,
      async (job) => enrichPostingWithDetail(job, fetchPage, {
        detailFetchAttempts,
        detailRetryBaseDelayMs,
      }),
    )

    return enrichedJobs.sort((left, right) => left.title.localeCompare(right.title))
  },
})

export const run = async (options = {}) => createDbsBankIndiaScraper(options).run(options)

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
