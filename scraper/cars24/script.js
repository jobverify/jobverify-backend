import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCity } from '../utils/cityNormalizer.js'
import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'cars24'
export const COMPANY = 'Cars24'
export const OFFICIAL_CAREERS_URL = 'https://www.cars24.com/careers/'
export const DEDICATED_CAREERS_URL = 'https://careers.cars24.com/'
export const JOBS_API_URL = 'https://api.cars24.com/gw/plt/bffsvc/api/jobs'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const DETAIL_CONCURRENCY = 2

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201C\u201D]/g, '"')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripHtml = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const uniqueStrings = (values = []) => {
  const seen = new Set()
  const normalizedValues = []

  for (const value of values) {
    const normalized = normalizeWhitespace(value)
    if (!normalized) continue

    const key = normalized.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    normalizedValues.push(normalized)
  }

  return normalizedValues
}

const splitLocationLabel = (value) => normalizeWhitespace(value)
  ?.split(',')
  ?.map((part) => normalizeWhitespace(part))
  ?.filter(Boolean)
  || []

const extractLocationSummary = (locationCities = [], locations = [], country = null) => {
  const cities = uniqueStrings(locationCities)
  if (cities.length) {
    return cities.join(', ')
  }

  const locationLabels = uniqueStrings(locations)
    .flatMap((value) => splitLocationLabel(value).slice(0, 1))
  const normalizedLocationLabels = uniqueStrings(locationLabels)

  if (normalizedLocationLabels.length) {
    return normalizedLocationLabels.join(', ')
  }

  return normalizeWhitespace(country)
}

const extractPrimaryCity = (locationCities = [], locations = []) => {
  const cityCandidate = uniqueStrings(locationCities)[0]
    || uniqueStrings(locations)
      .flatMap((value) => splitLocationLabel(value).slice(0, 1))[0]
    || null

  return normalizeCity(cityCandidate)
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (normalized.includes('intern') || normalized.includes('apprentice')) return 'Internship'
  if (normalized.includes('contract') || normalized.includes('temporary') || normalized === 'tpm') {
    return 'Contract'
  }
  if (normalized.includes('permanent') || normalized.includes('full')) return 'Full-time'
  return normalizeWhitespace(value)
}

const formatExperienceRange = (from, to, unit = 'Years') => {
  const normalizedFrom = normalizeWhitespace(from)
  const normalizedTo = normalizeWhitespace(to)
  const normalizedUnit = normalizeWhitespace(unit) || 'Years'

  if (normalizedFrom && normalizedTo) {
    if (normalizedFrom === normalizedTo) {
      return `${normalizedFrom} ${normalizedUnit}`
    }

    return `${normalizedFrom}-${normalizedTo} ${normalizedUnit}`
  }

  if (normalizedFrom) {
    return `${normalizedFrom}+ ${normalizedUnit}`
  }

  return null
}

const extractRoleTeam = (record = {}) =>
  normalizeWhitespace(record.department)
  || normalizeWhitespace(record.parent_department)
  || 'General'

const extractRoleFocus = (record = {}) =>
  normalizeWhitespace(record.business_unit)
  || normalizeWhitespace(record.department)
  || 'General'

const isIndiaJobRecord = (record = {}) => {
  const country = normalizeWhitespace(record.location_country)?.toLowerCase()
  if (country) {
    return country === 'india'
  }

  const locations = uniqueStrings(record.location)
  return locations.some((value) => /\bindia\b/i.test(value))
}

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  ?.replace(/[^a-z0-9]+/g, '-')
  ?.replace(/^-+|-+$/g, '')
  || null

export const buildJobDetailApiUrl = (jobId) =>
  `${JOBS_API_URL}/${encodeURIComponent(String(jobId ?? '').trim())}`

export const buildRoleUrl = ({
  jobId,
  title,
  team,
  location,
  type,
  focus,
} = {}) => {
  const slug = slugify(title)
  if (!slug) return null

  const params = new URLSearchParams()
  if (title) params.set('title', title)
  if (team) params.set('team', team)
  if (location) params.set('location', location)
  if (type) params.set('type', type)
  if (focus) params.set('focus', focus)
  if (jobId) params.set('id', jobId)

  return `${DEDICATED_CAREERS_URL}${slug}/?${params.toString()}`
}

export const extractDedicatedCareersUrl = (html) => {
  const match = String(html ?? '').match(/href=["'](https:\/\/careers\.cars24\.com\/?[^"']*)["']/i)
  if (!match?.[1]) return null

  try {
    const url = new URL(match[1])
    return `${url.origin}/`
  } catch {
    return null
  }
}

export const hasOfficialCompanyCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = stripHtml(page) || ''

  return /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.cars24\.com\/careers\/["']/i.test(page)
    && /Join us in the Essential Revolution/i.test(text)
    && /Explore roles/i.test(text)
    && extractDedicatedCareersUrl(page) === DEDICATED_CAREERS_URL
}

export const hasOfficialJobsSiteSignal = (html) => {
  const page = String(html ?? '')
  const text = stripHtml(page) || ''

  return /<title>\s*Cars24 Careers\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/careers\.cars24\.com\/["']/i.test(page)
    && /NOINDEX,NOFOLLOW/i.test(page)
    && /Choose your grind/i.test(text)
    && /id=["']rolesList["']/i.test(page)
}

export const hasVerifiedJobsFeedShape = (payload) =>
  Number(payload?.status) === 1
  && Array.isArray(payload?.data)

export const hasVerifiedJobDetailShape = (payload) =>
  Number(payload?.status) === 1
  && payload?.data != null
  && Boolean(
    normalizeWhitespace(payload?.data?.job_title)
    || normalizeWhitespace(payload?.data?.designation)
    || normalizeWhitespace(payload?.data?.designation_code),
  )

const isTransientDetailEnrichmentError = (error) => /HTTP 429\b|HTTP 5\d\d\b|fetch failed|timed out|aborted due to timeout/i
  .test(String(error?.message ?? ''))

const buildJobFromListing = (entry, { scrapedAt } = {}) => {
  const title = normalizeWhitespace(entry?.job_title)
  const jobId = normalizeWhitespace(entry?.job_id)
  const team = extractRoleTeam(entry)
  const location = extractLocationSummary(entry?.location_city, entry?.location, entry?.location_country)
  const roleUrl = buildRoleUrl({
    jobId,
    title,
    team,
    location,
    type: normalizeWhitespace(entry?.employee_type),
    focus: extractRoleFocus(entry),
  })

  if (!title || !jobId || !location || !roleUrl) {
    return null
  }

  return {
    title,
    company: COMPANY,
    department: normalizeWhitespace(entry?.department),
    location,
    city: extractPrimaryCity(entry?.location_city, entry?.location),
    country: normalizeWhitespace(entry?.location_country) || 'India',
    jobId,
    requisitionId: normalizeWhitespace(entry?.designation_code)
      || normalizeWhitespace(entry?.job_code)
      || jobId,
    sourceUrl: roleUrl,
    applyUrl: roleUrl,
    employmentType: normalizeEmploymentType(entry?.employee_type),
    experienceRequired: formatExperienceRange(
      entry?.experience_from,
      entry?.experience_to,
      entry?.unit_experience,
    ),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: normalizeWhitespace(entry?.job_updated_timestamp)
      || normalizeWhitespace(entry?.job_created_timestamp),
    closingDate: null,
    jobDescription: null,
    source: SOURCE,
    link: roleUrl,
    scrapedAt,
  }
}

export const extractJobsFromFeed = (payload, { scrapedAt } = {}) => {
  if (!hasVerifiedJobsFeedShape(payload)) {
    return []
  }

  return payload.data
    .filter((entry) => isIndiaJobRecord(entry))
    .map((entry) => buildJobFromListing(entry, { scrapedAt }))
    .filter(Boolean)
}

const extractBulletLines = (html) => {
  const decoded = decodeHtmlEntities(html)
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')

  return decoded
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)
    .map((line) => line.match(/^[\u2022*\-]\s*(.+)$/)?.[1] || null)
    .filter(Boolean)
}

export const mergeJobDetailIntoJob = (job, payload) => {
  if (!hasVerifiedJobDetailShape(payload)) {
    return job
  }

  const detail = payload.data
  const title = normalizeWhitespace(detail.job_title) || job.title
  const department = normalizeWhitespace(detail.department) || job.department
  const location = extractLocationSummary(detail.location_city, detail.location, detail.location_country)
    || job.location
  const roleUrl = buildRoleUrl({
    jobId: job.jobId,
    title,
    team: extractRoleTeam(detail),
    location,
    type: normalizeWhitespace(detail.employee_type) || job.employmentType,
    focus: extractRoleFocus(detail),
  }) || job.applyUrl
  const descriptionHtml = detail.job_description
  const decodedDescription = stripHtml(descriptionHtml)

  return {
    ...job,
    title,
    department,
    location,
    city: extractPrimaryCity(detail.location_city, detail.location) || job.city,
    country: normalizeWhitespace(detail.location_country) || job.country,
    requisitionId: normalizeWhitespace(detail.designation_code) || job.requisitionId,
    applyUrl: roleUrl,
    sourceUrl: roleUrl,
    link: roleUrl,
    employmentType: normalizeEmploymentType(detail.employee_type) || job.employmentType,
    experienceRequired: formatExperienceRange(
      detail.experience_from,
      detail.experience_to,
      detail.unit_experience,
    ) || job.experienceRequired,
    jobDescription: decodedDescription,
    requiredSkills: extractBulletLines(descriptionHtml),
  }
}

const chunkArray = (items, size) => {
  const chunks = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'cars24-official',
  timeoutMs: 15000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
  },
  label: 'cars24-api',
  timeoutMs: 15000,
})

const enrichJobsWithDetails = async (jobs, { fetchJson, detailConcurrency }) => {
  const enrichedJobs = []

  for (const chunk of chunkArray(jobs, detailConcurrency)) {
    const detailedChunk = await Promise.all(chunk.map(async (job) => {
      try {
        const payload = await fetchJson(buildJobDetailApiUrl(job.jobId))
        if (!hasVerifiedJobDetailShape(payload)) {
          throw new Error(`Cars24 job detail API no longer returns the verified contract for ${job.jobId}`)
        }

        return mergeJobDetailIntoJob(job, payload)
      } catch (error) {
        if (!isTransientDetailEnrichmentError(error)) {
          throw error
        }

        console.warn(`  [cars24] Failed to enrich ${job.jobId}; keeping listing-level data: ${error.message}`)
        return job
      }
    }))

    enrichedJobs.push(...detailedChunk)
  }

  return enrichedJobs
}

export const createCars24Scraper = ({
  maxJobs = null,
  detailConcurrency = DETAIL_CONCURRENCY,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    maxJobs: overrideMaxJobs,
    now: overrideNow,
  } = {}) {
    const dedicatedCareersHtml = await fetchText(DEDICATED_CAREERS_URL)

    if (!hasOfficialJobsSiteSignal(dedicatedCareersHtml)) {
      throw new Error('The Cars24 careers site no longer matches the verified public jobs shell')
    }

    const jobsPayload = await fetchJson(JOBS_API_URL)
    if (!hasVerifiedJobsFeedShape(jobsPayload)) {
      throw new Error('The Cars24 jobs API no longer returns the verified public jobs feed')
    }

    const scrapedAt = (overrideNow || now)()
    const extractedJobs = extractJobsFromFeed(jobsPayload, { scrapedAt })
    const effectiveMaxJobs = Number.isInteger(overrideMaxJobs) ? overrideMaxJobs : maxJobs
    const selectedJobs = Number.isInteger(effectiveMaxJobs) && effectiveMaxJobs > 0
      ? extractedJobs.slice(0, effectiveMaxJobs)
      : extractedJobs

    return enrichJobsWithDetails(selectedJobs, {
      fetchJson,
      detailConcurrency,
    })
  },
})

export const run = async (options = {}) => createCars24Scraper().run(options)

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
