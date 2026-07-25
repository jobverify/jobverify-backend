import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../utils/loadConfig.js'
import { fetchJsonWithRetry } from '../utils/fetch.js'
import { withRetry } from '../utils/retry.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'cleartrip'
export const COMPANY = 'Cleartrip'
export const OFFICIAL_JOBS_URL = 'https://www.cleartrip.com/jobs'
export const CAREERS_URL = 'https://careers.cleartrip.com/'
export const ORIGIN = 'https://flipkart.turbohire.co'
export const ORG_ID = '4d757ba0-3d57-448a-b82c-238ed87ac90f'
export const BOARD_URL = `${ORIGIN}/careerpage/${ORG_ID}`
export const API_BASE_URL = 'https://thapi.azurewebsites.net'
export const NOAUTH_TOKEN_URL = `${API_BASE_URL}/api/token/noauth`
export const PUBLIC_ORG_URL = `${API_BASE_URL}/api/publicorganizations/${ORG_ID}`
export const FILTERED_JOBS_URL = `${API_BASE_URL}/api/careerpagev2/filteredjobs?orgId=${ORG_ID}&pageType=0`

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'

const DEFAULT_API_HEADERS = {
  Origin: ORIGIN,
  Referer: `${ORIGIN}/`,
  'User-Agent': USER_AGENT,
  Accept: 'application/json, text/plain, */*',
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
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
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

const parseLocations = (value) => {
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const normalizeLocation = (value) => normalizeWhitespace(value)?.replace(/\s*,\s*/g, ', ') || null

const extractPrimaryLocation = (value) => normalizeLocation(parseLocations(value)[0]?.Address)

const extractCity = (location) => normalizeLocation(location)?.split(',')[0] || null

const isIndiaLocation = (location) => /\bindia\b/i.test(normalizeWhitespace(location) || '')

const buildPublicJobUrl = (jobIdObfuscated) => (
  jobIdObfuscated
    ? `${ORIGIN}/job/publicjobs/${jobIdObfuscated}`
    : null
)

const buildAuthenticatedHeaders = (accessToken = null) => {
  const headers = { ...DEFAULT_API_HEADERS }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  return headers
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return /<title>\s*Cleartrip\s*\|\s*Careers\s*<\/title>/i.test(page)
    && /What\s+Cleartrippers\s+say/i.test(page)
    && /Featured\s+jobs\s+for\s+you/i.test(page)
    && /To make travel so accessible and affordable through technology/i.test(page)
}

const isVerifiedCareersUrl = (value) => {
  try {
    const url = new URL(value)
    return url.origin === 'https://careers.cleartrip.com'
  } catch {
    return false
  }
}

export const extractTurboHireHandoffUrl = (html) => {
  const match = String(html ?? '').match(
    /href=["'](https:\/\/flipkart\.turbohire\.co\/careerpage\/4d757ba0-3d57-448a-b82c-238ed87ac90f)["']/i,
  )
  return normalizeWhitespace(match?.[1]) || null
}

export const extractVerifiedDomains = (payload = {}) => {
  const raw = payload?.OrgVerifiedDomains

  if (Array.isArray(raw)) {
    return raw.map((value) => normalizeWhitespace(value)?.toLowerCase()).filter(Boolean)
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed)
        ? parsed.map((value) => normalizeWhitespace(value)?.toLowerCase()).filter(Boolean)
        : []
    } catch {
      return []
    }
  }

  return []
}

export const hasVerifiedPublicOrgSignal = (payload = {}) => {
  const verifiedDomains = extractVerifiedDomains(payload)

  return payload?.OrgID === ORG_ID
    && normalizeWhitespace(payload?.OrgName) === 'Flipkart Internet Private Limited'
    && normalizeWhitespace(payload?.CareerPageSubdomain)?.toLowerCase() === 'flipkart'
    && payload?.IsCareerPagePublished === true
    && verifiedDomains.includes('@cleartrip.com')
    && verifiedDomains.includes('@flipkart.com')
  }

export const buildFilteredJobsRequestBody = () => JSON.stringify({
  BunitIds: { Value: null, FilterType: 0 },
  Experience: { Value: null, FilterType: 0 },
  JobTypes: { Value: null, FilterType: 0 },
  Locations: { Value: null, FilterType: 0 },
  CreatedDate: { Value: null, FilterType: 0 },
  Compensation: { Value: null, FilterType: 0 },
  Skills: { Value: null, FilterType: 0 },
  Keyword: '',
  ClientIds: { Value: null, FilterType: 0 },
  Department: '',
  SortByV2: { Key: 'AtoZ', Order: 2 },
})

const hasCleartripSignal = (record = {}) => {
  const signalText = [
    record?.JobTitle,
    record?.Department,
    record?.JobDescV2,
    Array.isArray(record?.Skills) ? record.Skills.join(' ') : '',
    record?.CreatedByEmail,
  ]
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean)
    .join(' ')

  return /\bcleartrip\b/i.test(signalText)
}

export const extractCleartripJobs = (payload = {}) =>
  (Array.isArray(payload?.Result) ? payload.Result : [])
    .map((record) => {
      const title = normalizeWhitespace(record?.JobTitle)
      const location = extractPrimaryLocation(record?.Location)
      const sourceUrl = buildPublicJobUrl(normalizeWhitespace(record?.JobIdObfuscated))

      if (!title || !location || !sourceUrl) return null
      if (!isIndiaLocation(location)) return null
      if (!hasCleartripSignal(record)) return null

      return {
        title,
        company: COMPANY,
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

const defaultFetchPage = (url) => withRetry(async () => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: createTimeoutSignal(20000),
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

const defaultFetchJson = async (url, options = {}) =>
  fetchJsonWithRetry(url, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body,
    timeoutMs: 20000,
    label: `${SOURCE} api`,
  })

export const createCleartripScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchPage = options.fetchPage || defaultFetchPage
    const fetchJson = options.fetchJson || defaultFetchJson
    const now = options.now || (() => new Date().toISOString())

    const careersPage = await fetchPage(OFFICIAL_JOBS_URL)
    if (
      careersPage?.status !== 200
      || !isVerifiedCareersUrl(careersPage?.url)
      || !hasOfficialCareersSignal(careersPage?.html)
    ) {
      throw new Error('Cleartrip official careers surface changed; refusing to guess the public jobs source')
    }

    const handoffUrl = extractTurboHireHandoffUrl(careersPage.html)
    if (handoffUrl !== BOARD_URL) {
      throw new Error('Cleartrip verified TurboHire handoff changed; refusing to trust the parent-company board')
    }

    const tokenPayload = await fetchJson(NOAUTH_TOKEN_URL, {
      method: 'GET',
      headers: buildAuthenticatedHeaders(),
    })

    const publicOrgPayload = await fetchJson(PUBLIC_ORG_URL, {
      method: 'GET',
      headers: buildAuthenticatedHeaders(tokenPayload?.access_token),
    })

    if (!hasVerifiedPublicOrgSignal(publicOrgPayload)) {
      throw new Error('Cleartrip verified public organization signal changed; refusing to trust the parent-company handoff')
    }

    const listingsPayload = await fetchJson(FILTERED_JOBS_URL, {
      method: 'POST',
      headers: {
        ...buildAuthenticatedHeaders(tokenPayload?.access_token),
        'Content-Type': 'application/json',
      },
      body: buildFilteredJobsRequestBody(),
    })

    const jobs = extractCleartripJobs(listingsPayload).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))

    return maxJobs ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async (options = {}) => createCleartripScraper().run(options)

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
