import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

import { CAMBRIDGE_TECHNOLOGY_ENTERPRISES_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const SOURCE = PROVIDER_METADATA.source
export const COUNTRY_FILTER = PROVIDER_METADATA.countryFilter
export const OFFICIAL_HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const LISTING_URL = PROVIDER_METADATA.officialJobsBoardUrl
export const DETAIL_URL_PATTERN = PROVIDER_METADATA.detailUrlPattern
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export { PROVIDER_METADATA }

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const JOB_TYPE_MAP = {
  '1': 'Contract',
  '2': 'Full Time',
  '3': 'Internship',
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
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

const toAbsoluteUrl = (value, baseUrl = LISTING_URL) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const extractDetailPathParts = (value) => {
  try {
    const pathname = new URL(value).pathname.replace(/\/+$/, '')
    const match = pathname.match(/\/jobs\/([^/]+)\/([^/]+)$/i)
    if (!match) return { opaqueId: null, slug: null }

    return {
      opaqueId: match[1],
      slug: match[2],
    }
  } catch {
    return { opaqueId: null, slug: null }
  }
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase() || ''
  if (!normalized) return null
  if (normalized.includes('full time')) return 'Full-time'
  if (normalized.includes('part time')) return 'Part-time'
  if (normalized.includes('intern')) return 'Internship'
  if (normalized.includes('contract')) return 'Contract'
  return normalizeWhitespace(value)
}

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return COUNTRY_FILTER
  if (/remote|work from home/i.test(normalized)) return `Remote, ${COUNTRY_FILTER}`
  if (/,\s*india$/i.test(normalized)) return normalized
  return `${normalized}, ${COUNTRY_FILTER}`
}

const extractCity = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized || /remote|work from home/i.test(normalized)) return null
  return normalized.split(',')[0]?.trim() || null
}

const inferRemoteStatus = (...values) => {
  const normalizedValues = values
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean)

  const joined = normalizedValues.join(' ').toLowerCase()
  if (normalizedValues.some((value) => /^true$/i.test(value))) return 'Remote'
  if (joined.includes('hybrid')) return 'Hybrid'
  if (joined.includes('remote') || joined.includes('work from home')) return 'Remote'
  return 'On-site'
}

const extractExperienceRequired = (value) => {
  const normalized = normalizeWhitespace(value)?.replace(/['\u2019]/g, '') || ''
  if (!normalized) return null

  let match = normalized.match(/\b(\d+)\s*years?\s*-\s*(\d+)\s*(?:years?|yrs?)\b/i)
  if (match) return `${match[1]}-${match[2]} years`

  match = normalized.match(/\b(\d+)\+\s*(?:years?|yrs?)\b/i)
  if (match) return `${match[1]}+ years`

  match = normalized.match(/\b(?:minimum\s+)?(\d+)\s*(?:years?|yrs?)\b/i)
  if (match) return `${match[1]} years`

  return null
}

export const extractFreshteamJobsUrl = (html) =>
  toAbsoluteUrl(firstMatch(html, [
    /<a[^>]+href="([^"]*cambridgetechnology\.freshteam\.com\/jobs[^"]*)"/i,
  ]), OFFICIAL_HOMEPAGE_URL)

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml) || ''

  return /\bCambridge Technology\b/i.test(normalized)
    && /\bBuild the next big tech with us\b/i.test(normalized)
    && /Join seasoned experts in building the future of tech/i.test(normalized)
    && /\bSee Open Positions\b/i.test(normalized)
    && extractFreshteamJobsUrl(rawHtml) === LISTING_URL
}

export const hasOfficialJobsBoardSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml) || ''

  return /\bCareers\b/i.test(normalized)
    && /\bOpen Positions\b/i.test(normalized)
    && (
      /data-portal-id="job-role-list"/i.test(rawHtml)
      || /\/jobs\/[^/"?#]+\/[^/"?#]+/i.test(rawHtml)
    )
}

export const buildDetailUrl = (opaqueId, slug) =>
  DETAIL_URL_PATTERN
    .replace('{opaque_id}', opaqueId)
    .replace('{slug}', slug)

const extractLocationParts = (value) => {
  const parts = decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n')
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)

  return {
    locationText: parts[0] || null,
    employmentType: parts[1] || null,
  }
}

const extractDescriptionHtml = (source) => {
  const html = String(source ?? '')
  const sectionStart = html.search(/<div[^>]*class="[^"]*\bjob-details-content\b[^"]*"[^>]*>/i)
  if (sectionStart >= 0) {
    return html.slice(sectionStart)
  }

  return html
}

export const extractListingJobs = (html) => {
  const jobs = []
  const rolePattern = /<li[^>]*data-portal-role="[^"]+"[^>]*>([\s\S]*?)<\/li>/gi

  for (const roleMatch of String(html ?? '').matchAll(rolePattern)) {
    const roleBlock = roleMatch[1]
    const department = firstMatch(roleBlock, [
      /<h5[^>]*>\s*([^<]+?)\s*(?:<span|<\/h5>)/i,
    ])

    const cardPattern = /<a[^>]+href="([^"]*\/jobs\/[^"/?#]+\/[^"/?#]+)"([^>]*)>([\s\S]*?)<\/a>/gi
    for (const cardMatch of roleBlock.matchAll(cardPattern)) {
      const detailUrl = toAbsoluteUrl(cardMatch[1])
      if (!detailUrl) continue

      const attrs = cardMatch[2]
      const body = cardMatch[3]
      const { opaqueId, slug } = extractDetailPathParts(detailUrl)
      const remoteFlag = firstMatch(attrs, [
        /data-portal-remote-location="([^"]+)"/i,
        /data-portal-remote-location=([^\s>]+)/i,
      ])
      const dataLocation = firstMatch(attrs, [
        /data-portal-location="([^"]*)"/i,
      ])
      const dataJobType = firstMatch(attrs, [
        /data-portal-job-type="([^"]+)"/i,
        /data-portal-job-type=([^\s>]+)/i,
      ])
      const summary = firstMatch(body, [
        /<div[^>]*class="[^"]*\bjob-desc\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      ])
      const title = firstMatch(body, [
        /<div[^>]*class="[^"]*\bjob-title\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      ])
      const locationInfoMatch = body.match(
        /<div[^>]*class="[^"]*\blocation-info\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      )
      const { locationText, employmentType } = extractLocationParts(locationInfoMatch?.[1] || '')

      jobs.push({
        title,
        summary,
        department,
        detailUrl,
        jobId: opaqueId,
        requisitionId: opaqueId,
        slug,
        locationText: locationText || dataLocation || null,
        employmentType: employmentType || JOB_TYPE_MAP[dataJobType] || null,
        remoteFlag,
        rawLocation: dataLocation || locationText || null,
      })
    }
  }

  return jobs
}

export const extractJobDetail = (html, listing = {}) => {
  const source = String(html ?? '')
  const detailUrl =
    listing.detailUrl
    || listing.sourceUrl
    || buildDetailUrl(listing.jobId, listing.slug)
  const { opaqueId, slug } = extractDetailPathParts(detailUrl)
  const title = firstMatch(source, [
    /<h1[^>]*>([\s\S]*?)<\/h1>/i,
  ]) || listing.title
  const department = listing.department || firstMatch(source, [
    /<a[^>]*class="[^"]*\blink-back\b[^"]*"[^>]*>[\s\S]*?<\/i>\s*([^<]+?)\s*<\/a>/i,
  ])
  const locationText = firstMatch(source, [
    /<div[^>]*class="[^"]*\bstick-hide-in-mobile\b[^"]*"[^>]*>\s*([^<]+?)\s*<div>/i,
  ]) || listing.locationText
  const descriptionHtml = extractDescriptionHtml(source)
  const jobDescription = normalizeWhitespace(descriptionHtml) || normalizeWhitespace(listing.summary)

  return {
    title,
    company: COMPANY_NAME,
    department,
    location: normalizeLocation(locationText),
    city: extractCity(locationText),
    country: COUNTRY_FILTER,
    jobId: listing.jobId || opaqueId || slug,
    requisitionId: listing.requisitionId || opaqueId || slug,
    sourceUrl: detailUrl,
    applyUrl: detailUrl,
    employmentType: normalizeEmploymentType(firstMatch(source, [
      /Work Type:\s*([^<\n]+)/i,
    ]) || listing.employmentType),
    experienceRequired: extractExperienceRequired(jobDescription),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription,
    remoteStatus: inferRemoteStatus(listing.remoteFlag, locationText, jobDescription),
  }
}

export const extractSearchResults = ({
  listingHtml = '',
  listingJobs = null,
  detailHtmlByUrl = {},
} = {}) => {
  const listings = Array.isArray(listingJobs) ? listingJobs : extractListingJobs(listingHtml)
  const hasDetails = Object.keys(detailHtmlByUrl).length > 0
  const selectedListings = hasDetails
    ? listings.filter((listing) => detailHtmlByUrl[listing.detailUrl] != null)
    : listings

  return selectedListings.map((listing) =>
    extractJobDetail(detailHtmlByUrl[listing.detailUrl] || '', listing))
}

const isIndiaListing = (listing = {}) => {
  const location = normalizeWhitespace(listing.rawLocation || listing.locationText) || ''
  return /india/i.test(location)
    || /hyderabad|bengaluru|bangalore|pune|mumbai|gurugram|gurgaon|chennai|noida|delhi/i.test(location)
    || /remote/i.test(location)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createCambridgeTechnologyEnterprisesScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const now = options.now || (() => new Date().toISOString())
    const officialHtml = await fetchText(OFFICIAL_HOMEPAGE_URL)

    if (!hasOfficialHomepageSignal(officialHtml)) {
      throw new Error(
        'Cambridge Technology Enterprises verified official homepage handoff no longer matches the trusted public surface',
      )
    }

    const listingUrl = extractFreshteamJobsUrl(officialHtml)
    if (listingUrl !== LISTING_URL) {
      throw new Error(
        'Verified official homepage handoff no longer points to the known Cambridge Technology Freshteam board',
      )
    }

    const listingHtml = await fetchText(listingUrl)
    if (!hasOfficialJobsBoardSignal(listingHtml)) {
      throw new Error(
        'Cambridge Technology Enterprises verified public Freshteam board no longer matches the known public surface',
      )
    }

    const listingJobs = extractListingJobs(listingHtml).filter(isIndiaListing)
    const selectedListings = maxJobs ? listingJobs.slice(0, maxJobs) : listingJobs
    const detailHtmlByUrl = {}

    await Promise.all(selectedListings.map(async (listing) => {
      detailHtmlByUrl[listing.detailUrl] = await fetchText(listing.detailUrl)
    }))

    const jobs = extractSearchResults({
      listingJobs: selectedListings,
      detailHtmlByUrl,
    })

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createCambridgeTechnologyEnterprisesScraper().run(options)

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
