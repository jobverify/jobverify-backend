import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'

import { MOTILAL_OSWAL_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = MOTILAL_OSWAL_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const CAREERS_PAGE_URL = PROVIDER_METADATA.companyCareerPage
export const TURBOHIRE_BOARD_URL = PROVIDER_METADATA.handoffBoardUrl
export const ORIGIN = 'https://motilaloswal.turbohire.co'
export const ORG_ID = PROVIDER_METADATA.turboHireOrgId
export const API_BASE_URL = 'https://thapi.azurewebsites.net'
export const NOAUTH_TOKEN_URL = `${API_BASE_URL}/api/token/noauth`
export const FILTERED_JOBS_URL = `${API_BASE_URL}/api/careerpagev2/filteredjobs?orgId=${ORG_ID}&pageType=0`

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const LIVE_FILTER_BODY = {
  SortByV2: { Key: 'PostedDate', Order: 2 },
  BunitIds: { Value: null, FilterType: 0 },
  Experience: { Value: null, FilterType: 0 },
  JobTypes: { Value: null, FilterType: 0 },
  JobTypeV2: { Value: null, FilterType: 0 },
  Locations: { Value: null, FilterType: 0 },
  CreatedDate: { Value: null, FilterType: 0 },
  Compensation: { Value: null, FilterType: 0 },
  Skills: { Value: null, FilterType: 0 },
  Keyword: '',
  ClientIds: { Value: null, FilterType: 0 },
  Department: '',
  CustomFields: {},
}

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

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

const parseLocations = (value) => {
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const ensureIndiaLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return /\bindia\b/i.test(normalized) ? normalized : `${normalized}, India`
}

const extractPrimaryLocation = (value) => ensureIndiaLocation(parseLocations(value)[0]?.Address)

const extractCity = (location) => normalizeWhitespace(String(location ?? '').split(',')[0]) || null

const formatExperience = (experience = {}) => {
  const min = Number.isFinite(experience?.MinExp) ? experience.MinExp : null
  const max = Number.isFinite(experience?.MaxExp) ? experience.MaxExp : null

  if (min != null && max != null) {
    if (min === max) return `${min} year${min === 1 ? '' : 's'}`
    return `${min}-${max} years`
  }

  if (min != null) return `${min}+ years`
  if (max != null) return `Up to ${max} years`
  return null
}

const buildPublicJobUrl = (jobIdObfuscated) =>
  jobIdObfuscated ? `${ORIGIN}/job/publicjobs/${jobIdObfuscated}` : null

const buildPublicHeaders = (accessToken = null) => {
  const headers = {
    Origin: ORIGIN,
    Referer: TURBOHIRE_BOARD_URL,
    'User-Agent': USER_AGENT,
    Accept: 'application/json, text/plain, */*',
  }

  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  return headers
}

export const hasOfficialCareersPageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = stripTags(rawHtml) || ''

  return /<title>\s*Career Growth Opportunities\s*\|\s*MOFSL\s*<\/title>/i.test(rawHtml)
    && /view opportunities/i.test(normalized)
    && /https:\/\/motilaloswal\.turbohire\.co\/?/i.test(rawHtml)
}

export const extractTurboHireHandoffUrl = (html) =>
  normalizeWhitespace(String(html ?? '').match(/href=["'](https:\/\/motilaloswal\.turbohire\.co\/?)["']/i)?.[1])

export const hasOfficialBoardSignal = (html) => {
  const rawHtml = String(html ?? '')

  return /<title>\s*Motilal Oswal Financial Services Ltd\s*<\/title>/i.test(rawHtml)
    && /property=["']og:title["'][^>]+content=["']Motilal Oswal Financial Services Ltd - Career Page["']/i.test(rawHtml)
    && /You need to enable JavaScript to run this app\./i.test(rawHtml)
}

export const buildFilteredJobsRequestBody = () => JSON.stringify(LIVE_FILTER_BODY)

export const extractPublicJobs = (payload = {}) =>
  (Array.isArray(payload?.Result) ? payload.Result : [])
    .map((record) => {
      const title = normalizeWhitespace(record?.JobTitle)
      const location = extractPrimaryLocation(record?.Location)
      const sourceUrl = buildPublicJobUrl(normalizeWhitespace(record?.JobIdObfuscated))
      const orgId = normalizeWhitespace(record?.OrgDetails?.OrgID)

      if (!title || !location || !sourceUrl) return null
      if (!/\bindia\b/i.test(location)) return null
      if (orgId !== ORG_ID) return null

      return {
        title,
        company: COMPANY_NAME,
        department: normalizeWhitespace(record?.Department),
        location,
        city: extractCity(location),
        country: 'India',
        jobId: normalizeWhitespace(record?.JobId),
        requisitionId: normalizeWhitespace(record?.JobCode) || normalizeWhitespace(record?.JobId),
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: normalizeWhitespace(record?.JobTypeV2) || null,
        experienceRequired: formatExperience(record?.Experience),
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: Array.isArray(record?.Skills)
          ? record.Skills.map((skill) => normalizeWhitespace(skill)).filter(Boolean)
          : [],
        postingDate: normalizeWhitespace(record?.PublishedDate),
        closingDate: normalizeWhitespace(record?.ExpiryDates?.CAREERPAGE),
        jobDescription: stripTags(record?.JobDescV2),
      }
    })
    .filter(Boolean)

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

const defaultFetchJson = (url, options = {}) => fetchJsonWithRetry(url, {
  method: options.method || 'GET',
  headers: options.headers,
  body: options.body,
  label: SOURCE,
  timeoutMs: 15000,
})

export const createMotilalOswalScraper = ({
  fetchPage = defaultFetchPage,
  fetchJson = defaultFetchJson,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run() {
    const careersPage = await fetchPage(CAREERS_PAGE_URL)
    if (
      careersPage.status !== 200
      || !sameUrl(careersPage.url, CAREERS_PAGE_URL)
      || !hasOfficialCareersPageSignal(careersPage.html)
    ) {
      throw new Error('Motilal Oswal verified official careers page changed materially')
    }

    const handoffUrl = extractTurboHireHandoffUrl(careersPage.html)
    if (!sameUrl(handoffUrl, TURBOHIRE_BOARD_URL)) {
      throw new Error('Motilal Oswal verified official careers page no longer links to the verified TurboHire board')
    }

    const boardPage = await fetchPage(TURBOHIRE_BOARD_URL)
    if (
      boardPage.status !== 200
      || !sameUrl(boardPage.url, TURBOHIRE_BOARD_URL)
      || !hasOfficialBoardSignal(boardPage.html)
    ) {
      throw new Error('Motilal Oswal verified TurboHire board changed materially')
    }

    const tokenPayload = await fetchJson(NOAUTH_TOKEN_URL, {
      method: 'GET',
      headers: buildPublicHeaders(),
    })

    const listingsPayload = await fetchJson(FILTERED_JOBS_URL, {
      method: 'POST',
      headers: {
        ...buildPublicHeaders(tokenPayload?.access_token),
        'Content-Type': 'application/json',
      },
      body: buildFilteredJobsRequestBody(),
    })

    const scrapedAt = now()

    return extractPublicJobs(listingsPayload).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt,
    }))
  },
})

export const run = async (options = {}) => createMotilalOswalScraper(options).run()

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
