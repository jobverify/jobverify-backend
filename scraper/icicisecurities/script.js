import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ICICI_SECURITIES_CATALOG } from './catalog.js'
import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = ICICI_SECURITIES_CATALOG.source
export const COMPANY = ICICI_SECURITIES_CATALOG.companyName
export const PROVIDER_METADATA = ICICI_SECURITIES_CATALOG
export const OFFICIAL_CAREERS_URL = ICICI_SECURITIES_CATALOG.companyCareerPage
export const SEARCH_API_URL = ICICI_SECURITIES_CATALOG.listingApiUrl

const DEFAULT_HEADERS = {
  Origin: 'https://www.icicisecurities.com',
  Referer: OFFICIAL_CAREERS_URL,
  'User-Agent': 'Mozilla/5.0',
  Accept: 'application/json, text/plain, */*',
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

const splitCsv = (value) =>
  String(value ?? '')
    .split(',')
    .map((entry) => normalizeWhitespace(entry))
    .filter(Boolean)

const unique = (values) => [...new Set(values.filter(Boolean))]

const buildSearchRequestPayload = () => ({
  locations: [],
  experience: [],
  functions: [],
  q: '',
  val: 16,
})

const buildLocation = (record = {}) => {
  const primary = normalizeWhitespace(record?.location)
  const others = splitCsv(record?.all_location)
  const locations = unique([
    primary,
    ...others,
  ])

  if (locations.length === 0) return null
  if (locations.length === 1 && /india/i.test(locations[0])) return locations[0]

  return `${locations.join(', ')}, India`
}

const extractCity = (location) => {
  const first = normalizeWhitespace(String(location ?? '').split(',')[0])
  if (!first || /^pan india$/i.test(first) || /^india$/i.test(first)) return null
  return first
}

const parseSlashDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const match = normalized.match(/^(\d{2})\/(\d{2})\/(\d{2})$/)
  if (!match) return null

  const [, day, month, year] = match
  return `20${year}-${month}-${day}`
}

const isActiveOnDate = (closingDate, today) => {
  if (!closingDate) return true
  return closingDate >= today
}

const joinDescriptionParts = (...parts) =>
  parts
    .map((part) => stripTags(part))
    .filter(Boolean)
    .join(' ')
    || null

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return /<title>\s*ICICI Securities Current Openings\s*<\/title>/i.test(page)
    && /Current Openings/i.test(page)
    && /https:\/\/www\.icicisecurities\.com\/get-branches/i.test(page)
}

export const extractListingApiUrl = (html) => {
  const match = String(html ?? '').match(
    /https:\/\/www\.icicisecurities\.com\/get-branches/i,
  )
  return normalizeWhitespace(match?.[0]) || null
}

export const buildSearchRequestBody = () => JSON.stringify(buildSearchRequestPayload())

export const extractPublicJobs = (payload = {}, { today = new Date().toISOString().slice(0, 10) } = {}) =>
  (Array.isArray(payload?.data) ? payload.data : [])
    .map((record) => {
      const title = normalizeWhitespace(record?.job_title)
      const jobId = normalizeWhitespace(record?.cw_upload_id)
      const location = buildLocation(record)
      const closingDate = parseSlashDate(record?.posted_to_date)

      if (!title || !jobId || !location) return null
      if (!isActiveOnDate(closingDate, today)) return null

      return {
        title,
        company: COMPANY,
        department: normalizeWhitespace(record?.function),
        location,
        city: extractCity(location),
        country: 'India',
        jobId,
        requisitionId: jobId,
        sourceUrl: OFFICIAL_CAREERS_URL,
        applyUrl: OFFICIAL_CAREERS_URL,
        employmentType: null,
        experienceRequired: normalizeWhitespace(record?.experience),
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: unique([
          normalizeWhitespace(record?.key_requirement),
        ]),
        postingDate: parseSlashDate(record?.posted_from_date),
        closingDate,
        jobDescription: joinDescriptionParts(record?.job_summary, record?.job_template),
      }
    })
    .filter(Boolean)

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': DEFAULT_HEADERS['User-Agent'],
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

const defaultFetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const createIciciSecuritiesScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const fetchJson = options.fetchJson || defaultFetchJson
    const now = options.now || (() => new Date().toISOString())
    const today = options.today || now().slice(0, 10)

    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('ICICI Securities official current openings page changed; refusing to guess the public jobs feed')
    }

    const listingApiUrl = extractListingApiUrl(careersHtml)
    if (listingApiUrl !== SEARCH_API_URL) {
      throw new Error('ICICI Securities verified listing API changed; refusing to guess the public jobs feed')
    }

    const listingsPayload = await fetchJson(SEARCH_API_URL, {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/json',
      },
      body: buildSearchRequestBody(),
    })

    const jobs = extractPublicJobs(listingsPayload, { today }).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))

    return maxJobs ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async (options = {}) => createIciciSecuritiesScraper().run(options)

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
