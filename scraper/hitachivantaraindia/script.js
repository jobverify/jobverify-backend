import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import HITACHI_VANTARA_INDIA_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = HITACHI_VANTARA_INDIA_CATALOG.source
export const COMPANY = HITACHI_VANTARA_INDIA_CATALOG.companyName
export const OFFICIAL_COMPANY_LABEL = HITACHI_VANTARA_INDIA_CATALOG.officialCompanyLabel
export const SEARCH_PAGE_URL = HITACHI_VANTARA_INDIA_CATALOG.companyCareerPage
export const VERIFIED_ON = HITACHI_VANTARA_INDIA_CATALOG.verifiedOn
export const PROVIDER_METADATA = HITACHI_VANTARA_INDIA_CATALOG

const CAREERS_ORIGIN = 'https://careers.hitachi.com'
const DEFAULT_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
}
const NULLISH_SECTION_LABELS = [
  'Apply Now',
  'Share:',
]
const DESCRIPTION_STOP_LABELS = [
  'Skills Required:',
  'Minimum Qualification:',
  'Preferred Qualification:',
  'Qualifications:',
  'Remote:',
  ...NULLISH_SECTION_LABELS,
]
const SKILLS_STOP_LABELS = [
  'Desired Digital Skills:',
  'Experience:',
  'Minimum Qualification:',
  'Preferred Qualification:',
  'Qualifications:',
  'Language:',
  'Remote:',
  ...NULLISH_SECTION_LABELS,
]
const QUALIFICATION_STOP_LABELS = [
  'Preferred Qualification:',
  'Skills Required:',
  'Experience:',
  'Remote:',
  ...NULLISH_SECTION_LABELS,
]

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim() || null

const escapeRegex = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const decodeHtmlEntities = (value) =>
  String(value ?? '')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#8211;|&#x2013;/gi, '-')

const stripTags = (value) =>
  normalizeWhitespace(
    decodeHtmlEntities(String(value ?? '').replace(/<[^>]+>/g, ' ')),
  )

const unique = (values) => [...new Set(values.filter(Boolean))]

const toAbsoluteUrl = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, CAREERS_ORIGIN).toString()
  } catch {
    return normalized
  }
}

const htmlToLines = (html) =>
  decodeHtmlEntities(String(html ?? ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/?(?:article|div|h[1-6]|li|main|ol|p|section|ul)[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .split(/\n+/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)

const extractLabelValue = (lines, label) => {
  const pattern = new RegExp(`^${escapeRegex(label)}\\s*:?\\s*(.+)$`, 'i')
  const line = lines.find((value) => pattern.test(value))
  return normalizeWhitespace(line?.replace(pattern, '$1'))
}

const hasLabel = (value, label) =>
  new RegExp(`^${escapeRegex(label)}$`, 'i').test(String(value ?? ''))

const extractSectionLines = (lines, label, stopLabels = []) => {
  const startIndex = lines.findIndex((value) => hasLabel(value, label))
  if (startIndex === -1) return []

  const collected = []

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (stopLabels.some((stopLabel) => hasLabel(line, stopLabel))) break
    collected.push(line)
  }

  return collected
}

const splitLocation = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) {
    return {
      city: null,
      state: null,
      country: null,
    }
  }

  if (/^remote$/i.test(normalized)) {
    return {
      city: null,
      state: null,
      country: 'India',
    }
  }

  const parts = unique(
    normalized.split(',').map((part) => normalizeWhitespace(part)),
  )

  return {
    city: parts[0] || null,
    state: parts.length > 2 ? parts[1] : null,
    country: parts.at(-1) || null,
  }
}

const extractListingJobId = (sourceUrl) =>
  normalizeWhitespace(String(sourceUrl ?? '').match(/\/jobs\/(\d+)(?:[-/?#]|$)/i)?.[1])

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (/full.?time/.test(normalized)) return 'Full-time'
  if (/part.?time/.test(normalized)) return 'Part-time'
  if (/intern/.test(normalized)) return 'Internship'
  if (/contract/.test(normalized)) return 'Contract'
  return normalizeWhitespace(value)
}

const normalizePostingDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const parsed = Date.parse(
    /[a-z]{3,9}\s+\d{1,2},\s+\d{4}/i.test(normalized)
      ? `${normalized} UTC`
      : normalized,
  )
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString().slice(0, 10)
}

const normalizeRemoteStatus = (value, location) => {
  const normalizedValue = normalizeWhitespace(value)?.toLowerCase()
  const normalizedLocation = normalizeWhitespace(location)?.toLowerCase()

  if (normalizedValue === 'yes' || normalizedLocation === 'remote') return 'Remote'
  if (normalizedValue === 'no') return 'On-site'
  return null
}

const defaultFetchText = (url) =>
  fetchTextWithRetry(url, {
    headers: DEFAULT_HEADERS,
    label: `${SOURCE}-text`,
    timeoutMs: 15000,
  })

const defaultFetchImpl = (url, options = {}) =>
  fetch(url, {
    method: options.method || 'GET',
    headers: {
      ...DEFAULT_HEADERS,
      ...(options.headers || {}),
    },
    redirect: options.redirect || 'follow',
  })

export const buildSearchPageUrl = () => SEARCH_PAGE_URL

export const hasOfficialSearchPageSignal = (html = '') => {
  const page = String(html ?? '')

  return /Search Jobs/i.test(page)
    && page.includes(OFFICIAL_COMPANY_LABEL)
    && /\/jobs\/\d+/i.test(page)
}

export const extractListings = (html = '') => {
  const source = String(html ?? '')
  const linkPattern = /<a[^>]+href=["']([^"']*\/jobs\/\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi
  const matches = [...source.matchAll(linkPattern)]

  return matches
    .map((match, index) => {
      const nextIndex = matches[index + 1]?.index ?? source.length
      const contextHtml = source.slice((match.index ?? 0) + match[0].length, nextIndex)
      const contextLines = htmlToLines(contextHtml)
      const sourceUrl = toAbsoluteUrl(match[1])
      const title = stripTags(match[2])
      const location = extractLabelValue(contextLines, 'Location')
      const company = extractLabelValue(contextLines, 'Company')

      if (!title || !sourceUrl || !location) return null
      if (company !== OFFICIAL_COMPANY_LABEL) return null

      const { city, state, country } = splitLocation(location)

      return {
        title,
        location,
        city,
        state,
        country,
        sourceUrl,
      }
    })
    .filter(Boolean)
}

const extractApplyHref = (html = '') => {
  const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi

  for (const match of html.matchAll(linkPattern)) {
    const href = toAbsoluteUrl(match[1])
    const text = stripTags(match[2])

    if (/^apply now$/i.test(text)) {
      return href
    }
  }

  return null
}

export const extractJobDetail = (html = '', listing = {}) => {
  const lines = htmlToLines(html)
  const location = listing.location || extractLabelValue(lines, 'Location')
  const { city, state, country } = splitLocation(location)
  const remoteValue = extractLabelValue(lines, 'Remote')

  return {
    title: listing.title || lines[0] || null,
    location,
    city: listing.city ?? city,
    state: listing.state ?? state,
    country: listing.country ?? country,
    jobId: extractListingJobId(listing.sourceUrl),
    requisitionId: extractLabelValue(lines, 'Job ID'),
    sourceUrl: listing.sourceUrl || null,
    applyUrl: extractApplyHref(html),
    department: extractLabelValue(lines, 'Profession (Job Category)'),
    employmentType: normalizeEmploymentType(extractLabelValue(lines, 'Job Schedule')),
    experienceRequired: extractLabelValue(lines, 'Job Type (Experience Level)'),
    postingDate: normalizePostingDate(extractLabelValue(lines, 'Date Posted')),
    closingDate: null,
    jobDescription: normalizeWhitespace(
      extractSectionLines(lines, 'Job Description:', DESCRIPTION_STOP_LABELS).join(' '),
    ),
    minimumQualification: normalizeWhitespace(
      extractSectionLines(lines, 'Minimum Qualification:', QUALIFICATION_STOP_LABELS).join(' '),
    ),
    preferredQualification: normalizeWhitespace(
      extractSectionLines(lines, 'Preferred Qualification:', NULLISH_SECTION_LABELS).join(' '),
    ),
    requiredSkills: unique(
      extractSectionLines(lines, 'Skills Required:', SKILLS_STOP_LABELS).map((value) =>
        normalizeWhitespace(value)?.toLowerCase()
      ),
    ),
    remoteStatus: normalizeRemoteStatus(remoteValue, location),
  }
}

export const normalizeApplyUrl = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    const url = new URL(normalized)
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return normalized
  }
}

export const resolveApplyUrl = async (applyUrl, { fetchImpl = defaultFetchImpl } = {}) => {
  const requestUrl = toAbsoluteUrl(applyUrl)
  if (!requestUrl) return null

  const response = await fetchImpl(requestUrl, {
    headers: DEFAULT_HEADERS,
    redirect: 'follow',
  })

  if (!response?.ok) {
    throw new Error(`HTTP ${response?.status ?? 'unknown'} for ${requestUrl}`)
  }

  const redirectedUrl = response.url || response.headers?.get?.('location') || requestUrl
  return normalizeApplyUrl(toAbsoluteUrl(redirectedUrl))
}

export const createHitachiVantaraIndiaScraper = ({
  fetchText = defaultFetchText,
  fetchImpl = defaultFetchImpl,
  maxJobs = null,
} = {}) => ({
  async run({
    fetchText: overrideFetchText,
    fetchImpl: overrideFetchImpl,
    maxJobs: overrideMaxJobs = maxJobs,
    now = () => new Date().toISOString(),
  } = {}) {
    const fetchTextImpl = overrideFetchText || fetchText
    const fetchApplyImpl = overrideFetchImpl || fetchImpl
    const listingHtml = await fetchTextImpl(buildSearchPageUrl())

    if (!hasOfficialSearchPageSignal(listingHtml)) {
      throw new Error(
        'Hitachi Vantara India verified search page no longer matches the known public surface',
      )
    }

    const listings = extractListings(listingHtml)
    if (listings.length === 0) {
      throw new Error(
        'Hitachi Vantara India verified search page no longer exposes public company-filtered listings',
      )
    }

    const jobs = []

    for (const listing of listings) {
      const detailHtml = await fetchTextImpl(listing.sourceUrl)
      const detail = extractJobDetail(detailHtml, listing)
      const finalApplyUrl = detail.applyUrl
        ? await resolveApplyUrl(detail.applyUrl, { fetchImpl: fetchApplyImpl })
        : null

      jobs.push({
        ...detail,
        applyUrl: finalApplyUrl || detail.applyUrl,
        company: COMPANY,
        link: finalApplyUrl || detail.applyUrl || detail.sourceUrl,
        source: SOURCE,
        scrapedAt: now(),
      })

      if (overrideMaxJobs && jobs.length >= overrideMaxJobs) break
    }

    return jobs
  },
})

export const run = async (options = {}) => createHitachiVantaraIndiaScraper(options).run(options)

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
