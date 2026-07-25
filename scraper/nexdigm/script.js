import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { normalizeCity } from '../utils/cityNormalizer.js'
import NEXDIGM_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = NEXDIGM_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const HOMEPAGE_URL = PROVIDER_METADATA.officialHomepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const CURRENT_OPENINGS_URL = PROVIDER_METADATA.officialCurrentOpeningsUrl
export const CAREER_DETAILS_BASE_URL = PROVIDER_METADATA.officialCareerDetailsBaseUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/\u00a0/g, ' ')

const stripTags = (value) => decodeHtmlEntities(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/p>/gi, '\n')
  .replace(/<\/div>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')

const normalizeWhitespace = (value) => stripTags(value)
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n[ \t]+/g, '\n')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n+/g, '\n')
  .trim()

const normalizeInlineText = (value) =>
  normalizeWhitespace(value)
    .replace(/\s+/g, ' ')
    .trim() || null

const normalizeComparableUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''), HOMEPAGE_URL)
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return String(value ?? '').replace(/\/$/, '')
  }
}

const sameUrl = (left, right) => normalizeComparableUrl(left) === normalizeComparableUrl(right)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  attempts: 3,
  baseDelayMs: 2000,
  timeoutMs: 20000,
  label: SOURCE,
})

const extractHrefMatches = (html = '') =>
  Array.from(String(html ?? '').matchAll(/href=["']([^"']+)["']/gi), (match) => match[1])

const extractMetaValue = (html = '', label) => {
  const escaped = String(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = String(html ?? '').match(
    new RegExp(`<b>\\s*${escaped}\\s*<\\/b><\\/span>\\s*<span>([\\s\\S]*?)<\\/span>`, 'i'),
  )

  return normalizeInlineText(match?.[1])
}

const extractContentValue = (html = '', label) => {
  const escaped = String(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = String(html ?? '').match(
    new RegExp(`${escaped}\\s*<\\/b><\\/span>([\\s\\S]*?)<\\/p>`, 'i'),
  )

  return normalizeInlineText(match?.[1])
}

const normalizeOfficeLocation = (value) => {
  const normalized = normalizeInlineText(value)
  if (!normalized) return null

  return normalized
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ', ')
    .replace(/,\s*$/g, '')
    .trim()
}

const extractOfficeLocations = (html = '') => {
  const escaped = 'Office Location :'
  const match = String(html ?? '').match(
    new RegExp(`${escaped}\\s*<\\/b><\\/span>([\\s\\S]*?)<\\/p>`, 'i'),
  )
  if (!match?.[1]) return []

  return match[1]
    .split(/<br\s*\/?>/i)
    .map((value) => normalizeOfficeLocation(value))
    .filter(Boolean)
}

const extractJobIdFromUrl = (url) => {
  try {
    return new URL(String(url ?? ''), HOMEPAGE_URL).searchParams.get('id') || null
  } catch {
    return null
  }
}

const extractDetailTitle = (html = '') => {
  const match = String(html ?? '').match(
    /class=["']main-hd result-heading["'][^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i,
  )

  return normalizeInlineText(match?.[1])
}

const extractDetailValue = (html = '', label) => {
  const escaped = String(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = String(html ?? '').match(
    new RegExp(
      `<div class=["']result-left["']>\\s*${escaped}\\s*<\\/div>\\s*<div class=["']result-right["']>([\\s\\S]*?)<\\/div>`,
      'i',
    ),
  )

  return normalizeInlineText(match?.[1])
}

const extractEmployeeType = (html = '') => {
  const match = String(html ?? '').match(
    /<div class=["']job-title["']>\s*Employee Type\s*<\/div>\s*([\s\S]*?)\s*<\/div>/i,
  )

  return normalizeInlineText(match?.[1])
}

const extractApplyUrl = (html = '') => {
  const match = String(html ?? '').match(/onclick=["']apply\('([^']+)'\);?["']/i)
  return normalizeInlineText(match?.[1])
}

const extractJobDescription = (html = '') => {
  const page = String(html ?? '')
  const marker = /<div class=["']job-title["']>\s*Job Description\s*<\/div>/i.exec(page)
  if (!marker) return null

  const startIndex = marker.index + marker[0].length
  const remainder = page.slice(startIndex)
  const endCandidates = [
    remainder.search(/<input class=["']btn["'][^>]*value=["']Apply["']/i),
    remainder.search(/<a[^>]+href=["']https:\/\/www\.nexdigm\.com\/careers\/current-openings\/["']/i),
    remainder.search(/<h2[^>]*>\s*Join our mailing list/i),
  ].filter((value) => value >= 0)

  const endIndex = endCandidates.length > 0 ? Math.min(...endCandidates) : remainder.length
  return normalizeInlineText(remainder.slice(0, endIndex))
}

const buildFallbackLocation = (city) => {
  const normalizedCity = normalizeCity(city || '')
  return normalizedCity ? `${normalizedCity}, India` : null
}

const normalizeDetailUrlFromId = (jobId) => {
  if (!jobId) return null
  return `${CAREER_DETAILS_BASE_URL}?id=${jobId}`
}

export const normalizeDetailUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''), HOMEPAGE_URL)
    const jobId = url.searchParams.get('id')
    return normalizeDetailUrlFromId(jobId)
  } catch {
    return null
  }
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeInlineText(page) || ''

  return /<title>\s*Careers\b[\s\S]*Nexdigm\s*<\/title>/i.test(page)
    && /Job Search/i.test(normalized)
    && /View All/i.test(normalized)
    && extractHrefMatches(page).some((href) => sameUrl(href, CURRENT_OPENINGS_URL))
}

export const extractCurrentOpeningsUrl = (html = '') =>
  extractHrefMatches(html).find((href) => sameUrl(href, CURRENT_OPENINGS_URL)) || null

export const hasCurrentOpeningsSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeInlineText(page) || ''

  return /<title>\s*Current Opportunities\b[\s\S]*Nexdigm\s*<\/title>/i.test(page)
    && /Current Openings/i.test(normalized)
    && /career-details\?id=/i.test(page)
    && /result-heading/i.test(page)
}

export const hasCareerDetailSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeInlineText(page) || ''

  return /Career Details/i.test(normalized)
    && /Location City/i.test(normalized)
    && /Job Description/i.test(normalized)
    && /Current Openings/i.test(normalized)
}

export const extractListings = (html = '') => {
  const listings = []
  const pattern =
    /<div class="result-col">\s*<div class="result-heading[^"]*">\s*<a href="([^"]+)">([\s\S]*?)<\/a>\s*<\/div>\s*<div class="result-col2">([\s\S]*?)<\/div>\s*<div class="result-content">([\s\S]*?)<div class="tags-area">/gi

  for (const match of String(html ?? '').matchAll(pattern)) {
    const sourceUrl = normalizeDetailUrl(match[1])
    const title = normalizeInlineText(match[2])
    const metaHtml = match[3]
    const contentHtml = match[4]
    const city = normalizeCity(extractMetaValue(metaHtml, 'Location City') || '')
    const employmentType = extractMetaValue(metaHtml, 'Employee Type')
    const postingDate = extractMetaValue(metaHtml, 'Posted')
    const department = extractContentValue(contentHtml, 'Department :')
    const locations = extractOfficeLocations(contentHtml)
    const location = locations[0] || buildFallbackLocation(city)
    const jobId = extractJobIdFromUrl(sourceUrl)

    if (!sourceUrl || !title || !location || !jobId) {
      throw new Error('Nexdigm verified current openings page no longer matches the trusted listing contract')
    }

    listings.push({
      title,
      company: COMPANY,
      department,
      location,
      city: city || null,
      locations,
      sourceUrl,
      applyUrl: sourceUrl,
      jobId,
      requisitionId: jobId,
      employmentType,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    })
  }

  return listings
}

export const extractJobDetail = (html = '', listing = {}) => {
  if (!hasCareerDetailSignal(html)) {
    throw new Error('Nexdigm verified detail page no longer matches the trusted public surface')
  }

  const title = extractDetailTitle(html) || listing.title
  const city = normalizeCity(extractDetailValue(html, 'Location City') || listing.city || '')
  const department = extractDetailValue(html, 'Department') || listing.department || null
  const experienceRequired = extractDetailValue(html, 'Experience') || listing.experienceRequired || null
  const employmentType = extractEmployeeType(html) || listing.employmentType || null
  const applyUrl = extractApplyUrl(html) || listing.applyUrl || listing.sourceUrl || null
  const jobDescription = extractJobDescription(html)

  if (!title || !applyUrl) {
    throw new Error('Nexdigm verified detail page no longer exposes the trusted apply contract')
  }

  return {
    ...listing,
    title,
    department,
    city: city || listing.city || null,
    applyUrl,
    employmentType,
    experienceRequired,
    jobDescription,
  }
}

export const createNexdigmScraper = ({
  now: defaultNow = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = defaultNow,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Nexdigm verified careers page no longer matches the trusted first-party surface')
    }

    const currentOpeningsUrl = extractCurrentOpeningsUrl(careersHtml)
    if (!sameUrl(currentOpeningsUrl, CURRENT_OPENINGS_URL)) {
      throw new Error('Nexdigm verified careers handoff changed materially')
    }

    const currentOpeningsHtml = await fetchText(CURRENT_OPENINGS_URL)
    if (!hasCurrentOpeningsSignal(currentOpeningsHtml)) {
      throw new Error('Nexdigm verified current openings page no longer matches the trusted first-party surface')
    }

    const listings = extractListings(currentOpeningsHtml)
    if (listings.length === 0) {
      throw new Error('Nexdigm verified current openings page no longer matches the trusted listing contract')
    }

    const scrapedAt = now()
    const jobs = []

    for (const listing of listings) {
      const detailHtml = await fetchText(listing.sourceUrl)
      const job = extractJobDetail(detailHtml, listing)
      jobs.push({
        ...job,
        link: job.applyUrl || job.sourceUrl,
        source: SOURCE,
        scrapedAt,
      })
    }

    return jobs.sort(
      (left, right) => left.title.localeCompare(right.title) || left.jobId.localeCompare(right.jobId),
    )
  },
})

export const run = async (options = {}) => createNexdigmScraper(options).run(options)

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
