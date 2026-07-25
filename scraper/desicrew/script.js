import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

import { DESI_CREW_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = DESI_CREW_CATALOG
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const SOURCE = PROVIDER_METADATA.source
export const COUNTRY_FILTER = PROVIDER_METADATA.countryFilter
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_PAGE_URL = PROVIDER_METADATA.careersPageUrl
export const JOBS_ARCHIVE_URL = PROVIDER_METADATA.jobsArchiveUrl
export const SAMPLE_JOB_URL = PROVIDER_METADATA.sampleJobUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

export const JOBS_API_BASE_URL = 'https://desicrew.in/wp-json/wp/v2/open-job-position'
export const PAGE_SIZE = 100
const JOBS_API_FIELDS = 'id,date,modified,status,link,title,slug,content,type'
export const buildJobsApiUrl = (page = 1, pageSize = PAGE_SIZE) =>
  `${JOBS_API_BASE_URL}?per_page=${pageSize}&_fields=${JOBS_API_FIELDS}${page > 1 ? `&page=${page}` : ''}`
export const JOBS_API_URL = buildJobsApiUrl(1)

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeUrl = (value) => String(value ?? '').replace(/\/+$/, '')

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&#8211;|&ndash;|\u2013/gi, '-')
  .replace(/&#8212;|&mdash;|\u2014/gi, '-')
  .replace(/&#8216;|&#8217;|&apos;|&rsquo;|&lsquo;|&#x27;/gi, "'")
  .replace(/&#8220;|&#8221;|&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/\r/g, '')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeOptionalValue = (value) => {
  const normalized = normalizeWhitespace(value)
  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  decodeHtmlEntities(String(value ?? ''))
    .replace(/<(?:br|\/p|\/div|\/li|\/section|\/article|\/main|\/h[1-6]|\/ul|\/ol|\/strong|\/em|\/a|\/span|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<(?:p|div|li|section|article|main|h[1-6]|ul|ol|strong|em|a|span)\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const getFinalUrl = (page, fallbackUrl) => page?.url || page?.finalUrl || fallbackUrl

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
  },
  label: 'desicrew jobs api',
  timeoutMs: 15000,
})

const isOfficialDetailUrl = (value) => {
  try {
    const url = new URL(value)
    return url.hostname.replace(/^www\./i, '').toLowerCase() === 'desicrew.in'
      && /^\/open-job-position\/[a-z0-9-]+\/$/i.test(url.pathname)
  } catch {
    return false
  }
}

const normalizeTitle = (value) => normalizeWhitespace(value)?.replace(/\s+-\s+/g, ' - ') || null

const normalizeArchiveDate = (value) => {
  const normalized = normalizeWhitespace(value)
  const match = normalized?.match(/^(\d{2})\/(\d{2})\/(\d{2})$/)
  if (!match) return normalized || null

  const [, day, month, year] = match
  return `20${year}-${month}-${day}`
}

const extractListItems = (html) => [...String(html ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const normalizeEmploymentType = (value) => {
  const normalized = normalizeOptionalValue(value)
  if (!normalized) return null
  if (/full[\s-]?time/i.test(normalized)) return 'Full-time'
  if (/part[\s-]?time/i.test(normalized)) return 'Part-time'
  if (/contract/i.test(normalized)) return 'Contract'
  if (/intern/i.test(normalized)) return 'Internship'
  if (/permanent/i.test(normalized)) return 'Permanent'
  return normalized
}

const extractEmploymentType = (contentHtml) => {
  const contentText = stripTags(contentHtml)
  const match = contentText.match(/\bJob Types?:\s*([^\n.]+)/i)
  return normalizeEmploymentType(match?.[1])
}

const extractExperienceRequired = (contentHtml) => {
  const contentText = stripTags(contentHtml)
  const explicitMatch = contentText.match(/\bExperience:\s*((?:\d+\s*(?:to|-)\s*\d+|\d+\+?)\s+years?)/i)
  if (explicitMatch?.[1]) return explicitMatch[1]

  const minimumMatch = contentText.match(/\bMinimum of\s*((?:\d+\s*(?:to|-)\s*\d+|\d+\+?)\s+years?)/i)
  if (minimumMatch?.[1]) return minimumMatch[1]

  const genericMatch = contentText.match(/\b((?:\d+\s*(?:to|-)\s*\d+|\d+\+?)\s+years?)\b/i)
  return genericMatch?.[1] || null
}

const buildJobDescription = (contentHtml, location) => {
  const contentText = stripTags(contentHtml)
  const description = [location ? `Location: ${location}` : null, contentText]
    .filter(Boolean)
    .join(' ')

  return normalizeOptionalValue(description)
}

const parseLocation = (value) => {
  const location = normalizeOptionalValue(value)
  if (!location) {
    return {
      location: null,
      city: null,
      state: null,
      country: 'India',
    }
  }

  const normalized = location.toLowerCase()
  if (/[\/]/.test(location) || /\band\b/i.test(location) || /\bcenters?\b/i.test(normalized)) {
    return {
      location,
      city: null,
      state: null,
      country: 'India',
    }
  }

  if (/bangalore/i.test(location) && /remote/i.test(location)) {
    return {
      location,
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
    }
  }

  if (/^\s*bangalore\s*$/i.test(location)) {
    return {
      location,
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
    }
  }

  if (/^\s*chennai\s*$/i.test(location)) {
    return {
      location,
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
    }
  }

  if (/^\s*delhi\s*$/i.test(location)) {
    return {
      location,
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
    }
  }

  return {
    location,
    city: null,
    state: null,
    country: 'India',
  }
}

export const hasOfficialHomepageSignal = (page) => {
  const html = typeof page === 'string' ? page : page?.html
  const status = typeof page === 'string' ? 200 : Number(page?.status)
  const finalUrl = normalizeUrl(getFinalUrl(page, HOMEPAGE_URL))
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return status === 200
    && finalUrl === normalizeUrl(HOMEPAGE_URL)
    && /<title[^>]*>\s*Home\s*-\s*DesiCrew\s*<\/title>/i.test(rawHtml)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/desicrew\.in\/["']/i.test(rawHtml)
    && /href=["']https:\/\/desicrew\.in\/about-us\/careers\/["']/i.test(rawHtml)
    && normalized.includes('Driving greater outcomes')
    && normalized.includes('#GoBeyond and go global')
    && normalized.includes('Trusted by Fortune-500')
    && normalized.includes('Join Us')
}

export const hasOfficialCareersPageSignal = (page) => {
  const html = typeof page === 'string' ? page : page?.html
  const status = typeof page === 'string' ? 200 : Number(page?.status)
  const finalUrl = normalizeUrl(getFinalUrl(page, CAREERS_PAGE_URL))
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return status === 200
    && finalUrl === normalizeUrl(CAREERS_PAGE_URL)
    && /<title[^>]*>\s*Careers\s*-\s*DesiCrew\s*<\/title>/i.test(rawHtml)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/desicrew\.in\/about-us\/careers\/["']/i.test(rawHtml)
    && normalized.includes('Together, we’re a force for good')
    && normalized.includes('See our open roles')
    && rawHtml.includes(JOBS_ARCHIVE_URL)
}

export const hasOfficialJobsArchiveSignal = (page) => {
  const html = typeof page === 'string' ? page : page?.html
  const status = typeof page === 'string' ? 200 : Number(page?.status)
  const finalUrl = normalizeUrl(getFinalUrl(page, JOBS_ARCHIVE_URL))
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return status === 200
    && finalUrl === normalizeUrl(JOBS_ARCHIVE_URL)
    && /<title[^>]*>\s*Open Job Positions\s*-\s*DesiCrew\s*<\/title>/i.test(rawHtml)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/desicrew\.in\/open-job-positions\/["']/i.test(rawHtml)
    && /open-job-positions\/\?feed=rss2/i.test(rawHtml)
    && normalized.includes('Open Job Positions')
    && normalized.includes('Drop your resume')
    && /data-post-link=["']https:\/\/desicrew\.in\/open-job-position\/[a-z0-9-]+\/["']/i.test(rawHtml)
}

export const hasOfficialJobsApiSignal = (payload) =>
  Array.isArray(payload)
  && payload.length > 0
  && payload.every((record) =>
    record?.type === 'open-job-position'
      && record?.status === 'publish'
      && isOfficialDetailUrl(record?.link)
      && normalizeTitle(record?.title?.rendered)
      && normalizeOptionalValue(record?.content?.rendered))

export const hasOfficialJobDetailSignal = (page, sourceUrl) => {
  const html = typeof page === 'string' ? page : page?.html
  const status = typeof page === 'string' ? 200 : Number(page?.status)
  const rawHtml = String(html ?? '')
  const finalUrl = normalizeUrl(getFinalUrl(page, sourceUrl))

  return status === 200
    && finalUrl === normalizeUrl(sourceUrl)
    && new RegExp(`<link[^>]+rel=["']canonical["'][^>]+href=["']${sourceUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'i').test(rawHtml)
    && /<title[^>]*>[\s\S]+?\s*-\s*DesiCrew\s*<\/title>/i.test(rawHtml)
    && /Location:/i.test(rawHtml)
    && /Apply Now/i.test(rawHtml)
    && /Terms and Conditions and Privacy Policy/i.test(rawHtml)
}

export const extractArchiveListings = (html) => {
  const listings = []

  for (const match of String(html ?? '').matchAll(
    /<article class="post-(\d+)\s+open-job-position[\s\S]*?data-post-link="(https:\/\/desicrew\.in\/open-job-position\/[^"]+\/)">[\s\S]*?<h3 class="dce-post-title"><a href="\2">([\s\S]*?)<\/a><\/h3>[\s\S]*?<div class="dce-post-date">([^<]+)<\/div>[\s\S]*?<div class="dce-post-custommeta(?:\s+dce-post-custommeta)?">[\s\S]*?<div>([\s\S]*?)<\/div>/gi,
  )) {
    const jobId = normalizeOptionalValue(match[1])
    const sourceUrl = normalizeOptionalValue(match[2])
    const title = normalizeTitle(match[3])
    const postingDate = normalizeArchiveDate(match[4])
    const location = normalizeOptionalValue(match[5])

    if (!jobId || !sourceUrl || !title || !postingDate || !location || !isOfficialDetailUrl(sourceUrl)) {
      continue
    }

    listings.push({
      jobId,
      title,
      sourceUrl,
      location,
      postingDate,
    })
  }

  if (listings.length === 0) {
    throw new Error('Desi Crew verified open job archive no longer matches the trusted public surface')
  }

  return listings
}

const assertVerifiedApiRecords = (records) => {
  if (!hasOfficialJobsApiSignal(records)) {
    throw new Error('Desi Crew verified open job API no longer matches the trusted public surface')
  }

  return records
}

const findApiRecordForListing = (listing, records) =>
  records.find((record) =>
    String(record?.id) === String(listing?.jobId)
    || normalizeUrl(record?.link) === normalizeUrl(listing?.sourceUrl))

export const buildJobFromListingAndApiRecord = (listing = {}, record = {}) => {
  if (!listing?.jobId || !listing?.sourceUrl || !isOfficialDetailUrl(listing.sourceUrl)) {
    throw new Error('Desi Crew verified open job archive entry is incomplete')
  }

  const matchingRecord = findApiRecordForListing(listing, [record])
  if (!matchingRecord || !hasOfficialJobsApiSignal([matchingRecord])) {
    throw new Error('Desi Crew verified open job API record no longer matches the archive surface')
  }

  const contentHtml = String(matchingRecord.content?.rendered ?? '')
  const title = normalizeTitle(listing.title || matchingRecord.title?.rendered)
  const locationBits = parseLocation(listing.location)

  return {
    title,
    company: COMPANY_NAME,
    department: null,
    location: locationBits.location,
    city: locationBits.city,
    state: locationBits.state,
    country: locationBits.country,
    jobId: String(listing.jobId),
    requisitionId: String(listing.jobId),
    sourceUrl: listing.sourceUrl,
    applyUrl: listing.sourceUrl,
    employmentType: extractEmploymentType(contentHtml),
    experienceRequired: extractExperienceRequired(contentHtml),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: extractListItems(contentHtml),
    postingDate: listing.postingDate,
    closingDate: null,
    jobDescription: buildJobDescription(contentHtml, listing.location),
  }
}

const normalizeScrapedAt = (value) => {
  if (value instanceof Date) return value.toISOString()

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid now() value supplied to Desi Crew scraper')
  }

  return parsed.toISOString()
}

export const createDesiCrewScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  pageSize = PAGE_SIZE,
  now = () => new Date(),
} = {}) => ({
  async run(options = {}) {
    const fetchPage = options.fetchPage || defaultFetchPage
    const fetchJson = options.fetchJson || defaultFetchJson

    const homepagePage = await fetchPage(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepagePage)) {
      throw new Error('Desi Crew verified homepage no longer matches the trusted first-party surface')
    }

    const careersPage = await fetchPage(CAREERS_PAGE_URL)
    if (!hasOfficialCareersPageSignal(careersPage)) {
      throw new Error('Desi Crew verified careers page no longer matches the trusted first-party surface')
    }

    const archivePage = await fetchPage(JOBS_ARCHIVE_URL)
    if (!hasOfficialJobsArchiveSignal(archivePage)) {
      throw new Error('Desi Crew verified open job archive no longer matches the trusted public surface')
    }

    const listings = extractArchiveListings(archivePage.html)
    const apiRecords = []

    for (let page = 1; ; page += 1) {
      const pageRecords = assertVerifiedApiRecords(await fetchJson(buildJobsApiUrl(page, pageSize)))
      apiRecords.push(...pageRecords)

      if (pageRecords.length < pageSize) break
    }

    const limit = Number.isInteger(options.maxJobs) ? options.maxJobs : maxJobs
    const selectedListings = limit ? listings.slice(0, limit) : listings
    const scrapedAt = normalizeScrapedAt((options.now || now)())
    const jobs = []

    for (const listing of selectedListings) {
      const detailPage = await fetchPage(listing.sourceUrl)
      if (!hasOfficialJobDetailSignal(detailPage, listing.sourceUrl)) {
        throw new Error(`Desi Crew verified detail page no longer matches the trusted apply surface: ${listing.sourceUrl}`)
      }

      const record = findApiRecordForListing(listing, apiRecords)
      if (!record) {
        throw new Error(`Desi Crew verified open job API no longer includes ${listing.sourceUrl}`)
      }

      const job = buildJobFromListingAndApiRecord(listing, record)
      jobs.push({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt,
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createDesiCrewScraper().run(options)

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
