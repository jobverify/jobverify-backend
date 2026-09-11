import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getValidIndiaCityForJob } from '../../src/utils/publicJobLocationScope.js'

import { DHAN_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = DHAN_CATALOG.source
export const COMPANY = DHAN_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = DHAN_CATALOG.officialBrandName
export const VERIFIED_ON = DHAN_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = DHAN_CATALOG.verifiedSurfaceSummary
export const PROVIDER_METADATA = DHAN_CATALOG
export const HOMEPAGE_URL = DHAN_CATALOG.homepageUrl
export const CAREERS_URL = DHAN_CATALOG.companyCareerPage
export const CAREERS_HANDOFF_URL = DHAN_CATALOG.officialCareersHandoffUrl
export const CAREERS_API_ORIGIN = DHAN_CATALOG.careersApiOrigin
export const CAREERS_CONFIG_URL = DHAN_CATALOG.careersConfigUrl
export const CAREERS_FILTER_PARAMS_URL = DHAN_CATALOG.careersFilterParamsUrl
export const JOBS_API_URL = DHAN_CATALOG.jobsApiUrl
export const DEFAULT_PAGE_SIZE = 12
export const KEKA_TENANT_ID = '7669ff3a-2b35-4442-9bac-9f9ae4b718b3'
export const KEKA_JOBS_API_URL = `https://dhan.keka.com/careers/api/embedjobs/default/active/${KEKA_TENANT_ID}`
export const KEKA_JOB_DETAILS_URL = 'https://dhan.keka.com/careers/jobdetails/'
const VERIFIED_BOARD_API_404_PATHS = [
  '/api/careers/configurations/',
  '/api/careers/filter-params/',
  '/api/jobs/jobsearch/',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const ACCEPTED_HOMEPAGE_URLS = [
  HOMEPAGE_URL,
  HOMEPAGE_URL.replace(/\/$/, ''),
]

const ACCEPTED_CAREERS_URLS = [
  CAREERS_URL,
  CAREERS_URL.replace(/\/$/, ''),
]

const ACCEPTED_HANDOFF_URLS = [
  CAREERS_HANDOFF_URL,
  CAREERS_HANDOFF_URL.replace(/\/$/, ''),
]

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(String(value ?? '').replace(/<[^>]+>/g, ' '))

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

const toAbsoluteUrl = (value, baseUrl) => {
  try {
    return new URL(String(value ?? ''), baseUrl).toString()
  } catch {
    return null
  }
}

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

const defaultFetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain,*/*',
    },
    redirect: 'follow',
    signal: createTimeoutSignal(15000),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

const normalizePageNumber = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

const normalizePageSize = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PAGE_SIZE
}

export const buildJobsApiUrl = ({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
} = {}) => `${CAREERS_API_ORIGIN}/api/jobs/jobsearch/?page=${normalizePageNumber(page)}&page_size=${normalizePageSize(pageSize)}`

const buildApplyUrl = (jobNumber) =>
  `${CAREERS_HANDOFF_URL}/apply?job=${encodeURIComponent(String(jobNumber ?? ''))}`

const isAcceptedHomepageUrl = (value) =>
  ACCEPTED_HOMEPAGE_URLS.some((candidate) => sameUrl(value, candidate))

const isAcceptedCareersUrl = (value) =>
  ACCEPTED_CAREERS_URLS.some((candidate) => sameUrl(value, candidate))

const isAcceptedHandoffUrl = (value) =>
  ACCEPTED_HANDOFF_URLS.some((candidate) => sameUrl(value, candidate))

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Dhan - Online Stock Trading and Investing Platform for India\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/dhan\.co\/["']/i.test(page)
    && /<a[^>]+href=["']\/career\/["'][^>]*>\s*Careers\s*<\/a>/i.test(page)
}

export const extractHomepageCareerUrl = (html) => {
  for (const match of String(html ?? '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = toAbsoluteUrl(match[1], HOMEPAGE_URL)
    const label = stripTags(match[2])

    if (label?.toLowerCase() === 'careers' && href) {
      return href
    }
  }

  return null
}

export const hasOfficialCareersPageSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Work with us and Help us Raise The Bar \|\s*Dhan\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/dhan\.co\/career\/["']/i.test(page)
    && /Raise is a team of 550\+\s+and hiring more\./i.test(page)
    && /Apply now!/i.test(page)
    && /Explore Careers at Raise/i.test(page)
    && /href=["']https:\/\/dhan\.keka\.com\/careers\/["']/i.test(page)
    && /Explore on Linkedin/i.test(page)
}

export const extractOfficialCareersHandoffUrl = (html) => {
  for (const match of String(html ?? '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = toAbsoluteUrl(match[1], CAREERS_URL)
    const label = stripTags(match[2])

    if (/^Explore Careers at Raise$/i.test(label ?? '') && href) {
      return href
    }
  }

  return null
}

export const normalizeKekaJob = (record = {}) => {
  const title = normalizeWhitespace(record.title)
  const locationRecord = Array.isArray(record.jobLocations)
    ? record.jobLocations.find((location) => location?.countryCode === 'IN' || location?.countryName === 'India')
    : null
  const location = normalizeWhitespace(locationRecord?.name || locationRecord?.city)
  const city = getValidIndiaCityForJob({ location, country: locationRecord?.countryName || 'India' })
  const jobId = Number(record.id)

  if (!title || !location || !city || !Number.isFinite(jobId)) {
    return null
  }

  const applyUrl = `${KEKA_JOB_DETAILS_URL}${jobId}`
  return {
    title,
    company: COMPANY,
    department: normalizeWhitespace(record.departmentName),
    location,
    city,
    country: 'India',
    jobId: `${SOURCE}-${jobId}`,
    requisitionId: String(jobId),
    sourceUrl: applyUrl,
    applyUrl,
    employmentType: Number(record.jobType) === 2 ? 'Full-time' : null,
    workplaceType: null,
    experienceRequired: normalizeWhitespace(record.experience),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: Array.isArray(record.skillNames) ? record.skillNames.map(normalizeWhitespace).filter(Boolean) : [],
    postingDate: normalizeWhitespace(record.publishedOn),
    closingDate: null,
    jobDescription: stripTags(record.description),
  }
}

export const hasZappyhireBoardShell = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Careers\s*<\/title>/i.test(page)
    && /<base href=["']\/en\/["']>/i.test(page)
    && /<app-root><\/app-root>/i.test(page)
    && /https:\/\/utilities\.zappyhire\.com\/zoey\.js/i.test(page)
}

export const hasZappyhireConfigSignal = (payload = {}) => {
  const results = payload?.results ?? {}
  const filters = Array.isArray(results.career_filters) ? results.career_filters : []

  return payload?.status === 1
    && results.name === 'Dhan'
    && results.career_text_heading === 'Raise Careers'
    && results.website === 'https://raiseholding.co/'
    && results.linkedin === 'https://www.linkedin.com/company/raise-financial-services/jobs/'
    && filters.some((filter) => filter?.slug === 'departments' && filter?.filter === true)
    && filters.some((filter) => filter?.slug === 'locations' && filter?.filter === true)
    && filters.some((filter) => filter?.slug === 'job_types' && filter?.filter === true)
}

export const hasZappyhireFilterParamsSignal = (payload = {}) => {
  const results = payload?.results ?? {}
  const locations = Array.isArray(results.locations) ? results.locations : []
  const departments = Array.isArray(results.departments) ? results.departments : []
  const jobTypes = Array.isArray(results.job_types) ? results.job_types : []

  return payload?.status === 1
    && locations.includes('Mumbai')
    && departments.includes('Design')
    && jobTypes.some((jobType) => jobType?.value === 'full_time' && jobType?.label === 'Full Time')
}

export const isVerifiedBoardApi404Error = (error) => {
  const message = String(error?.message ?? error ?? '')

  return /HTTP 404\b/i.test(message)
    && VERIFIED_BOARD_API_404_PATHS.some((path) => message.includes(`${CAREERS_API_ORIGIN}${path}`))
}

const hasValidJobSearchPayloadShape = (payload = {}) =>
  payload?.status === 1
  && Number.isFinite(Number(payload?.results?.total?.value ?? 0))
  && Array.isArray(payload?.results?.hits)

export const extractJobHits = (payload = {}) => {
  if (!hasValidJobSearchPayloadShape(payload)) {
    throw new Error('Dhan verified jobs API payload changed materially')
  }

  return payload.results.hits
}

const extractTotalHits = (payload = {}) => Number(payload?.results?.total?.value ?? 0)

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (normalized === 'full time' || normalized === 'full-time') return 'Full-time'
  if (normalized === 'part time' || normalized === 'part-time') return 'Part-time'
  if (normalized === 'contract') return 'Contract'
  if (normalized === 'intern' || normalized === 'internship') return 'Internship'
  return normalizeWhitespace(value)
}

const buildJobDescription = (sourceRecord = {}) => {
  const fragments = []

  if (normalizeWhitespace(sourceRecord.entity)) {
    fragments.push(`Entity: ${normalizeWhitespace(sourceRecord.entity)}`)
  }

  if (normalizeWhitespace(sourceRecord.industry) && normalizeWhitespace(sourceRecord.industry) !== COMPANY) {
    fragments.push(`Industry: ${normalizeWhitespace(sourceRecord.industry)}`)
  }

  return fragments.join('\n') || null
}

export const normalizeZappyhireJob = (hit = {}) => {
  const sourceRecord = hit?._source ?? {}
  const jobNumber = sourceRecord.job
  const title = normalizeWhitespace(sourceRecord.title)
  const location = normalizeWhitespace(sourceRecord.location)
  const city = getValidIndiaCityForJob({
    location,
    country: 'India',
  })

  if (sourceRecord.client !== SOURCE || !title || !location || !city || !jobNumber) {
    return null
  }

  const applyUrl = buildApplyUrl(jobNumber)
  const postingTimestamp = Number(hit?.sort?.[0])
  const postingDate = Number.isFinite(postingTimestamp)
    ? new Date(postingTimestamp).toISOString()
    : null

  return {
    title,
    company: COMPANY,
    department: normalizeWhitespace(sourceRecord.department),
    location,
    city,
    country: 'India',
    jobId: `${SOURCE}-${jobNumber}`,
    requisitionId: String(jobNumber),
    sourceUrl: applyUrl,
    applyUrl,
    employmentType: normalizeEmploymentType(sourceRecord.job_type),
    workplaceType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate,
    closingDate: null,
    jobDescription: buildJobDescription(sourceRecord),
  }
}

export const createDhanScraper = ({
  pageSize = DEFAULT_PAGE_SIZE,
  maxPages = Number.POSITIVE_INFINITY,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchJson = defaultFetchJson,
    now: overrideNow,
  } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (
      homepage.status !== 200
      || !isAcceptedHomepageUrl(homepage.url)
      || !hasOfficialHomepageSignal(homepage.html)
    ) {
      throw new Error('Dhan verified homepage no longer matches the trusted first-party surface')
    }

    const homepageCareerUrl = extractHomepageCareerUrl(homepage.html)
    if (!sameUrl(homepageCareerUrl, CAREERS_URL)) {
      throw new Error('Dhan verified homepage careers navigation changed materially')
    }

    const careersPage = await fetchPage(CAREERS_URL)
    if (
      careersPage.status !== 200
      || !isAcceptedCareersUrl(careersPage.url)
      || !hasOfficialCareersPageSignal(careersPage.html)
    ) {
      throw new Error('Dhan verified careers page no longer matches the trusted first-party handoff surface')
    }

    const careersHandoffUrl = extractOfficialCareersHandoffUrl(careersPage.html)
    if (!sameUrl(careersHandoffUrl, 'https://dhan.keka.com/careers/')) {
      throw new Error('Dhan verified careers handoff changed materially')
    }

    const kekaJobs = await fetchJson(KEKA_JOBS_API_URL)
    if (!Array.isArray(kekaJobs)) {
      throw new Error('Dhan verified Keka jobs API changed materially')
    }

    const normalizedKekaJobs = kekaJobs.map(normalizeKekaJob).filter(Boolean)
    if (kekaJobs.length > 0 && normalizedKekaJobs.length === 0) {
      throw new Error('Dhan verified Keka jobs API no longer produces India jobs')
    }

    return normalizedKekaJobs.map((job) => ({
      ...job,
      source: SOURCE,
      companyDomain: PROVIDER_METADATA.companyDomain,
      atsPlatform: 'keka',
      companyCareerPage: CAREERS_URL,
      link: job.applyUrl,
      scrapedAt: (overrideNow || now)(),
    }))
  },
})

export const run = async (options = {}) => createDhanScraper(options).run(options)

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
