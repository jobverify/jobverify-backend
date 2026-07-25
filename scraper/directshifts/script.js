import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREERS_PAGE_URL = 'https://www.directshifts.com/careers'
export const OPEN_JOBS_URL = 'https://www.directshifts.com/open-jobs'
export const FEED_URL = 'https://app.directshifts.com/jobs/p/list.json'

const DETAIL_URL_BASE = 'https://app.directshifts.com/jobs/p'

const STATE_NAMES = {
  AK: 'Alaska',
  AL: 'Alabama',
  AR: 'Arkansas',
  AZ: 'Arizona',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DC: 'District of Columbia',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  IA: 'Iowa',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  MA: 'Massachusetts',
  MD: 'Maryland',
  ME: 'Maine',
  MI: 'Michigan',
  MN: 'Minnesota',
  MO: 'Missouri',
  MS: 'Mississippi',
  MT: 'Montana',
  NC: 'North Carolina',
  ND: 'North Dakota',
  NE: 'Nebraska',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NV: 'Nevada',
  NY: 'New York',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VA: 'Virginia',
  VT: 'Vermont',
  WA: 'Washington',
  WI: 'Wisconsin',
  WV: 'West Virginia',
  WY: 'Wyoming',
}

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const escapeRegExp = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeCity = (value) => normalizeWhitespace(value)?.replace(/,+$/g, '') || null

const normalizeStateCode = (value) => {
  const normalized = normalizeWhitespace(value)?.toUpperCase()
  if (!normalized || normalized === 'ANY') return null
  return normalized
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (normalized === 'permanent') return 'Permanent'
  if (normalized === 'locum') return 'Locum'
  if (normalized === 'per_diem' || normalized === 'per-diem') return 'Per diem'
  return normalized.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

const normalizeShiftType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  return normalized.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

const normalizeHoursPerShift = (value) => {
  const normalized = normalizeWhitespace(value)
  return normalized || null
}

const splitSpecialties = (value) => (
  normalizeWhitespace(value)
    ? [...new Set(
      String(value)
        .split(',')
        .map((entry) => normalizeWhitespace(entry))
        .filter(Boolean),
    )]
    : []
)

const extractJobIdFromSlug = (slug) => normalizeWhitespace(slug)?.match(/-(\d+)$/)?.[1] || null

const buildLocation = (record = {}) => {
  const city = normalizeCity(record.city)
  const state = normalizeStateCode(record.state_code)
  const country = 'United States'

  if (!city && !state) {
    return {
      location: null,
      city: null,
      state: null,
      country,
    }
  }

  const stateName = state ? STATE_NAMES[state] : null
  const cityIncludesState = city && state && (
    new RegExp(`\\b${escapeRegExp(state)}\\b`, 'i').test(city)
    || (stateName && new RegExp(`\\b${escapeRegExp(stateName)}\\b`, 'i').test(city))
  )

  const parts = [city]
  if (state && !cityIncludesState) parts.push(state)
  parts.push(country)

  return {
    location: parts.filter(Boolean).join(', '),
    city,
    state,
    country,
  }
}

const buildJobDescription = (record = {}, specialties = []) => {
  const parts = []

  if (specialties.length > 0) {
    parts.push(`Specialties: ${specialties.join(', ')}`)
  }

  const practiceType = normalizeWhitespace(record.practice_type)
  if (practiceType) {
    parts.push(`Practice type: ${practiceType}`)
  }

  const shiftType = normalizeShiftType(record.shift_type)
  if (shiftType) {
    parts.push(`Shift: ${shiftType}`)
  }

  const hoursPerShift = normalizeHoursPerShift(record.hours_per_shift)
  if (hoursPerShift) {
    parts.push(`Hours per shift: ${hoursPerShift}`)
  }

  if (record.hot === true) {
    parts.push('Hot job')
  }

  return parts.length > 0 ? `${parts.join('. ')}.` : null
}

const toPositiveInteger = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export const buildFeedUrl = ({ page = 1 } = {}) =>
  page > 1 ? `${FEED_URL}?page=${page}` : FEED_URL

export const buildDetailUrl = (slug) => `${DETAIL_URL_BASE}/${normalizeWhitespace(slug)}`

export const extractPaginationSummary = (payload = {}) => {
  const currentPage = toPositiveInteger(payload.current_page) || 1
  const nextPage = toPositiveInteger(payload.next_page)
  const totalPages = toPositiveInteger(payload.total_pages) || currentPage

  return {
    currentPage,
    nextPage,
    totalPages,
    pageSize: Array.isArray(payload.jobs) ? payload.jobs.length : 0,
    hasNext: nextPage != null && nextPage > currentPage && nextPage <= totalPages,
  }
}

export const extractSearchResults = (payload = {}) =>
  (Array.isArray(payload.jobs) ? payload.jobs : [])
    .map((record) => {
      const title = normalizeWhitespace(record.title)
      const slug = normalizeWhitespace(record.slug)
      const { location, city, state, country } = buildLocation(record)
      const specialties = splitSpecialties(record.specialty_names)

      if (!title || !slug || !location) return null

      const jobId = extractJobIdFromSlug(slug) || slug
      const sourceUrl = buildDetailUrl(slug)

      return {
        title,
        company: 'DirectShifts',
        department: normalizeWhitespace(record.practice_type),
        location,
        city,
        state,
        country,
        jobId,
        requisitionId: jobId,
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: normalizeEmploymentType(record.category),
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: specialties,
        postingDate: null,
        closingDate: null,
        jobDescription: buildJobDescription(record, specialties),
      }
    })
    .filter(Boolean)

const defaultFetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
      Accept: 'application/json,text/plain,*/*',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const createDirectShiftsScraper = ({
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY,
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchJson = options.fetchJson || defaultFetchJson
    const jobs = []
    const seenJobIds = new Set()

    for (let page = 1; page <= maxPages; page += 1) {
      const payload = await fetchJson(buildFeedUrl({ page }))
      const pageJobs = extractSearchResults(payload)
      const summary = extractPaginationSummary(payload)

      for (const job of pageJobs) {
        if (seenJobIds.has(job.jobId)) continue
        seenJobIds.add(job.jobId)

        jobs.push({
          ...job,
          source: 'directshifts',
          link: job.applyUrl || job.sourceUrl,
          scrapedAt: new Date().toISOString(),
        })

        if (maxJobs && jobs.length >= maxJobs) {
          return jobs
        }
      }

      if (!summary.hasNext) break
    }

    return jobs
  },
})

export const run = async () => createDirectShiftsScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, 'directshifts')
}
