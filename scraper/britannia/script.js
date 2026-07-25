import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const OFFICIAL_CAREERS_URL = 'https://www.britannia.co.in/careers'
export const ORIGIN = 'https://britannia.turbohire.co'
export const ORG_ID = 'c143932d-0df7-4856-9dc5-0a9f1ca26dc5'
export const BOARD_URL = `${ORIGIN}/careerpage/${ORG_ID}`
export const API_BASE_URL = 'https://thapi.azurewebsites.net'
export const NOAUTH_TOKEN_URL = `${API_BASE_URL}/api/token/noauth`
export const FILTERED_JOBS_URL = `${API_BASE_URL}/api/careerpagev2/filteredjobs?orgId=${ORG_ID}&pageType=0`

const DEFAULT_HEADERS = {
  Origin: ORIGIN,
  Referer: BOARD_URL,
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
  const headers = { ...DEFAULT_HEADERS }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  return headers
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.britannia\.co\.in\/careers["']/i.test(page)
    && /Explore Britannia Careers: Exciting Job Opportunities Await/i.test(page)
    && /WE GROW WHEN OUR PEOPLE GROW/i.test(page)
}

export const extractTurboHireHandoffUrl = (html) => {
  const match = String(html ?? '').match(/href=["'](https:\/\/britannia\.turbohire\.co\/careerpage\/c143932d-0df7-4856-9dc5-0a9f1ca26dc5)["']/i)
  return normalizeWhitespace(match?.[1]) || null
}

export const hasOfficialBoardSignal = (html) => {
  const page = String(html ?? '')
  return /<title>\s*Britannia Industries\s*<\/title>/i.test(page)
    && /property=["']og:title["'][^>]+content=["']Britannia Industries - Career Page["']/i.test(page)
    && /property=["']og:site_name["'][^>]+content=["']Britannia Industries["']/i.test(page)
  }

export const extractPublicJobs = (payload = {}) =>
  (Array.isArray(payload?.Result) ? payload.Result : [])
    .map((record) => {
      const title = normalizeWhitespace(record?.JobTitle)
      const location = extractPrimaryLocation(record?.Location)
      const sourceUrl = buildPublicJobUrl(normalizeWhitespace(record?.JobIdObfuscated))

      if (!title || !location || !sourceUrl || !isIndiaLocation(location)) return null

      return {
        title,
        company: normalizeWhitespace(record?.OrgDetails?.OrgName) || 'Britannia Industries',
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

export const createBritanniaScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const fetchJson = options.fetchJson || defaultFetchJson
    const now = options.now || (() => new Date().toISOString())

    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Britannia official careers page no longer matches the verified public surface')
    }

    const handoffUrl = extractTurboHireHandoffUrl(careersHtml)
    if (handoffUrl !== BOARD_URL) {
      throw new Error('Britannia official careers page no longer exposes the verified TurboHire handoff')
    }

    const boardHtml = await fetchText(BOARD_URL)
    if (!hasOfficialBoardSignal(boardHtml)) {
      throw new Error('The official Britannia TurboHire board no longer matches the verified public surface')
    }

    const tokenPayload = await fetchJson(NOAUTH_TOKEN_URL, {
      method: 'GET',
      headers: buildAuthenticatedHeaders(),
    })

    const listingsPayload = await fetchJson(FILTERED_JOBS_URL, {
      method: 'POST',
      headers: {
        ...buildAuthenticatedHeaders(tokenPayload?.access_token),
        'Content-Type': 'application/json',
      },
      body: '{}',
    })

    const jobs = extractPublicJobs(listingsPayload).map((job) => ({
      ...job,
      source: 'britannia',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))

    return maxJobs ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async () => createBritanniaScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Britannia scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'britannia')
    console.log('DB result:', result)
    process.exit(0)
  }
}
