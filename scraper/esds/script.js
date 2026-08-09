import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDarwinboxScraper } from '../darwinbox/script.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'

import { ESDS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = ESDS_CATALOG.source
export const COMPANY = ESDS_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = ESDS_CATALOG.officialBrandName
export const VERIFIED_ON = ESDS_CATALOG.verifiedOn
export const HOMEPAGE_URL = ESDS_CATALOG.officialHomepageUrl
export const CAREERS_URL = ESDS_CATALOG.officialCareersLandingUrl
export const OFFICIAL_CAREERS_HANDOFF_URL = ESDS_CATALOG.officialCareersHandoffUrl
export const DARWINBOX_ORIGIN = ESDS_CATALOG.darwinboxOrigin
export const DARWINBOX_COMPANY_ID = ESDS_CATALOG.darwinboxCompanyId
export const PUBLIC_PORTAL_URL = ESDS_CATALOG.publicAllJobsUrl
export const PROVIDER_METADATA = ESDS_CATALOG

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const darwinboxScraper = createDarwinboxScraper({
  companyName: COMPANY,
  source: SOURCE,
  companyId: DARWINBOX_COMPANY_ID,
  origin: DARWINBOX_ORIGIN,
})

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/td)\b[^>]*>/gi, '\n')
    .replace(/<(p|div|li|h[1-6]|td)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const toAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  if (!value) return null

  try {
    return new URL(decodeHtmlEntities(value), baseUrl).toString().replace(/\/+$/g, '')
  } catch {
    return null
  }
}

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? transform(match) : null
}

const extractListItems = (html) => [...String(html ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const extractLabelValueMap = (items = []) => {
  const labeledEntries = items
    .map((item) => {
      const separatorIndex = item.indexOf(':')
      if (separatorIndex === -1) return null

      const key = normalizeWhitespace(item.slice(0, separatorIndex))?.toLowerCase()
      const value = normalizeWhitespace(item.slice(separatorIndex + 1))
      if (!key || !value) return null
      return [key, value]
    })
    .filter(Boolean)

  return new Map(labeledEntries)
}

const extractPrimaryCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null

  const firstToken = normalized.split(',')[0]?.trim()
  if (!firstToken) return null

  return normalizeCity(firstToken) || firstToken
}

const normalizeDetailLocation = (value) => {
  const raw = String(value ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')

  const lines = decodeHtmlEntities(raw)
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)
    .map((line) => line.replace(/\s*\([^)]*\)\s*$/g, '').trim())
    .filter(Boolean)

  return lines.join(', ') || null
}

const extractTableFieldMap = (html) => {
  const fields = new Map()

  for (const match of String(html ?? '').matchAll(
    /<tr>\s*<td[^>]*>\s*<strong>([\s\S]*?)<\/strong>\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi,
  )) {
    const key = normalizeWhitespace(match[1])?.toLowerCase()
    const value = key === 'location(s)'
      ? normalizeDetailLocation(match[2])
      : stripTags(match[2])

    if (key && value) {
      fields.set(key, value)
    }
  }

  return fields
}

const matchesVerifiedCompanyName = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return true

  return /^esds(?:\s+software\s+solution\s+limited)?$/i.test(normalized)
}

const isIndiaJob = (job = {}) => {
  const country = normalizeWhitespace(job.country)
  if (country && /^india$/i.test(country)) return true

  return /india/i.test(normalizeWhitespace(job.location) || '')
}

const normalizeJobId = (value) => normalizeWhitespace(value)

const filterToVerifiedPublicJobs = (firstPartyListings = [], darwinboxJobs = []) => {
  const verifiedJobIds = new Set(
    firstPartyListings
      .map((listing) => normalizeJobId(listing.jobId))
      .filter(Boolean),
  )

  return darwinboxJobs.filter((job) => verifiedJobIds.has(normalizeJobId(job.jobId)))
}

export const buildDetailUrl = (jobId) =>
  `https://www.esds.co.in/career-details/${normalizeWhitespace(jobId) || ''}`

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Careers at ESDS \| IT and Cloud Job Opportunities\s*<\/title>/i.test(page)
    && /Life at ESDS/i.test(page)
    && /Jobs of the day/i.test(page)
    && /career-details\//i.test(page)
}

export const hasOfficialJobDetailSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Life at ESDS\s*<\/title>/i.test(page)
    && /Job Title/i.test(page)
    && /Company/i.test(page)
    && /Department/i.test(page)
    && /Employee Type/i.test(page)
    && /Location\(s\)/i.test(page)
    && /Country/i.test(page)
    && /Apply Now/i.test(page)
    && /https:\/\/esds\.darwinbox\.in\/ms\/candidate\/candidate\/login\?redirect=/i.test(page)
}

export const hasDarwinboxShellFallbackSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*<\/title>/i.test(page)
    && /<base href="\/ms\/candidatev2\/">/i.test(page)
    && /db-components(?:\.esm)?\.js/i.test(page)
    && /\/ms\/formbuilder\/assets\/db-form\/db-form\.js/i.test(page)
}

export const extractDarwinboxApplyUrl = (html) => toAbsoluteUrl(
  extractFirst(
    /https:\/\/esds\.darwinbox\.in\/ms\/candidate\/candidate\/login\?redirect=[^"'\\\s<]+/i,
    html,
    (match) => match[0],
  ),
  HOMEPAGE_URL,
)

export const extractJobCards = (html) => [...String(html ?? '').matchAll(
  /window\.location='([^']*career-details\/[^']+)'[\s\S]*?<h5><a[^>]*>([\s\S]*?)<\/a><\/h5>[\s\S]*?<ul>([\s\S]*?)<\/ul>\s*<ol class="autoplaySlider">([\s\S]*?)<\/ol>[\s\S]*?<p class="m-0">([\s\S]*?)<\/p>/gi,
)]
  .map((match) => {
    const sourceUrl = toAbsoluteUrl(match[1])
    const title = stripTags(match[2])
    const summaryItems = extractListItems(match[3])
    const detailItems = extractListItems(match[4])
    const detailMap = extractLabelValueMap(detailItems)
    const location = stripTags(match[5])
    const jobId = normalizeWhitespace(detailMap.get('job id'))
      || normalizeWhitespace(sourceUrl?.split('/').pop())

    if (!title || !location || !jobId || !sourceUrl) return null

    const expectedSourceUrl = buildDetailUrl(jobId)
    if (sourceUrl !== expectedSourceUrl) {
      throw new Error('ESDS verified official careers surface no longer exposes the expected first-party detail routes')
    }

    return {
      title,
      company: COMPANY,
      department: normalizeWhitespace(detailMap.get('department')),
      location,
      city: extractPrimaryCity(location),
      country: null,
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: summaryItems[0] || null,
      experienceRequired: normalizeWhitespace(detailMap.get('experience (years)')),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: summaryItems[1] || null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: null,
    }
  })
  .filter(Boolean)

export const extractJobDetail = (html, listing = {}) => {
  const fields = extractTableFieldMap(html)
  const detailTitle = normalizeWhitespace(fields.get('job title'))
  const detailCompany = normalizeWhitespace(fields.get('company'))
  const detailDepartment = normalizeWhitespace(fields.get('department'))
  const detailLocation = normalizeWhitespace(fields.get('location(s)'))
  const detailCountry = normalizeWhitespace(fields.get('country'))
  const detailExperience = normalizeWhitespace(fields.get('experience required'))
  const detailEmploymentType = normalizeWhitespace(fields.get('employee type'))
  const applyUrl = extractDarwinboxApplyUrl(html)

  if (detailTitle && listing.title && detailTitle.toLowerCase() !== listing.title.toLowerCase()) {
    throw new Error('ESDS verified public detail/apply surface no longer matches the first-party listing titles')
  }

  if (!matchesVerifiedCompanyName(detailCompany)) {
    throw new Error('ESDS verified public detail/apply surface no longer maps to the verified company identity')
  }

  return {
    ...listing,
    title: detailTitle || listing.title || null,
    company: COMPANY,
    department: detailDepartment || listing.department || null,
    location: listing.location || detailLocation || null,
    city: listing.city || extractPrimaryCity(detailLocation) || null,
    country: detailCountry || listing.country || null,
    applyUrl: applyUrl || listing.applyUrl || null,
    employmentType: detailEmploymentType || listing.employmentType || null,
    experienceRequired: detailExperience || listing.experienceRequired || null,
    jobDescription: null,
    requiredSkills: [],
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

export const createEsdsScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    maxPages = config.maxPages,
    fetchText = defaultFetchText,
    fetchListingPage,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('ESDS verified official careers surface no longer matches the first-party contract')
    }

    const firstPartyListings = extractJobCards(careersHtml)
    if (firstPartyListings.length === 0) {
      throw new Error('ESDS verified official careers surface no longer exposes the expected job cards')
    }

    const darwinboxJobs = await darwinboxScraper.run({
      maxPages,
      maxJobs,
      fetchListingPage,
    })
    const verifiedPublicJobs = filterToVerifiedPublicJobs(firstPartyListings, darwinboxJobs)

    if (verifiedPublicJobs.length === 0) {
      throw new Error('ESDS verified first-party careers surface no longer lines up with the live Darwinbox public jobs portal')
    }

    const scrapedAt = now()
    const selectedJobs = Number.isInteger(maxJobs)
      ? verifiedPublicJobs.slice(0, maxJobs)
      : verifiedPublicJobs

    return selectedJobs
      .filter((job) => isIndiaJob(job))
      .map((job) => ({
        ...job,
        country: normalizeWhitespace(job.country) || 'India',
        scrapedAt,
      }))
  },
})

export const run = async (options = {}) => createEsdsScraper(options).run(options)

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
