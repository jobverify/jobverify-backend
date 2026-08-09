import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

import { OKTA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = OKTA_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const PUBLIC_BOARD_URL = PROVIDER_METADATA.publicBoardUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const ROW_PATTERN =
  /<div class="views-row[^"]*">[\s\S]*?<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<div class="field-content">([\s\S]*?)<\/div><\/div><\/div>/gi

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&#8211;|&ndash;|&#8212;|&mdash;/gi, '-')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#038;|&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/section|\/article|\/li|\/ul|\/ol|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<(p|div|section|article|li|ul|ol|h[1-6]|span)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const DETAIL_END_MARKERS = [
  'The Okta Experience',
  'Apply First Name',
  'Apply Resume',
  'Individuals seeking employment',
]

const normalizeExperience = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const rangeMatch = normalized.match(/\b(\d+)\s*[-–]\s*(\d+)\s*years?\b/i)
  if (rangeMatch) return `${rangeMatch[1]} - ${rangeMatch[2]} years`

  const plusMatch = normalized.match(/\b(\d+)\+\s*years?\b/i)
  if (plusMatch) return `${plusMatch[1]}+ years`

  const exactMatch = normalized.match(/\b(\d+)\s*years?\b/i)
  if (exactMatch) return `${exactMatch[1]} years`

  return null
}

const toAbsoluteUrl = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return new URL(normalized, HOMEPAGE_URL).toString()
}

const extractJobPathKey = (value) => {
  const detailUrl = toAbsoluteUrl(value)
  if (!detailUrl) return null

  const { pathname } = new URL(detailUrl)
  const normalizedPath = pathname.replace(/^\/+|\/+$/g, '')
  if (!normalizedPath) return null

  return normalizedPath.replace(/^company\/careers\//i, '').replace(/\//g, '--') || null
}

export const extractJobId = (value) => {
  const detailUrl = toAbsoluteUrl(value)
  if (!detailUrl) return null

  const numericJobId = new URL(detailUrl).pathname.match(/-(\d+)\/?$/)?.[1]
  return numericJobId || extractJobPathKey(detailUrl)
}

export const hasOfficialCareersPageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /Careers at Okta/i.test(page)
    && /(?:Open positions|View open roles)/i.test(text)
    && new RegExp(PUBLIC_BOARD_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(page)
}

export const hasOfficialJobListingSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return new RegExp(
    `<link[^>]+rel=["']canonical["'][^>]+href=["']${PUBLIC_BOARD_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`,
    'i',
  ).test(page)
    && text.includes('Find your place here')
    && /data-drupal-selector=["']views-exposed-form-careers-main["']/i.test(page)
    && /<div class="views-row[^"]*">/i.test(page)
    && /\/company\/careers\//i.test(page)
}

export const hasOfficialJobDetailSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /<title>\s*.+\|\s*Okta\s*<\/title>/i.test(page)
    && /<h1[^>]*>[\s\S]+?<\/h1>/i.test(page)
    && text.includes('India')
}

export const extractIndiaJobsFromJobListing = (html) => {
  const jobs = []
  const seenJobIds = new Set()

  for (const segment of String(html ?? '').split(/<h3>/i).slice(1)) {
    const closingTagIndex = segment.search(/<\/h3>/i)
    if (closingTagIndex < 0) continue

    const rawDepartment = segment.slice(0, closingTagIndex)
    const body = segment.slice(closingTagIndex)
    const department = stripTags(rawDepartment)
    if (!department) continue

    ROW_PATTERN.lastIndex = 0
    for (const match of body.matchAll(ROW_PATTERN)) {
      const detailUrl = toAbsoluteUrl(match[1])
      const title = stripTags(match[2])
      const location = stripTags(match[3])
      const jobId = extractJobId(detailUrl)

      if (!detailUrl || !title || !location || !jobId) continue
      if (!/\bIndia\b/i.test(location)) continue
      if (seenJobIds.has(jobId)) continue

      seenJobIds.add(jobId)
      jobs.push({
        title,
        company: COMPANY,
        department,
        location,
        city: normalizeWhitespace(location.split(',')[0]) || null,
        country: 'India',
        jobId,
        requisitionId: jobId,
        sourceUrl: detailUrl,
        applyUrl: detailUrl,
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: `Official Okta jobs page lists ${title} in ${location} under ${department}.`,
        remoteStatus: null,
      })
    }
  }

  return jobs
}

const extractDetailTitle = (html = '') =>
  stripTags(String(html ?? '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1])

const extractMetaDescription = (html = '') => normalizeWhitespace(
  String(html ?? '').match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i)?.[1],
)

const extractLegacyBodyDescription = (html = '') => stripTags(
  String(html ?? '').match(/<div class="field--name-body">([\s\S]*?)<\/div>\s*<\/article>/i)?.[1],
)

const trimOktaDetailText = (value = '', listing = {}) => {
  let text = normalizeWhitespace(value)
  if (!text) return null

  const startMarker = 'Secure Every Identity, from AI to Human'
  const startIndex = text.indexOf(startMarker)
  if (startIndex >= 0) {
    text = text.slice(startIndex).trim()
  } else {
    const title = normalizeWhitespace(listing.title)
    if (title) {
      const titleIndex = text.indexOf(title)
      if (titleIndex >= 0) {
        text = text.slice(titleIndex + title.length).trim()
      }
    }

    const location = normalizeWhitespace(listing.location)
    if (location && text.startsWith(location)) {
      text = text.slice(location.length).trim()
    }
  }

  let earliestEndIndex = -1
  for (const marker of DETAIL_END_MARKERS) {
    const markerIndex = text.indexOf(marker)
    if (markerIndex < 0) continue
    if (earliestEndIndex < 0 || markerIndex < earliestEndIndex) {
      earliestEndIndex = markerIndex
    }
  }

  if (earliestEndIndex >= 0) {
    text = text.slice(0, earliestEndIndex).trim()
  }

  return text || null
}

const extractDetailDescription = (html = '', listing = {}) => {
  const legacyBodyText = extractLegacyBodyDescription(html)
  const mainText = trimOktaDetailText(
    stripTags(String(html ?? '').match(/<main[\s\S]*?<\/main>/i)?.[0]),
    listing,
  )
  const metaDescription = extractMetaDescription(html)

  return legacyBodyText || mainText || metaDescription || listing.jobDescription || null
}

const extractExperienceRequiredFromDetail = (html = '') => {
  const text = stripTags(html) || ''
  const candidate = text.match(
    /\b(?:\d+\s*[-–]\s*\d+\s*years?|\d+\+\s*years?|\d+\s*years?)\b[^.]{0,120}\bexperience\b/i,
  )?.[0]

  return normalizeExperience(candidate)
}

export const extractJobDetail = (html = '', listing = {}) => {
  const title = extractDetailTitle(html) || listing.title || null
  const jobDescription = extractDetailDescription(html, listing)
  const experienceRequired =
    extractExperienceRequiredFromDetail(html)
    || listing.experienceRequired
    || null

  return {
    ...listing,
    title,
    experienceRequired,
    jobDescription: jobDescription || listing.jobDescription || null,
    publicExperienceChecked: Boolean(jobDescription || experienceRequired),
  }
}

export const enrichIndiaJobsWithDetailPages = async (jobs, fetchText = defaultFetchText) => Promise.all(
  jobs.map(async (job) => {
    try {
      const detailHtml = await fetchText(job.sourceUrl)
      if (!hasOfficialJobDetailSignal(detailHtml)) return job
      return extractJobDetail(detailHtml, job)
    } catch {
      return job
    }
  }),
)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'okta-html',
  timeoutMs: 15000,
})

export const createOktaScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Okta official careers landing page no longer matches the verified public surface')
    }

    const listingHtml = await fetchText(PUBLIC_BOARD_URL)
    if (!hasOfficialJobListingSignal(listingHtml)) {
      throw new Error('Okta official job listing page no longer matches the verified first-party public surface')
    }

    const jobs = extractIndiaJobsFromJobListing(listingHtml)
    const departmentCount = new Set(jobs.map((job) => job.department).filter(Boolean)).size

    if (jobs.length < 5 || departmentCount < 2) {
      throw new Error('Okta official India jobs surface no longer exposes the expected public first-party role set')
    }

    const limitedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs
    const enrichedJobs = await enrichIndiaJobsWithDetailPages(limitedJobs, fetchText)
    const scrapedAt = now()
    const decoratedJobs = enrichedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt,
    }))

    return decoratedJobs
  },
})

export const run = async (options = {}) => createOktaScraper(options).run(options)

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
