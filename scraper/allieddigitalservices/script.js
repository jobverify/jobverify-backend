import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCity } from '../utils/cityNormalizer.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

import { ALLIED_DIGITAL_SERVICES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = ALLIED_DIGITAL_SERVICES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const ROOT_URL = 'https://www.allieddigital.net/'
export const INDIA_HOME_URL = PROVIDER_METADATA.indiaHomeUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const HIRING_NOW_URL = PROVIDER_METADATA.hiringNowPageUrl
export const VERIFIED_FRIENDLY_DETAIL_URL = PROVIDER_METADATA.verifiedFriendlyDetailUrl
export const VERIFIED_BROKEN_REQUEST_DETAIL_URL = PROVIDER_METADATA.verifiedBrokenRequestDetailUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/&#8212;|&mdash;/gi, '-')
  .replace(/\u00a0/g, ' ')

const normalizeWhitespace = (value) => decodeHtml(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim() || null

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const toAbsoluteUrl = (value, base = HIRING_NOW_URL) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, base).toString()
  } catch {
    return null
  }
}

const extractHref = (html = '') => {
  const match = String(html ?? '').match(/<a\b[^>]*href=["']([^"']+)["']/i)
  return match?.[1] || null
}

const extractTables = (html = '') => [...String(html ?? '').matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)]
  .map((match) => match[1])

const extractRows = (tableHtml = '') => [...String(tableHtml ?? '').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
  .map((match) => match[1])

const extractCells = (rowHtml = '') => [...String(rowHtml ?? '').matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
  .map((match) => match[2])

const normalizeExperience = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  if (/^\d+\s*-\s*\d+$/.test(normalized)) {
    return `${normalized.replace(/\s*-\s*/g, '-')} years`
  }

  return normalized
}

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  if (/preferably\s+mumbai/i.test(normalized)) return 'Mumbai, India'
  if (/india/i.test(normalized)) return normalized

  return `${normalized}, India`
}

const normalizeRemoteStatus = () => 'On-site'

const isRequestDetailUrl = (value) => /\/jobdetails\?requestid=\d+/i.test(String(value ?? ''))

const buildFriendlyListing = (cells = []) => {
  if (cells.length < 5) return null

  const department = normalizeWhitespace(cells[0])
  const title = normalizeWhitespace(cells[1])
  const experienceRequired = normalizeExperience(cells[2])
  const location = normalizeLocation(cells[3])
  const sourceUrl = toAbsoluteUrl(extractHref(cells[4]))
  const jobId = slugify(title)

  if (!department || !title || !location || !sourceUrl || !jobId) return null

  return {
    title,
    company: COMPANY,
    department,
    location,
    city: normalizeCity(location.split(',')[0] || null),
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: null,
    experienceRequired,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: `Department: ${department}`,
    remoteStatus: normalizeRemoteStatus(),
  }
}

const buildRequestListing = (cells = []) => {
  if (cells.length < 5) return null

  const requestId = normalizeWhitespace(cells[0])
  const department = normalizeWhitespace(cells[1])
  const title = normalizeWhitespace(cells[2])
  const experienceRequired = normalizeExperience(cells[3])
  const location = normalizeLocation(cells[4])
  const rawDetailUrl = toAbsoluteUrl(extractHref(cells[0]))

  if (!requestId || !department || !title || !location || !/^\d+$/.test(requestId)) return null

  const sourceUrl = isRequestDetailUrl(rawDetailUrl) ? HIRING_NOW_URL : rawDetailUrl || HIRING_NOW_URL

  return {
    title,
    company: COMPANY,
    department,
    location,
    city: normalizeCity(location.split(',')[0] || null),
    country: 'India',
    jobId: requestId,
    requisitionId: requestId,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: null,
    experienceRequired,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: `Request ID: ${requestId}\nDepartment: ${department}`,
    remoteStatus: normalizeRemoteStatus(),
  }
}

export const hasOfficialRootSignal = (html = '') => {
  const page = String(html ?? '')

  return page.includes('AlliedWebGeoLoc/GeoHandler.ashx')
    && page.includes('https://www.allieddigital.net/in/')
    && page.includes('https://www.allieddigital.net/us/')
    && page.includes('https://www.allieddigital.net/row/')
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.allieddigital\.net\/in\/careers\/["']/i.test(page)
    && normalized.includes('IT Jobs in India | Career at Allied Digital Services Ltd')
    && normalized.includes('Hiring Now')
    && normalized.includes('Join our team')
}

export const hasHiringNowSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.allieddigital\.net\/in\/careers\/hiring-now\/["']/i.test(page)
    && normalized.includes('Request ID')
    && normalized.includes('Designation')
    && normalized.includes('Location')
    && normalized.includes('careers@allieddigital.net')
    && (normalized.includes('Click here to view more') || page.includes('requestid='))
}

export const extractHiringNowListings = (html = '') => {
  if (!hasHiringNowSignal(html)) {
    throw new Error('Expected verified Allied Digital Services Hiring Now surface with public openings')
  }

  const jobs = []

  for (const tableHtml of extractTables(html)) {
    const rows = extractRows(tableHtml)
    if (rows.length < 2) continue

    const headerCells = extractCells(rows[0]).map((cell) => normalizeWhitespace(cell))
    const isRequestTable = headerCells.includes('Request ID')
    const isFriendlyTable = headerCells.includes('Department')
      && headerCells.includes('Designation')
      && headerCells.includes('Experience')
      && headerCells.includes('Location')

    if (!isRequestTable && !isFriendlyTable) continue

    for (const rowHtml of rows.slice(1)) {
      const cells = extractCells(rowHtml)
      const listing = isRequestTable
        ? buildRequestListing(cells)
        : buildFriendlyListing(cells)

      if (listing) jobs.push(listing)
    }
  }

  if (jobs.length === 0) {
    throw new Error('Expected verified Allied Digital Services Hiring Now surface with public openings')
  }

  return jobs
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createAlliedDigitalServicesScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const rootHtml = await fetchText(ROOT_URL)
    if (!hasOfficialRootSignal(rootHtml)) {
      throw new Error(`Allied Digital Services verified root surface changed: ${ROOT_URL}`)
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error(`Allied Digital Services verified careers surface changed: ${CAREERS_URL}`)
    }

    const hiringNowHtml = await fetchText(HIRING_NOW_URL)
    if (!hasHiringNowSignal(hiringNowHtml)) {
      throw new Error(`Allied Digital Services verified Hiring Now surface changed: ${HIRING_NOW_URL}`)
    }

    return extractHiringNowListings(hiringNowHtml).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: (overrideNow || now)(),
    }))
  },
})

export const run = async (options = {}) => createAlliedDigitalServicesScraper().run(options)

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
