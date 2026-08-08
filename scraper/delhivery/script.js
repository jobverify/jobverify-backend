import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

import { DELHIVERY_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = DELHIVERY_CATALOG
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const SOURCE = PROVIDER_METADATA.source
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const OFFICIAL_CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const OFFICIAL_CAREERS_HANDOFF_URL = PROVIDER_METADATA.officialCareersHandoffUrl
export const DARWINBOX_JOBS_URL = PROVIDER_METADATA.darwinboxJobsUrl
export const PUBLIC_PORTAL_HOME_URL = PROVIDER_METADATA.publicPortalHomeUrl
export const PUBLIC_ALL_JOBS_URL = PROVIDER_METADATA.publicAllJobsUrl
export const LISTING_API_URL = PROVIDER_METADATA.listingApiUrl
export const DARWINBOX_ORIGIN = PROVIDER_METADATA.darwinboxOrigin
export const COMPANY_ID = PROVIDER_METADATA.darwinboxCompanyId
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const DEFAULT_PAGE_SIZE = 10
const DEFAULT_TIMEOUT_MS = Number.isInteger(config.jobListingTimeoutMs)
  ? config.jobListingTimeoutMs
  : 30000
const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&amp;/gi, '&')

const normalizeText = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const dedupe = (values) => [...new Set(values.filter(Boolean))]

const normalizeLink = (value) => normalizeText(value)

const normalizeLocationValue = (value) => {
  const normalized = normalizeText(value)
  if (!normalized) return null

  const parts = normalized
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length >= 4) {
    return parts.slice(1).join(', ')
  }

  return normalized
}

const locationListFromShowArray = (values = []) => values
  .map((value) => normalizeText(value))
  .filter((value) => value && (/india/i.test(value) || /remote/i.test(value)))
  .map((value) => normalizeLocationValue(value))

const extractNormalizedLocations = (record = {}) => {
  const explicitLocation = normalizeLocationValue(record.locations)

  if (explicitLocation && !/^multiple locations$/i.test(explicitLocation)) {
    return [explicitLocation]
  }

  const structuredLocations = [
    ...(Array.isArray(record.officelocations_without_area)
      ? record.officelocations_without_area.map((value) => normalizeLocationValue(value))
      : []),
    ...(Array.isArray(record.tool_tip_locations)
      ? record.tool_tip_locations.map((value) => normalizeLocationValue(value))
      : []),
    ...locationListFromShowArray(record.officelocation_show_arr_list),
  ]

  return dedupe(structuredLocations)
}

const extractCity = (location) => {
  const normalizedLocation = normalizeText(location)
  if (!normalizedLocation) return null
  if (/remote/i.test(normalizedLocation)) return 'Remote'

  const firstLocation = normalizedLocation
    .split('|')
    .map((part) => part.trim())
    .find(Boolean) || normalizedLocation

  const [city] = firstLocation
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  return city || firstLocation
}

const hasIndiaSignal = (value) => /india/i.test(normalizeText(value) || '')

const isIndiaRecord = (record = {}) => {
  if (hasIndiaSignal(record.country) || hasIndiaSignal(record.locations) || hasIndiaSignal(record.officelocation_show_arr)) {
    return true
  }

  return extractNormalizedLocations(record).some((location) => /india/i.test(location))
}

const buildLinkMap = (surface = {}) => new Map(
  (Array.isArray(surface.links) ? surface.links : [])
    .map((link) => [normalizeText(link?.text), normalizeLink(link?.href)])
    .filter(([text, href]) => text && href),
)

const stripHtml = (html = '') => normalizeText(
  String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const parseHtmlSurface = (html = '', url) => ({
  url,
  title: normalizeText(String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]),
  text: stripHtml(html),
  links: [...String(html).matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => ({
      href: normalizeLink(match[1]),
      text: stripHtml(match[2]),
    })),
})

const fetchSurface = async (url, fetchImpl, label) => parseHtmlSurface(
  await fetchTextWithRetry(url, {
    fetchImpl,
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': USER_AGENT,
    },
    label,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  }),
  url,
)

export const captureOfficialCareersSurface = ({ fetchImpl = fetch } = {}) =>
  fetchSurface(OFFICIAL_CAREERS_URL, fetchImpl, 'delhivery-official-careers')

const createNativeListingContext = async ({
  pageSize = DEFAULT_PAGE_SIZE,
  fetchImpl = fetch,
} = {}) => ({
  surface: await fetchSurface(
    PUBLIC_PORTAL_HOME_URL,
    fetchImpl,
    'delhivery-darwinbox-home',
  ),
  fetchListingPage: ({ page: pageNumber, pageSize: requestedPageSize = pageSize }) =>
    fetchJsonWithRetry(LISTING_API_URL, {
      fetchImpl,
      method: 'POST',
      headers: {
        Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
        'Content-Type': 'application/json',
        Origin: DARWINBOX_ORIGIN,
        Referer: PUBLIC_ALL_JOBS_URL,
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify({
        companyId: COMPANY_ID,
        sort_option: 'new',
        limit: requestedPageSize,
        page: pageNumber,
      }),
      label: 'delhivery-darwinbox-listings',
      timeoutMs: DEFAULT_TIMEOUT_MS,
    }),
})

export const buildJobDetailUrl = (jobId) =>
  `${DARWINBOX_ORIGIN}/ms/candidatev2/${COMPANY_ID}/careers/jobDetails/${normalizeText(jobId) || ''}`

export const transformDelhiveryJob = (record = {}) => {
  if (!isIndiaRecord(record)) return null

  const jobId = normalizeText(record.id)
  const locationParts = extractNormalizedLocations(record)
  const location = locationParts.length > 0 ? locationParts.join(' | ') : null

  if (!jobId || !location) return null

  return {
    title: normalizeText(record.title) || normalizeText(record.designation_name),
    company: COMPANY_NAME,
    department: normalizeText(record.department_name),
    location,
    city: extractCity(location),
    jobId,
    requisitionId: normalizeText(record.internal_job_code) || null,
    sourceUrl: buildJobDetailUrl(jobId),
    applyUrl: buildJobDetailUrl(jobId),
    employmentType: normalizeText(record.emp_type_name),
    experienceRequired: normalizeText(record.experience),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: normalizeText(record.posted_on),
    closingDate: null,
    jobDescription: normalizeText(record.jd),
  }
}

export const extractSearchResults = (payload = {}) =>
  Array.isArray(payload?.data)
    ? payload.data
      .map((record) => transformDelhiveryJob(record))
      .filter(Boolean)
    : []

export const hasOfficialDelhiveryCareersSignals = (surface = {}) => {
  const title = normalizeText(surface.title)
  const text = normalizeText(surface.text) || ''
  const linkMap = buildLinkMap(surface)

  return title === "Build Your Career with Delhivery – Join India's Leading Logistics Innovator"
    && text.includes('Build a career at Delhivery')
    && linkMap.get('Jobs at Delhivery') === OFFICIAL_CAREERS_HANDOFF_URL
    && linkMap.get('Corporate Jobs') === OFFICIAL_CAREERS_HANDOFF_URL
}

export const hasPublicDarwinboxHomeSignal = (surface = {}) => {
  const url = normalizeLink(surface.url)
  const title = normalizeText(surface.title)
  const text = normalizeText(surface.text) || ''
  const links = Array.isArray(surface.links) ? surface.links : []

  const hasRichShellSignals = text.includes('Thank you for choosing us for your next chapter!')
    && /We Have\s+\d+\s+Open Jobs/i.test(text)
    && text.includes('Powered by: darwinbox')
    && links.some((link) => normalizeLink(link?.href) === PUBLIC_ALL_JOBS_URL)

  const hasMinimalShellSignals = url === PUBLIC_PORTAL_HOME_URL
    && text === `${OFFICIAL_BRAND_NAME} -`

  return title === OFFICIAL_BRAND_NAME
    && (hasRichShellSignals || hasMinimalShellSignals)
}

export const createDelhiveryScraper = ({
  now = () => new Date().toISOString(),
  pageSize = DEFAULT_PAGE_SIZE,
  fetchImpl = fetch,
} = {}) => ({
  async run({
    maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY,
    maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
    getOfficialCareersSurface = () => captureOfficialCareersSurface({ fetchImpl }),
    getListingContext = () => createNativeListingContext({ pageSize, fetchImpl }),
  } = {}) {
    const officialSurface = await getOfficialCareersSurface()
    if (!hasOfficialDelhiveryCareersSignals(officialSurface)) {
      throw new Error('Delhivery verified official careers page no longer matches the verified public surface')
    }

    const listingContext = await getListingContext()

    if (!hasPublicDarwinboxHomeSignal(listingContext.surface)) {
      throw new Error('Delhivery verified public Darwinbox home surface no longer matches the verified public surface')
    }

    const jobs = []
    let pageNumber = 1

    while (pageNumber <= maxPages) {
      const payload = await listingContext.fetchListingPage({
        page: pageNumber,
        pageSize,
        companyId: COMPANY_ID,
      })

      const results = extractSearchResults(payload)

      for (const job of results) {
        jobs.push({
          ...job,
          source: SOURCE,
          link: job.applyUrl || job.sourceUrl,
          scrapedAt: now(),
        })

        if (maxJobs && jobs.length >= maxJobs) {
          return jobs
        }
      }

      const totalJobCount = Number.parseInt(String(payload?.job_counts ?? ''), 10)
      const hasMore = Number.isFinite(totalJobCount)
        ? pageNumber * pageSize < totalJobCount
        : Array.isArray(payload?.data) && payload.data.length === pageSize

      if (!hasMore) break
      pageNumber += 1
    }

    return jobs
  },
})

export const run = async (options = {}) => createDelhiveryScraper().run(options)

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
