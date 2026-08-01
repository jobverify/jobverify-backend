import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { GOKWIK_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = GOKWIK_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const ABOUT_PAGE_URL = PROVIDER_METADATA.companyAboutPage
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const CAREER_PORTAL_INFO_URL = PROVIDER_METADATA.careerPortalInfoUrl
export const ACTIVE_JOBS_URL = PROVIDER_METADATA.activeJobsUrl
export const DEPARTMENTS_URL = PROVIDER_METADATA.departmentsUrl
export const EXPECTED_KEKA_DOMAIN = PROVIDER_METADATA.expectedKekaDomain
export const EXPECTED_IDENTIFIER = PROVIDER_METADATA.expectedIdentifier
export const COMPANY_DOMAIN = PROVIDER_METADATA.companyDomain
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#8211;|&#x2013;|&ndash;/gi, '-')
  .replace(/&#8212;|&#x2014;|&mdash;/gi, '-')
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(String(value))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripHtml = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/section|\/article|\/li|\/ul|\/ol|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<(p|div|section|article|li|ul|ol|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const normalizeDomain = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return normalized.endsWith('/') ? normalized : `${normalized}/`
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

const defaultFetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain,*/*',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    json: await response.json(),
  }
}

const CAREERS_LINK_PATTERN =
  /<a[^>]+href=["']([^"']+)["'][^>]*>\s*(?:JOIN OUR TEAM|Careers)\s*<\/a>/gi

const extractCareersUrlsFromAboutPage = (html = '') => Array.from(
  String(html ?? '').matchAll(CAREERS_LINK_PATTERN),
  (match) => normalizeWhitespace(match?.[1]),
).filter(Boolean)

export const extractCareersUrlFromAboutPage = (html = '') =>
  extractCareersUrlsFromAboutPage(html)[0] || null

export const hasOfficialAboutPageSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml) || ''

  return /<title>\s*GoKwik - Smart Checkout (?:&|&amp;) RTO Solutions for D2C Brands\s*<\/title>/i.test(rawHtml)
    && normalized.includes('We Are GoKwik')
    && normalized.includes('GoKwik is a D2C commerce growth platform')
    && normalized.includes('Life at GoKwik')
    && normalized.includes('GoKwik Commerce solutions private limited is not a payment aggregator.')
    && normalized.includes('Trusted. Certified. Secure.')
    && extractCareersUrlsFromAboutPage(rawHtml).length > 0
}

export const hasExpectedCareerPortalInfo = (info = {}) => {
  if (info == null || typeof info !== 'object' || Array.isArray(info)) return false

  const filters = Array.isArray(info.jobListingSetting?.filters)
    ? info.jobListingSetting.filters.map((value) => normalizeWhitespace(value)).filter(Boolean)
    : []
  const fields = Array.isArray(info.jobListingSetting?.jobFields)
    ? info.jobListingSetting.jobFields.map((value) => normalizeWhitespace(value)).filter(Boolean)
    : []

  return String(info.careersPortalDomain || '').toLowerCase() === 'gokwik.keka.com'
    && normalizeWhitespace(info.name) === 'GoKwik Commerce Solutions Pvt. Ltd.'
    && normalizeWhitespace(info.shortName) === 'GoKwik Commerce Solutions Pvt. Ltd.'
    && normalizeWhitespace(info.companyWebsite) === HOMEPAGE_URL
    && normalizeWhitespace(info.fontFamily) === 'Montserrat'
    && filters.includes('department')
    && filters.includes('location')
    && fields.includes('location')
    && fields.includes('experience')
    && fields.includes('jobType')
}

const normalizePostingDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

const isIndiaLocation = (location = {}) => {
  const countryCode = String(location.countryCode ?? location.country?.code ?? '').toUpperCase()
  const countryName = normalizeWhitespace(location.countryName ?? location.country?.name)

  return countryCode === 'IN' || countryName?.toLowerCase() === 'india'
}

const locationLabel = (location = {}) => {
  const name = normalizeWhitespace(location.name)
  const city = normalizeWhitespace(location.city)
  const base = city || name || 'India'

  if (/remote/i.test(base)) return 'Remote, India'
  return /india/i.test(base) ? base : `${base}, India`
}

const primaryCity = (location = {}) =>
  normalizeWhitespace(location.city) || normalizeWhitespace(location.name) || null

const toEmploymentType = (jobType) => (jobType === 2 || jobType === '2' ? 'Full Time' : null)

const departmentMap = (payload = []) => {
  const map = new Map()

  for (const department of Array.isArray(payload) ? payload : []) {
    const name = normalizeWhitespace(department?.name)
    const identifier = normalizeWhitespace(department?.identifier)
    const id = normalizeWhitespace(department?.id)

    if (!name) continue
    if (identifier) map.set(identifier, name)
    if (id) map.set(id, name)
  }

  return map
}

const buildJobDetailUrl = (jobId) => `${EXPECTED_KEKA_DOMAIN}jobdetails/${jobId}`
const buildApplyUrl = (jobId) => `${EXPECTED_KEKA_DOMAIN}applyjob/${jobId}`

const mapJob = (job, departmentsByIdentifier) => {
  const jobId = normalizeWhitespace(job?.id)
  const title = normalizeWhitespace(job?.title)
  const indiaLocation = (Array.isArray(job?.jobLocations) ? job.jobLocations : []).find(isIndiaLocation)

  if (!jobId || !title || !indiaLocation) return null

  const departmentKey =
    normalizeWhitespace(job.departmentIdentifier)
    || normalizeWhitespace(job.departmentId)
    || normalizeWhitespace(job.department?.identifier)
    || normalizeWhitespace(job.department?.id)

  return {
    title,
    company: COMPANY,
    department: departmentsByIdentifier.get(departmentKey) || normalizeWhitespace(job.departmentName),
    location: locationLabel(indiaLocation),
    city: primaryCity(indiaLocation),
    country: 'India',
    jobId,
    requisitionId: normalizeWhitespace(job.jobNumber) || jobId,
    sourceUrl: buildJobDetailUrl(jobId),
    applyUrl: buildApplyUrl(jobId),
    employmentType: toEmploymentType(job.jobType),
    experienceRequired: normalizeWhitespace(job.experience),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: Array.isArray(job.skillNames)
      ? job.skillNames.map((skill) => normalizeWhitespace(skill)).filter(Boolean)
      : [],
    postingDate: normalizePostingDate(job.publishedOn),
    closingDate: null,
    jobDescription: stripHtml(job.description) || normalizeWhitespace(job.excerpt),
    remoteStatus: /remote/i.test(locationLabel(indiaLocation)) ? 'Remote' : 'On-site',
    compensation: normalizeWhitespace(job.salaryRangeFormat),
  }
}

export const extractSearchResults = (payload, departments = []) => {
  if (!Array.isArray(payload)) return []

  const departmentsByIdentifier = departments instanceof Map
    ? departments
    : departmentMap(departments)

  return payload
    .map((job) => mapJob(job, departmentsByIdentifier))
    .filter(Boolean)
}

export const createGoKwikScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchPage = defaultFetchPage, fetchJson = defaultFetchJson, now: nowOverride } = {}) {
    const aboutPage = await fetchPage(ABOUT_PAGE_URL)
    if (
      aboutPage.status !== 200
      || !sameUrl(aboutPage.url, ABOUT_PAGE_URL)
      || !hasOfficialAboutPageSignal(aboutPage.html)
    ) {
      throw new Error('GoKwik verified about page no longer matches the known first-party surface')
    }

    const careersUrls = extractCareersUrlsFromAboutPage(aboutPage.html)
    if (careersUrls.length === 0 || careersUrls.some((url) => !sameUrl(url, CAREERS_URL))) {
      throw new Error('GoKwik verified careers handoff no longer matches the known Keka board')
    }

    const portalInfo = await fetchJson(CAREER_PORTAL_INFO_URL)
    if (
      portalInfo.status !== 200
      || !sameUrl(portalInfo.url, CAREER_PORTAL_INFO_URL)
      || !hasExpectedCareerPortalInfo(portalInfo.json)
    ) {
      throw new Error('GoKwik verified career portal info no longer matches the known public surface')
    }

    const activeJobs = await fetchJson(ACTIVE_JOBS_URL)
    if (
      activeJobs.status !== 200
      || !sameUrl(activeJobs.url, ACTIVE_JOBS_URL)
      || !Array.isArray(activeJobs.json)
    ) {
      throw new Error('GoKwik verified active jobs feed no longer matches the known public surface')
    }

    const departments = await fetchJson(DEPARTMENTS_URL)
    if (
      departments.status !== 200
      || !sameUrl(departments.url, DEPARTMENTS_URL)
      || !Array.isArray(departments.json)
    ) {
      throw new Error('GoKwik verified departments feed no longer matches the known public surface')
    }

    const scrapedAt = (nowOverride || now)()

    return extractSearchResults(activeJobs.json, departments.json).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt,
    }))
  },
})

export const run = async (options = {}) => createGoKwikScraper(options).run(options)

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
