import path from 'path'
import { fileURLToPath } from 'url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const SOURCE = 'sutherlandglobal'
const COMPANY = 'Sutherland Global'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

export const CAREER_PAGE_URL = 'https://www.jobs.sutherlandglobal.com/'
export const JOB_RESULTS_PAGE_URL = 'https://www.jobs.sutherlandglobal.com/job-results'
export const ACTION_URL = 'https://shazamme.io/Job-Listing/src/php/actions'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const decodeHtml = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>'),
)

const stripTags = (value) => decodeHtml(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<h[1-6]\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const normalizeLocationToken = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/^[^a-z0-9]+/i, '')
    .replace(/[^a-z0-9]+$/i, ''),
)

const normalizeCountry = (value) => normalizeWhitespace(value)

const absoluteUrl = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, JOB_RESULTS_PAGE_URL).toString()
  } catch {
    return null
  }
}

const buildLocation = (record = {}) => {
  const city = normalizeLocationToken(record.city)
  const state = normalizeLocationToken(record.state)
  const country = normalizeCountry(record.country)
  const fullAddress = normalizeWhitespace(record.fullAddress)

  const parts = [city, state, country].filter(Boolean)
  if (parts.length > 0) return parts.join(', ')
  if (fullAddress) return fullAddress.replace(/\s*,\s*/g, ', ')
  return null
}

const normalizePostedDate = (value, fallback = null) => {
  const normalized = normalizeWhitespace(value)
  const mmDdYyyyMatch = normalized?.match(/^(\d{2})-(\d{2})-(\d{4})$/)

  if (mmDdYyyyMatch) {
    const [, month, day, year] = mmDdYyyyMatch
    return `${year}-${month}-${day}`
  }

  const isoDateMatch = normalizeWhitespace(fallback)?.match(/^(\d{4}-\d{2}-\d{2})T/)
  if (isoDateMatch) {
    return isoDateMatch[1]
  }

  return normalized
}

const extractExperienceRequired = (description) => {
  const text = normalizeWhitespace(description)
  if (!text) return null

  const match = text.match(/\b(\d+\+?\s*(?:-|to)\s*\d+\+?\s*years?|\d+\+?\s*years?)\b/i)
  return normalizeWhitespace(match?.[1]) || null
}

const inferEmploymentType = (record = {}) => {
  const workType = normalizeWhitespace(record.workType)?.toLowerCase() || ''
  const workTypeGoogleSeo = normalizeWhitespace(record.workTypeGoogleSEO)?.toUpperCase() || ''
  const title = normalizeWhitespace(record.jobName)?.toLowerCase() || ''

  if (workTypeGoogleSeo === 'TEMPORARY' || workType.includes('temporary')) return 'Contract'
  if (/intern|internship|trainee|apprentice/i.test(title)) return 'Internship'
  return 'Full-time'
}

const inferRemoteStatus = (record = {}) => {
  const workType = normalizeWhitespace(record.workType)?.toLowerCase() || ''
  const location = normalizeWhitespace(record.location)?.toLowerCase() || ''

  if (workType.includes('wah') || workType.includes('work at home') || location.includes('remote')) {
    return 'Remote'
  }
  if (workType.includes('hybrid')) return 'Hybrid'
  if (workType.includes('brick and mortar')) return 'On-site'
  return null
}

export const hasOfficialSearchSurface = (html) => {
  const source = String(html ?? '')

  return /<title[^>]*>\s*Job Results\s*\|\s*Sutherland\s*<\/title>/i.test(source)
    && /A Great Place to Work and Propel Your Career Growth/i.test(source)
    && /Your search resulted in:/i.test(source)
    && /Shazamme/i.test(source)
}

export const extractFeedConfig = (html) => {
  const source = String(html ?? '')
  const actionUrl = normalizeWhitespace(source.match(/ActionUrl\s*=\s*['"]([^'"]+)['"]/i)?.[1])
  const siteAlias = normalizeWhitespace(
    source.match(/SiteAlias\s*[:=]\s*['"]([a-z0-9]+)['"]/i)?.[1]
      || source.match(/_dm_gaq\.siteAlias\s*=\s*['"]([a-z0-9]+)['"]/i)?.[1],
  )

  if (!actionUrl || !siteAlias) return null

  return {
    actionUrl,
    siteAlias,
  }
}

export const buildFeedUrl = ({ actionUrl = ACTION_URL, siteAlias }) => {
  const url = new URL(actionUrl)
  url.searchParams.set('dudaSiteID', siteAlias)
  url.searchParams.set('action', 'Get Jobs')
  return url.toString()
}

const mapJob = (rawRecord) => {
  const record = rawRecord?.data ?? rawRecord
  const title = normalizeWhitespace(record?.jobName)
  const country = normalizeCountry(record?.country)
  const sourceUrl = absoluteUrl(record?.jobURL)
  const applyUrl = absoluteUrl(record?.applicationURL) || sourceUrl

  if (!title || country !== 'India' || record?.activeStatus === false || !sourceUrl) {
    return null
  }

  const location = buildLocation(record)
  const description = stripTags(record?.fullDescription || record?.shortDescription)

  return {
    title,
    company: COMPANY,
    location,
    city: normalizeLocationToken(record?.city),
    state: normalizeLocationToken(record?.state),
    country,
    department: normalizeWhitespace(record?.category || record?.customField1),
    jobCategory: normalizeWhitespace(record?.category),
    jobId: normalizeWhitespace(record?.jobID),
    requisitionId: normalizeWhitespace(record?.referenceNumber),
    sourceUrl,
    applyUrl,
    employmentType: inferEmploymentType(record),
    experienceRequired: extractExperienceRequired(description),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: normalizePostedDate(record?.postedDate, record?.addedOnUTC),
    closingDate: normalizePostedDate(record?.expiryDate, record?.jobEndDate),
    jobDescription: description,
    remoteStatus: inferRemoteStatus(record),
  }
}

export const extractIndiaJobs = (payload = []) => {
  if (!Array.isArray(payload)) return []
  return payload.map(mapJob).filter(Boolean)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
    Referer: JOB_RESULTS_PAGE_URL,
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createSutherlandGlobalScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, fetchJson = defaultFetchJson } = {}) {
    const pageHtml = await fetchText(JOB_RESULTS_PAGE_URL)

    if (!hasOfficialSearchSurface(pageHtml)) {
      throw new Error('Sutherland Global official Sutherland public search surface no longer matches the verified job-results page')
    }

    const feedConfig = extractFeedConfig(pageHtml)

    if (!feedConfig) {
      throw new Error('Sutherland Global official search page no longer exposes the verified public Shazamme feed config')
    }

    const jobs = extractIndiaJobs(await fetchJson(buildFeedUrl(feedConfig)))

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createSutherlandGlobalScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Sutherland Global scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, SOURCE)
    console.log('DB result:', result)
    process.exit(0)
  }
}
