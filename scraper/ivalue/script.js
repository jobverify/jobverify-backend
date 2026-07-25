import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../utils/loadConfig.js'
import { IVALUE_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = IVALUE_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const OFFICIAL_CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const LEGACY_OFFICIAL_CAREERS_URL = PROVIDER_METADATA.legacyCareerPageUrl
export const JOBS_PAGE_URL = PROVIDER_METADATA.verifiedPublicJobsPageUrl
export const COMPANY_DETAILS_URL = PROVIDER_METADATA.companyDetailsUrl
export const EMPLOYMENT_CATEGORIES_URL = PROVIDER_METADATA.employmentCategoriesUrl
export const JOBS_API_URL = PROVIDER_METADATA.jobsApiUrl

const FOREIGN_LOCATION_NAMES = new Set([
  'Singapore',
  'Bangladesh',
  'Cambodia',
  'Srilanka',
  'Nepal',
  'Kenya',
  'Dubai',
  'UAE',
  'Vietnam',
  'Philippines',
  'Thailand',
])

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#038;|&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
    .replace(/&#8211;|&#8212;|&#x2013;|&#x2014;|&ndash;|&mdash;/gi, '-')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTagsPreservingLines = (value) =>
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')

const stripTags = (value) => normalizeWhitespace(stripTagsPreservingLines(value))

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

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: createTimeoutSignal(20000),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

const defaultFetchJson = async (url, options = {}) => {
  const method = options.method || 'GET'
  const body = method === 'POST' ? JSON.stringify(options.body ?? {}) : undefined
  const response = await fetch(url, {
    method,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain,*/*',
      ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
    },
    body,
    redirect: 'follow',
    signal: createTimeoutSignal(20000),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

const monthsToYearsLabel = (months) => {
  if (!Number.isFinite(months) || months <= 0) return null

  const years = months / 12
  const rounded = Number.isInteger(years) ? years.toString() : years.toFixed(1).replace(/\.0$/, '')
  return `${rounded} years`
}

const extractExperienceRequired = (job) => {
  const min = Number(job?.min_exp)
  const max = Number(job?.max_exp)

  if ((!Number.isFinite(min) || min <= 0) && (!Number.isFinite(max) || max <= 0)) {
    return null
  }

  const minLabel = monthsToYearsLabel(min)
  const maxLabel = monthsToYearsLabel(max)

  if (minLabel && maxLabel) {
    return `${minLabel.replace(' years', '')}-${maxLabel}`
  }

  return minLabel || maxLabel
}

const extractLocationFromDescription = (description) => {
  const text = stripTagsPreservingLines(description)
  const patterns = [
    /Job Location\s*:?\s*([^\n]+)/i,
    /Work Location\s*:?\s*([^\n]+)/i,
    /Location\s*:?\s*([^\n]+)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    const location = normalizeWhitespace(match?.[1])
    if (location) return location.replace(/\s*\/\s*/g, ', ')
  }

  return null
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null

  const [firstSegment] = normalized.split(',')
  return normalizeWhitespace(firstSegment)
}

const isIndiaLocationName = (name) => {
  const normalized = normalizeWhitespace(name)
  return Boolean(normalized) && !FOREIGN_LOCATION_NAMES.has(normalized)
}

const isIndiaJob = (locationNames, description) => {
  const normalizedNames = (Array.isArray(locationNames) ? locationNames : [])
    .map((name) => normalizeWhitespace(name))
    .filter(Boolean)

  if (normalizedNames.length > 0) {
    return normalizedNames.some((name) => isIndiaLocationName(name))
  }

  const fallbackLocation = extractLocationFromDescription(description)
  if (!fallbackLocation) return false

  return !Array.from(FOREIGN_LOCATION_NAMES).some((name) => new RegExp(`\\b${name}\\b`, 'i').test(fallbackLocation))
}

export const hasOfficialCareersBlockSignal = (html = '') => {
  const page = String(html ?? '')

  return /noindex,\s*nofollow/i.test(page)
    && /_Incapsula_Resource/i.test(page)
    && /Incapsula/i.test(page)
}

export const hasPublicJobsPageSignal = (html = '') => {
  const page = String(html ?? '')

  return /<title>\s*Jobs at iValue Group\s*<\/title>/i.test(page)
    && /property=["']og:url["'][^>]*content=["']https:\/\/ivgroup\.greythr\.com\/hire\/jobs\/?["']/i.test(page)
    && /careerbuild(?:\.[a-f0-9]+)?\.js/i.test(page)
}

export const hasCompanyDetailsSignal = (payload = {}) => {
  const companyName = normalizeWhitespace(payload?.company_name)
  const website = normalizeWhitespace(payload?.other_details?.website)
  const linkedIn = normalizeWhitespace(payload?.other_details?.social?.in)

  return companyName === 'iValue Group'
    && /ivaluegroup\.com/i.test(website || '')
    && /linkedin\.com\/company\/ivalue-group/i.test(linkedIn || '')
}

export const buildLocationLookup = (payload = {}) => {
  const locationCategoryId = normalizeWhitespace(payload?.cat_extfield?.location)
  const values = payload?.value

  if (!locationCategoryId || !values || typeof values !== 'object') {
    throw new Error('iValue verified GreytHR employment category catalog changed materially')
  }

  const lookup = {}

  for (const [id, value] of Object.entries(values)) {
    if (normalizeWhitespace(value?.cat_id) !== locationCategoryId) continue

    const name = normalizeWhitespace(value?.name)
    if (name) {
      lookup[id] = name
    }
  }

  if (Object.keys(lookup).length === 0) {
    throw new Error('iValue verified GreytHR employment category catalog changed materially')
  }

  return lookup
}

const mapJob = (job, locationLookup, scrapedAt) => {
  const locationNames = (Array.isArray(job?.locations) ? job.locations : [])
    .map((id) => locationLookup[String(id)])
    .map((name) => normalizeWhitespace(name))
    .filter(Boolean)

  if (!isIndiaJob(locationNames, job?.description)) {
    return null
  }

  const location = locationNames.length > 0
    ? locationNames.join(', ')
    : extractLocationFromDescription(job?.description)

  return {
    title: normalizeWhitespace(job?.title),
    company: COMPANY,
    department: null,
    location,
    city: extractCity(location),
    country: 'India',
    jobId: normalizeWhitespace(job?.id),
    requisitionId: normalizeWhitespace(job?.req_id),
    sourceUrl: normalizeWhitespace(job?.apply_url),
    applyUrl: normalizeWhitespace(job?.apply_url),
    employmentType: normalizeWhitespace(job?.job_type),
    experienceRequired: extractExperienceRequired(job),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: normalizeWhitespace(job?.published_on_career_page || job?.created_at),
    closingDate: null,
    jobDescription: stripTags(job?.description),
    remoteStatus: job?.is_remote ? 'Remote' : 'On-site',
    source: SOURCE,
    link: normalizeWhitespace(job?.apply_url),
    scrapedAt,
  }
}

export const createIValueScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    const legacyOfficialHtml = await fetchText(LEGACY_OFFICIAL_CAREERS_URL)
    if (!hasOfficialCareersBlockSignal(legacyOfficialHtml)) {
      throw new Error('The official iValue careers surface changed materially')
    }

    const officialCareersHtml = await fetchText(OFFICIAL_CAREERS_URL)
    if (!hasOfficialCareersBlockSignal(officialCareersHtml)) {
      throw new Error('The official iValue careers surface changed materially')
    }

    const jobsPageHtml = await fetchText(JOBS_PAGE_URL)
    if (!hasPublicJobsPageSignal(jobsPageHtml)) {
      throw new Error('The verified public GreytHR jobs page changed materially')
    }

    const companyDetails = await fetchJson(COMPANY_DETAILS_URL, { method: 'GET' })
    if (!hasCompanyDetailsSignal(companyDetails)) {
      throw new Error('The verified iValue GreytHR company details changed materially')
    }

    const employmentCategories = await fetchJson(EMPLOYMENT_CATEGORIES_URL, { method: 'GET' })
    const locationLookup = buildLocationLookup(employmentCategories)

    const payload = await fetchJson(JOBS_API_URL, {
      method: 'POST',
      body: {},
    })

    const rawJobs = Array.isArray(payload?.data) ? payload.data : []
    const scrapedAt = now()
    const mappedJobs = rawJobs
      .map((job) => mapJob(job, locationLookup, scrapedAt))
      .filter((job) => job?.title && job?.applyUrl)

    return maxJobs ? mappedJobs.slice(0, maxJobs) : mappedJobs
  },
})

export const run = async (options = {}) => createIValueScraper().run(options)

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
