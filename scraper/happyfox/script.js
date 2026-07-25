import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

import { HAPPYFOX_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const COMPANY_NAME = HAPPYFOX_CATALOG.companyName
export const SOURCE = HAPPYFOX_CATALOG.source
export const COUNTRY_FILTER = HAPPYFOX_CATALOG.countryFilter
export const JOBS_HUB_URL = HAPPYFOX_CATALOG.officialJobsHubUrl
export const INDIA_CITY_PAGE_URLS = HAPPYFOX_CATALOG.indiaCityPageUrls
export const TRAKSTAR_JOBS_HOST = HAPPYFOX_CATALOG.trakstarJobsHost
export const VERIFIED_ON = HAPPYFOX_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = HAPPYFOX_CATALOG.verifiedSurfaceSummary
export const PROVIDER_METADATA = HAPPYFOX_CATALOG

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;|&#8217;/gi, "'")
  .replace(/&#8211;|&#8212;|&ndash;|&mdash;/gi, '-')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|section)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const firstMatch = (source, patterns) => {
  for (const pattern of patterns) {
    const match = String(source ?? '').match(pattern)
    const value = normalizeWhitespace(match?.[1])
    if (value) return value
  }

  return null
}

const toAbsoluteUrl = (value, baseUrl = JOBS_HUB_URL) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const unique = (values) => [...new Set(values.filter(Boolean))]

const titleCase = (value) =>
  normalizeWhitespace(value)
    ?.toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase()) || null

const extractJobIdFromUrl = (value) => {
  try {
    const pathname = new URL(value).pathname.replace(/\/+$/, '')
    const match = pathname.match(/\/jobs\/([^/]+)$/i)
    return match?.[1] || null
  } catch {
    return null
  }
}

const extractCity = (value) => normalizeWhitespace(value)?.split(',')[0]?.trim() || null

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase() || ''
  if (!normalized) return null
  if (normalized.includes('full time') || normalized.includes('full-time')) return 'Full-time'
  if (normalized.includes('part time') || normalized.includes('part-time')) return 'Part-time'
  if (normalized.includes('contract')) return 'Contract'
  if (normalized.includes('intern')) return 'Internship'
  return normalizeWhitespace(value)
}

const inferRemoteStatus = (...values) => {
  const normalized = values
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (normalized.includes('hybrid')) return 'Hybrid'
  if (normalized.includes('remote') || normalized.includes('work from home')) return 'Remote'
  return 'On-site'
}

const extractExperienceRequired = (value) => {
  const normalized = normalizeWhitespace(value)?.replace(/[â€™']/g, '') || ''
  if (!normalized) return null

  let match = normalized.match(/\b(\d+)\s*-\s*(\d+)\s*(?:years?|yrs?)\b/i)
  if (match) return `${match[1]}-${match[2]} years`

  match = normalized.match(/\b(\d+)\+\s*(?:years?|yrs?)\b/i)
  if (match) return `${match[1]}+ years`

  match = normalized.match(/\bat least\s+(\d+)\s*(?:years?|yrs?)\b/i)
  if (match) return `${match[1]} years`

  match = normalized.match(/\bminimum\s+(\d+)\s*(?:years?|yrs?)\b/i)
  if (match) return `${match[1]} years`

  match = normalized.match(/\b(\d+)\s*(?:years?|yrs?)\b/i)
  if (match) return `${match[1]} years`

  return null
}

const extractDescriptionHtml = (html) => {
  const match = String(html ?? '').match(
    /<p[^>]*>\s*[^<]*\|\s*[^<]*\|\s*[^<]*<\/p>([\s\S]*?)<h2[^>]*>\s*Application Form\s*<\/h2>/i,
  )

  return match?.[1] || ''
}

const isTrackedCityPage = (value) => INDIA_CITY_PAGE_URLS.includes(value)

const isTrackedDetailUrl = (value) => String(value ?? '').startsWith(`${TRAKSTAR_JOBS_HOST}/jobs/`)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const extractIndiaCityPageUrls = (html) => unique(
  [...String(html ?? '').matchAll(/<a[^>]+href="([^"]+)"/gi)]
    .map((match) => toAbsoluteUrl(match[1], JOBS_HUB_URL))
    .filter(isTrackedCityPage),
)

export const hasOfficialJobsHubSignal = (html) => {
  const normalized = normalizeWhitespace(html) || ''
  const cityUrls = extractIndiaCityPageUrls(html)

  return /Join Us In Spreading the Happy-ness/i.test(normalized)
    && /Open positions in India/i.test(normalized)
    && JSON.stringify(cityUrls) === JSON.stringify(INDIA_CITY_PAGE_URLS)
}

export const hasCityListingSignal = (html) => {
  const normalized = normalizeWhitespace(html) || ''
  return /Open Positions/i.test(normalized)
    && /Apply/i.test(normalized)
    && /happyfox\.hire\.trakstar\.com\/jobs\//i.test(String(html ?? ''))
}

export const hasTrakstarJobSignal = (html) => {
  const normalized = normalizeWhitespace(html) || ''
  return /Application Form/i.test(normalized)
    && /Full-time/i.test(normalized)
    && /India/i.test(normalized)
}

export const extractListingCards = (html, cityPageUrl) => {
  const listings = []

  for (const sectionMatch of String(html ?? '').matchAll(/<section[^>]*>([\s\S]*?)<\/section>/gi)) {
    const sectionHtml = sectionMatch[1]
    const department = titleCase(firstMatch(sectionHtml, [
      /<h2[^>]*>([\s\S]*?)<\/h2>/i,
    ]))

    const cardPattern =
      /<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>\s*<a[^>]+href="([^"]+)"[^>]*>\s*Apply\s*<\/a>/gi

    for (const cardMatch of sectionHtml.matchAll(cardPattern)) {
      const title = normalizeWhitespace(cardMatch[1])
      const locationHint = normalizeWhitespace(cardMatch[2])
      const detailUrl = toAbsoluteUrl(cardMatch[3], cityPageUrl)

      if (!title || !locationHint || !isTrackedDetailUrl(detailUrl)) continue

      const jobId = extractJobIdFromUrl(detailUrl)
      listings.push({
        title,
        department,
        locationHint,
        detailUrl,
        sourceUrl: detailUrl,
        applyUrl: detailUrl,
        cityPageUrl,
        jobId,
        requisitionId: jobId,
      })
    }
  }

  return listings
}

export const extractJobDetail = (html, listing = {}) => {
  const title = firstMatch(html, [
    /<h1[^>]*>([\s\S]*?)<\/h1>/i,
  ]) || listing.title
  const summaryLine = firstMatch(html, [
    /<p[^>]*>\s*([^<]*\|\s*[^<]*\|\s*[^<]*)\s*<\/p>/i,
  ])
  const [location, department, employmentType] = String(summaryLine ?? '')
    .split('|')
    .map((part) => normalizeWhitespace(part))
  const detailUrl = listing.detailUrl || listing.sourceUrl || listing.applyUrl
  const jobId = listing.jobId || extractJobIdFromUrl(detailUrl)
  const jobDescription = normalizeWhitespace(extractDescriptionHtml(html))

  return {
    title,
    company: COMPANY_NAME,
    department: department || listing.department || null,
    location: location || null,
    city: extractCity(location),
    country: COUNTRY_FILTER,
    jobId,
    requisitionId: listing.requisitionId || jobId,
    sourceUrl: detailUrl,
    applyUrl: detailUrl,
    employmentType: normalizeEmploymentType(employmentType),
    experienceRequired: extractExperienceRequired(jobDescription),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription,
    remoteStatus: inferRemoteStatus(location, jobDescription),
  }
}

export const createHappyFoxScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const now = options.now || (() => new Date().toISOString())
    const jobsHubHtml = await fetchText(JOBS_HUB_URL)

    if (!hasOfficialJobsHubSignal(jobsHubHtml)) {
      throw new Error('The verified HappyFox jobs hub no longer matches the trusted public surface')
    }

    const cityPageUrls = extractIndiaCityPageUrls(jobsHubHtml)
    if (JSON.stringify(cityPageUrls) !== JSON.stringify(INDIA_CITY_PAGE_URLS)) {
      throw new Error('The verified HappyFox jobs hub no longer points to the expected India city pages')
    }

    const listings = []
    for (const cityPageUrl of cityPageUrls) {
      const cityHtml = await fetchText(cityPageUrl)
      if (!hasCityListingSignal(cityHtml)) {
        throw new Error(`HappyFox city listings page drifted from the verified surface: ${cityPageUrl}`)
      }

      listings.push(...extractListingCards(cityHtml, cityPageUrl))
    }

    const selectedListings = Number.isInteger(maxJobs) ? listings.slice(0, maxJobs) : listings
    const jobs = []

    for (const listing of selectedListings) {
      const detailHtml = await fetchText(listing.detailUrl)
      if (!hasTrakstarJobSignal(detailHtml)) {
        throw new Error(`HappyFox Trakstar job detail drifted from the verified surface: ${listing.detailUrl}`)
      }

      jobs.push({
        ...extractJobDetail(detailHtml, listing),
        source: SOURCE,
        link: listing.detailUrl,
        scrapedAt: now(),
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createHappyFoxScraper().run(options)

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
