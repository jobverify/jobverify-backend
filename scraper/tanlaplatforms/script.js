import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { TANLA_PLATFORMS_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_AT = PROVIDER_METADATA.verifiedOn
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const OFFICIAL_CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const OFFICIAL_JOBS_HANDOFF_URL = PROVIDER_METADATA.officialJobsHandoffUrl
export const VERIFIED_SAMPLE_JOB_URL = PROVIDER_METADATA.verifiedSampleJobUrl
export const COUNTRY_FILTER = PROVIDER_METADATA.countryFilter

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&ndash;|&#8211;/gi, '-')
  .replace(/&mdash;|&#8212;/gi, '-')
  .replace(/&amp;/gi, '&')

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
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeUrl = (value) => {
  try {
    return new URL(value).href.replace(/\/$/, '')
  } catch {
    return normalizeWhitespace(value)
  }
}

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  if (/\sIN$/i.test(normalized)) {
    return normalized.replace(/\sIN$/i, ', India')
  }

  return normalized
}

const cityFromLocation = (value) => normalizeLocation(value)?.split(',')[0]?.trim() || null

const countryFromLocation = (value) => /india$/i.test(normalizeLocation(value) || '')
  ? COUNTRY_FILTER
  : null

const jobIdFromUrl = (url) => normalizeWhitespace(url)?.split('/').pop() || null

const unique = (values) => [...new Set(values.filter(Boolean))]

const extractSectionHtml = (html, heading) => {
  const escapedHeading = escapeRegExp(heading)
  const match = String(html ?? '').match(
    new RegExp(
      `<h[1-6][^>]*>\\s*${escapedHeading}\\s*<\\/h[1-6]>([\\s\\S]*?)(?=<h[1-6][^>]*>|$)`,
      'i',
    ),
  )

  return match?.[1] ?? ''
}

const extractSectionList = (html, heading) => {
  const sectionHtml = extractSectionHtml(html, heading)
  const items = [...sectionHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)

  return unique(items)
}

const buildDescription = (html) => {
  const sections = [
    'Job Role',
    "What you'll be responsible for?",
    'Qualification and other skills',
    "What you'd have?",
    'Why join us?',
  ]

  const parts = sections
    .map((heading) => stripTags(extractSectionHtml(html, heading)))
    .filter(Boolean)

  return normalizeWhitespace(parts.join(' '))
}

const extractExperienceRequired = (html) => {
  const text = stripTags(extractSectionHtml(html, "What you'd have?")) || ''
  const rangeMatch = text.match(/\b(\d+\s*-\s*\d+)\s+years?\b/i)
  if (rangeMatch) return normalizeWhitespace(`${rangeMatch[1]} years`)

  const plusMatch = text.match(/\b(\d+\+)\s+years?\b/i)
  if (plusMatch) return normalizeWhitespace(`${plusMatch[1]} years`)

  return null
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

export const extractOfficialJobsListingUrl = (html = '') => {
  const match = String(html ?? '').match(/https:\/\/www\.tanla\.com\/careers\/jobs-listing/i)
  return match?.[0] ?? null
}

export const pageExposesPublicJobListings = (html = '') =>
  /https:\/\/www\.tanla\.com\/job-info\/[a-z0-9-]+/i.test(String(html ?? ''))
  && />\s*Apply\s*</i.test(String(html ?? ''))

export const hasOfficialCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return text.includes('Embark on a journey of Endless Possibilities')
    && text.includes('Invent. Disrupt. Repeat. Join our league of innovators!')
    && new RegExp(
      `<a[^>]+href=["']${OFFICIAL_JOBS_HANDOFF_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>\\s*Explore Jobs\\s*<`,
      'i',
    ).test(page)
    && extractOfficialJobsListingUrl(html) === OFFICIAL_JOBS_HANDOFF_URL
  }

export const hasOfficialJobsListingSignal = (html = '') => {
  const text = stripTags(html) || ''

  return text.includes('Tanla Jobs')
    && text.includes('Live your best life and do your best work with us')
    && pageExposesPublicJobListings(html)
}

export const extractListingCards = (html = '') => {
  const cards = []
  const cardRegex = /<section[^>]*class=["'][^"']*job-card[^"']*["'][^>]*>([\s\S]*?)<\/section>/gi

  for (const match of String(html ?? '').matchAll(cardRegex)) {
    const cardHtml = match[1]
    const title = normalizeWhitespace(cardHtml.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1])
    const location = normalizeWhitespace(
      cardHtml.match(/Location\s*<\/h[1-6]>\s*<p[^>]*>([\s\S]*?)<\/p>/i)?.[1],
    )
    const department = normalizeWhitespace(
      cardHtml.match(/Department\s*<\/h[1-6]>\s*<p[^>]*>([\s\S]*?)<\/p>/i)?.[1],
    )
    const sourceUrl = normalizeWhitespace(
      cardHtml.match(/<a[^>]+href=["'](https:\/\/www\.tanla\.com\/job-info\/[a-z0-9-]+)["'][^>]*>\s*Apply\s*<\/a>/i)?.[1],
    )

    if (title && location && department && sourceUrl) {
      cards.push({ title, department, location, sourceUrl })
    }
  }

  return cards
}

const hasVerifiedDetailPageSignal = (html = '', listing = {}) => {
  const text = stripTags(html) || ''
  const expectedTitle = normalizeWhitespace(listing.title)
  const expectedDepartment = normalizeWhitespace(listing.department)
  const expectedLocation = normalizeWhitespace(listing.location)

  return text.includes(expectedTitle || '')
    && text.includes(expectedDepartment || '')
    && text.includes(expectedLocation || '')
    && /Tanla is an equal opportunity employer\./i.test(text)
    && /Job Role/i.test(text)
}

export const extractJobDetail = (html = '', listing = {}) => {
  const normalizedLocation = normalizeLocation(listing.location)
  const detailUrl = normalizeUrl(listing.sourceUrl)

  return {
    title: normalizeWhitespace(listing.title),
    company: COMPANY_NAME,
    department: normalizeWhitespace(listing.department),
    location: normalizedLocation,
    city: cityFromLocation(normalizedLocation),
    country: countryFromLocation(normalizedLocation),
    jobId: jobIdFromUrl(detailUrl),
    requisitionId: jobIdFromUrl(detailUrl),
    sourceUrl: detailUrl,
    applyUrl: detailUrl,
    employmentType: null,
    experienceRequired: extractExperienceRequired(html),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: extractSectionList(html, 'Qualification and other skills'),
    postingDate: null,
    closingDate: null,
    jobDescription: buildDescription(html),
  }
}

export const createTanlaPlatformsScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  fetchText = defaultFetchText,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run() {
    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)
    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Tanla Platforms verified Tanla careers page no longer matches the known first-party handoff')
    }

    const listingUrl = extractOfficialJobsListingUrl(careersHtml)
    if (listingUrl !== OFFICIAL_JOBS_HANDOFF_URL) {
      throw new Error('Tanla Platforms verified Tanla careers handoff no longer matches the known jobs listing URL')
    }

    const jobsListingHtml = await fetchText(OFFICIAL_JOBS_HANDOFF_URL)
    if (!hasOfficialJobsListingSignal(jobsListingHtml)) {
      throw new Error('Tanla Platforms verified Tanla jobs listing page no longer matches the known public board')
    }

    const listings = extractListingCards(jobsListingHtml)
    if (listings.length === 0) {
      throw new Error('Tanla Platforms verified Tanla jobs listing page no longer exposes parseable first-party roles')
    }

    const jobs = []
    for (const listing of listings) {
      const detailHtml = await fetchText(listing.sourceUrl)
      if (!hasVerifiedDetailPageSignal(detailHtml, listing)) {
        throw new Error('Tanla Platforms verified Tanla detail page no longer matches the known first-party job contract')
      }

      jobs.push({
        ...extractJobDetail(detailHtml, listing),
        source: SOURCE,
        link: normalizeUrl(listing.sourceUrl),
        scrapedAt: now(),
      })

      if (maxJobs && jobs.length >= maxJobs) {
        return jobs
      }
    }

    return jobs
  },
})

export const run = async (options = {}) => createTanlaPlatformsScraper(options).run()

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
