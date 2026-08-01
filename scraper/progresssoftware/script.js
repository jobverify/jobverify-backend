import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import PROGRESS_SOFTWARE_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = PROGRESS_SOFTWARE_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const CAREERS_HOME_URL = PROVIDER_METADATA.homepageUrl
export const OPEN_POSITIONS_URL = PROVIDER_METADATA.companyCareerPage
export const JOB_PAGE_PREFIX = PROVIDER_METADATA.jobPagePrefix

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#038;|&amp;/gi, '&')
    .replace(/&#39;|&apos;|&#x27;|&rsquo;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '').replace(/<[^>]+>/g, ' '),
) || ''

const htmlToLines = (html = '') => String(html ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, '\n')
  .replace(/<style[\s\S]*?<\/style>/gi, '\n')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(h[1-6]|p|li|div|section|article|a|span|strong|em|ul|ol)[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .split('\n')
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const getLastHeadingBefore = (html = '', index = 0) => {
  const precedingHtml = String(html ?? '').slice(0, index)
  const headings = [...precedingHtml.matchAll(/<h6[^>]*>([\s\S]*?)<\/h6>/gi)]
  const lastHeading = headings[headings.length - 1]
  return stripTags(lastHeading?.[1] || '')
}

const extractFirstMatch = (html = '', regex) => stripTags(String(html ?? '').match(regex)?.[1] || '')

const extractLabeledValue = (html = '', label) => {
  const escapedLabel = String(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = String(html ?? '').match(
    new RegExp(`<h[1-6][^>]*>\\s*${escapedLabel}\\s*<\\/h[1-6]>\\s*<p[^>]*>([\\s\\S]*?)<\\/p>`, 'i'),
  )

  return stripTags(match?.[1] || '')
}

const normalizeRemoteStatus = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (/^in office$/i.test(normalized)) return 'On-site'
  if (/^remote$/i.test(normalized)) return 'Remote'
  if (/^hybrid$/i.test(normalized)) return 'Hybrid'
  return normalized
}

const parseLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) {
    return {
      location: null,
      city: null,
      country: 'India',
    }
  }

  if (/^india$/i.test(normalized)) {
    return {
      location: 'India',
      city: null,
      country: 'India',
    }
  }

  const parts = normalized.split(',').map((part) => normalizeWhitespace(part)).filter(Boolean)
  const country = parts[parts.length - 1] || 'India'
  const city = parts.length >= 2 ? parts[parts.length - 2] : null

  return {
    location: normalized,
    city,
    country,
  }
}

const extractJobSummary = (html = '') => {
  const lines = htmlToLines(html)
  const summaryIndex = lines.findIndex((line) => /^Job Summary$/i.test(line))
  if (summaryIndex < 0) return null

  const summaryLines = lines.slice(summaryIndex)
  return summaryLines.length > 0 ? summaryLines.join('\n') : null
}

const extractJobIdFromUrl = (url = '') => String(url ?? '').match(/-([a-z0-9]+)$/i)?.[1] || null

const isOfficialJobUrl = (value) => {
  try {
    const url = new URL(value)
    const prefix = new URL(JOB_PAGE_PREFIX)
    return url.protocol === 'https:'
      && url.hostname === prefix.hostname
      && url.port === ''
      && url.username === ''
      && url.password === ''
      && url.search === ''
      && url.hash === ''
      && url.pathname.startsWith(prefix.pathname)
  } catch {
    return false
  }
}

export const hasOfficialCareersHomeSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const lines = htmlToLines(rawHtml)
  const text = lines.join(' ')

  const hasVerifiedTitle = /<title>\s*Explore Job Opportunities - Progress Careers\s*<\/title>/i.test(rawHtml)
  const hasLegacyShell = text.includes('Build a Career at Progress')
    && text.includes('People power Progress! Be part of a team where you can learn, grow and thrive.')
    && text.includes('View Open Positions')
    && text.includes('See Open Positions @ India')
    && /https:\/\/www\.progress\.com\/company\/careers\/open-positions/i.test(rawHtml)
  const hasCurrentShell = text.includes('Build a Career at Progress')
    && text.includes('People power Progress! Be part of a team where you can learn, grow and thrive.')
    && text.includes('View Open Positions')
    && text.includes('Who we are')
    && /href=["']\/company\/careers\/open-positions["']/i.test(rawHtml)

  return hasVerifiedTitle && (hasLegacyShell || hasCurrentShell)
}

export const extractOpenPositionUrls = (html = '') => {
  const page = String(html ?? '')
  const urls = new Set()

  for (const block of page.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const rawJson = block[1]
    if (!rawJson) continue

    try {
      const payload = JSON.parse(rawJson)
      const entries = Array.isArray(payload?.itemListElement)
        ? payload.itemListElement
        : (Array.isArray(payload) ? payload : [])

      for (const entry of entries) {
        const url = normalizeWhitespace(entry?.url)
        if (isOfficialJobUrl(url)) {
          urls.add(url)
        }
      }
    } catch {
      for (const match of rawJson.matchAll(/"url"\s*:\s*"(https:\/\/www\.progress\.com\/company\/careers\/open-positions\/[^"]+)"/gi)) {
        const url = normalizeWhitespace(match[1])
        if (isOfficialJobUrl(url)) urls.add(url)
      }
    }
  }

  return [...urls]
}

export const hasOpenPositionsSignal = (html = '') => {
  const lines = htmlToLines(html)
  const text = lines.join(' ')

  return text.includes('Search Open Positions')
    && /\bIndia\s*\(\d+\)/i.test(text)
    && (extractIndiaJobCards(html).length > 0 || extractOpenPositionUrls(html).length > 0)
}

export const extractIndiaJobCards = (html = '') => {
  const rawHtml = String(html ?? '')
  const matches = rawHtml.matchAll(
    /<a[^>]+href=["'](https:\/\/www\.progress\.com\/company\/careers\/open-positions\/[^"'#?\s<]+)["'][^>]*>([\s\S]*?)<\/a>\s*<p[^>]*>([\s\S]*?)<\/p>/gi,
  )
  const seenUrls = new Set()
  const cards = []

  for (const match of matches) {
    const detailUrl = normalizeWhitespace(match[1])
    const title = stripTags(match[2])
    const listingLocation = stripTags(match[3])
    const department = getLastHeadingBefore(rawHtml, match.index ?? 0)

    if (!detailUrl || seenUrls.has(detailUrl)) continue
    if (!title || !department || !listingLocation) continue
    if (!/\bIndia\b/i.test(listingLocation)) continue

    seenUrls.add(detailUrl)
    cards.push({
      title,
      department,
      listingLocation,
      detailUrl,
    })
  }

  return cards
}

export const extractJobFromDetailPage = (html = '', listingCard = {}) => {
  const detailHtml = String(html ?? '')
  const title = extractFirstMatch(detailHtml, /<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const department = extractLabeledValue(detailHtml, 'Job Category') || normalizeWhitespace(listingCard?.department)
  const locationText = extractLabeledValue(detailHtml, 'Location')
    || normalizeWhitespace(listingCard?.listingLocation)
  const sourceUrl = normalizeWhitespace(listingCard?.detailUrl)
  const jobId = extractJobIdFromUrl(sourceUrl)
  const jobDescription = extractJobSummary(detailHtml)
  const remoteStatus = normalizeRemoteStatus(extractLabeledValue(detailHtml, 'Remote Type'))

  if (!title || !department || !locationText || !isOfficialJobUrl(sourceUrl) || !jobId || !jobDescription) {
    throw new Error(`The verified Progress Software job detail page changed materially: ${sourceUrl || 'unknown-url'}`)
  }

  const locationBits = parseLocation(locationText)

  return {
    title,
    company: COMPANY_NAME,
    department,
    location: locationBits.location,
    city: locationBits.city,
    country: locationBits.country,
    jobId,
    requisitionId: jobId,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription,
    remoteStatus,
  }
}

export const createProgressSoftwareScraper = () => ({
  async run() {
    return []
  },
})

export const run = async (options = {}) => createProgressSoftwareScraper(options).run(options)

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
