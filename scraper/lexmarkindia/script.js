import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCity } from '../utils/cityNormalizer.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

import { LEXMARK_INDIA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = LEXMARK_INDIA_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const JOB_SEARCH_URL = PROVIDER_METADATA.jobSearchUrl
export const VERIFIED_SAMPLE_JOB_URL = PROVIDER_METADATA.verifiedSampleJobUrl
export const VERIFIED_PUBLIC_JOB_COUNT = PROVIDER_METADATA.verifiedPublicJobCount
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
    .replace(/[â€™â€˜]/g, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripHtml = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const toAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return /Careers at Lexmark India/i.test(page)
    && normalized.includes('Compensations and Benefits')
    && normalized.includes('Lexmark India, located in Kolkata, is one of the research and development centers of Lexmark International Inc.')
    && normalized.includes('Job Listings')
    && normalized.includes('View Jobs Now')
  }

export const hasOfficialJobSearchSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return /Search All Jobs\s*\|\s*Lexmark India/i.test(page)
    && normalized.includes('Search All Jobs')
    && /\bJobs Found\b/i.test(normalized)
    && /\/en_in\/careers\/job-description\.\d+\.html/i.test(page)
  }

export const extractListingRows = (html = '') => {
  const rows = []
  const page = String(html ?? '')
  const rowPattern = /<tr>\s*<td><a href="([^"]*job-description\.(\d+)\.html)">([\s\S]*?)<\/a><\/td>\s*<td>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/td>\s*<td>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/td>\s*<\/tr>/gi

  for (const match of page.matchAll(rowPattern)) {
    const sourceUrl = toAbsoluteUrl(match[1], JOB_SEARCH_URL)
    const jobId = normalizeWhitespace(match[2])
    if (!sourceUrl || !jobId) continue

    rows.push({
      title: stripHtml(match[3]),
      location: stripHtml(match[4]),
      department: stripHtml(match[5]),
      sourceUrl,
      jobId,
    })
  }

  return rows
}

const extractDetailField = (html = '', label) =>
  stripHtml(
    String(html ?? '').match(
      new RegExp(`<h5[^>]*>\\s*<strong>${label}:<\\/strong>\\s*<\\/h5>\\s*<p>([\\s\\S]*?)<\\/p>`, 'i'),
    )?.[1],
  )

const extractApplyUrl = (html = '') =>
  toAbsoluteUrl(
    String(html ?? '').match(/<a class="call-to-action" href="([^"]+)"/i)?.[1],
    CAREERS_URL,
  )

const extractDetailTitle = (html = '') =>
  stripHtml(String(html ?? '').match(/<div class="col-3-4">[\s\S]*?<h1>([\s\S]*?)<\/h1>/i)?.[1])

export const hasOfficialJobDetailSignal = (html = '', detailUrl) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''
  const title = extractDetailTitle(page)
  const applyUrl = extractApplyUrl(page)

  return /Job Description\s*\|\s*Lexmark India/i.test(page)
    && Boolean(detailUrl)
    && Boolean(title)
    && normalized.includes('Job Title:')
    && normalized.includes('Business Area:')
    && normalized.includes('Location:')
    && normalized.includes('Job ID:')
    && Boolean(applyUrl)
  }

const extractJobDescription = (html = '') => {
  const content = String(html ?? '').match(/<div class="col-3-4">([\s\S]*?)<\/div>\s*<\/div>/i)?.[1]
  return stripHtml(content)
}

const extractExperienceRequired = (html = '') => {
  const normalized = extractJobDescription(html) || ''
  const match = normalized.match(/\b(\d+\+\s*Years|\d+\+\s*years)\b/)
  return match?.[1] || null
}

const extractMinimumQualification = (html = '') => {
  const normalized = extractJobDescription(html) || ''
  const match = normalized.match(/\bQualification:\s*([^.]*(?:\.[^A-Z]|\.|$))/i)
  return normalizeWhitespace(match?.[1]) || null
}

const deriveCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  return normalizeCity(normalized.split(',')[0]?.trim() || normalized)
}

const mapListingToJob = (listing, detailHtml, scrapedAt) => {
  const title = extractDetailTitle(detailHtml) || listing.title
  const department = extractDetailField(detailHtml, 'Business Area') || listing.department
  const location = extractDetailField(detailHtml, 'Location') || listing.location
  const jobId = extractDetailField(detailHtml, 'Job ID') || listing.jobId
  const applyUrl = extractApplyUrl(detailHtml)

  if (!title || !location || !jobId || !applyUrl) return null

  return {
    title,
    company: COMPANY_NAME,
    department,
    location,
    city: deriveCity(location),
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl: listing.sourceUrl,
    applyUrl,
    source: SOURCE,
    link: listing.sourceUrl,
    employmentType: null,
    experienceRequired: extractExperienceRequired(detailHtml),
    minimumQualification: extractMinimumQualification(detailHtml),
    preferredQualification: null,
    requiredSkills: [],
    jobDescription: extractJobDescription(detailHtml),
    remoteStatus: 'On-site',
    scrapedAt,
  }
}

export const createLexmarkIndiaScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Lexmark India verified careers landing page no longer matches the trusted public surface')
    }

    const jobSearchHtml = await fetchText(JOB_SEARCH_URL)
    if (!hasOfficialJobSearchSignal(jobSearchHtml)) {
      throw new Error('Lexmark India verified job search page no longer matches the trusted public surface')
    }

    const listings = extractListingRows(jobSearchHtml)
    if (listings.length === 0) {
      throw new Error('Lexmark India job search page no longer exposes the verified first-party job rows')
    }

    const jobs = []

    for (const listing of listings) {
      const detailHtml = await fetchText(listing.sourceUrl)
      if (!hasOfficialJobDetailSignal(detailHtml, listing.sourceUrl)) {
        throw new Error(`Lexmark India job detail page no longer matches the trusted public surface: ${listing.sourceUrl}`)
      }

      const mappedJob = mapListingToJob(listing, detailHtml, now())
      if (mappedJob) jobs.push(mappedJob)
    }

    return jobs
  },
})

export const run = async (options = {}) => createLexmarkIndiaScraper(options).run(options)

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
