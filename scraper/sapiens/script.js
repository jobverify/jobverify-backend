import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const BASE_URL = 'https://careers.sapiens.com'
const DEFAULT_LOCALE = 'en_US'
const PAGE_SIZE = 15

export const SEARCH_PAGE_URL = `${BASE_URL}/search/?createNewAlert=false&q=&locationsearch=`

const COMPANY_NAME = 'Sapiens'
const SOURCE = 'sapiens'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
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
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, ' ')
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? transform(match) : null
}

const toAbsoluteUrl = (value) => {
  try {
    const url = new URL(decodeHtmlEntities(value), BASE_URL)
    return url.origin === BASE_URL ? url.toString() : null
  } catch {
    return null
  }
}

const isIndiaLocation = (value) => /(?:\bIN\b|\bIndia\b)/i.test(String(value ?? ''))

const normalizeIndiaLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized || !isIndiaLocation(normalized)) return null

  const city = normalized.split(',')[0]?.trim()
  return city ? `${city}, India` : 'India'
}

const extractCity = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return normalized.split(',')[0]?.trim() || null
}

const parsePostedDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return normalized

  const year = parsed.getUTCFullYear()
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
  const day = String(parsed.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const extractListItems = (value) => [...String(value ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const extractDetailJobId = (value) => normalizeWhitespace(
  extractFirst(/\/(\d+)\/?(?:[#?].*)?$/i, value),
)

export const buildSearchUrl = ({ startRow = 0 } = {}) => {
  const url = new URL('/search/', BASE_URL)
  url.searchParams.set('createNewAlert', 'false')
  url.searchParams.set('q', '')
  url.searchParams.set('locationsearch', '')

  if (Number(startRow) > 0) {
    url.searchParams.set('startrow', String(Number(startRow)))
  }

  return url.toString()
}

export const buildApplyUrl = (detailJobId, locale = DEFAULT_LOCALE) =>
  `${BASE_URL}/talentcommunity/apply/${normalizeWhitespace(detailJobId) || ''}/?locale=${locale}`

export const extractSearchResults = (html) => [...String(html ?? '').matchAll(
  /<tr\b[^>]*class=["'][^"']*data-row[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi,
)]
  .map((match) => {
    const row = match[1]
    const sourceUrl = toAbsoluteUrl(
      extractFirst(/<a\b(?=[^>]*class=["'][^"']*jobTitle-link[^"']*["'])(?=[^>]*href=["']([^"']+)["'])[^>]*>/i, row),
    )
    const detailJobId = extractDetailJobId(sourceUrl)
    const rawLocation = normalizeWhitespace(
      extractFirst(/<span\b[^>]*class=["'][^"']*jobLocation[^"']*["'][^>]*>([\s\S]*?)<\/span>/i, row),
    )
    const location = normalizeIndiaLocation(rawLocation)

    if (!sourceUrl || !detailJobId || !location) return null

    return {
      title: normalizeWhitespace(
        extractFirst(/<a\b[^>]*class=["'][^"']*jobTitle-link[^"']*["'][^>]*>([\s\S]*?)<\/a>/i, row),
      ),
      location,
      city: extractCity(location),
      jobId: normalizeWhitespace(
        extractFirst(/<span\b[^>]*class=["'][^"']*jobFacility[^"']*["'][^>]*>([\s\S]*?)<\/span>/i, row),
      ),
      requisitionId: normalizeWhitespace(
        extractFirst(/<span\b[^>]*class=["'][^"']*jobFacility[^"']*["'][^>]*>([\s\S]*?)<\/span>/i, row),
      ),
      sourceUrl,
      detailJobId,
    }
  })
  .filter((job) => job?.title && job?.jobId)

export const extractPaginationSummary = (html) => {
  const summary = extractFirst(/Page\s+(\d+)\s+of\s+(\d+),\s+Results\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)/i, html, (match) => ({
    currentPage: Number.parseInt(match[1], 10),
    totalPages: Number.parseInt(match[2], 10),
    start: Number.parseInt(match[3], 10),
    end: Number.parseInt(match[4], 10),
    totalJobCount: Number.parseInt(match[5], 10),
  }))

  if (!summary) {
    return {
      currentPage: null,
      totalPages: null,
      totalJobCount: null,
      pageSize: null,
    }
  }

  return {
    currentPage: summary.currentPage,
    totalPages: summary.totalPages,
    totalJobCount: summary.totalJobCount,
    pageSize: summary.end - summary.start + 1,
  }
}

export const extractJobDetail = (html, listing = {}) => {
  const detailJobId = normalizeWhitespace(
    extractFirst(/jobID\s*:\s*(\d+)/i, html),
  ) || listing.detailJobId || extractDetailJobId(listing.sourceUrl)
  const rawLocation = normalizeWhitespace(
    extractFirst(/jobGeoLocation[^>]*>([\s\S]*?)<\/span>/i, html),
  )
  const location = normalizeIndiaLocation(rawLocation) || listing.location || null
  const descriptionHtml = extractFirst(
    /<div\b[^>]*class=["'][^"']*jobdescription[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    html,
  )

  return {
    title: normalizeWhitespace(extractFirst(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html)) || listing.title || null,
    location,
    city: extractCity(location) || listing.city || null,
    jobId: normalizeWhitespace(
      extractFirst(/data-careersite-propertyid=["']facility["'][^>]*>([\s\S]*?)<\/span>/i, html),
    ) || listing.jobId || null,
    requisitionId: normalizeWhitespace(
      extractFirst(/data-careersite-propertyid=["']facility["'][^>]*>([\s\S]*?)<\/span>/i, html),
    ) || listing.requisitionId || listing.jobId || null,
    employmentType: null,
    experienceRequired: null,
    jobDescription: stripTags(descriptionHtml),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: extractListItems(descriptionHtml),
    postingDate: parsePostedDate(
      extractFirst(/itemprop=["']datePosted["'][^>]*content=["']([^"']+)["']/i, html),
    ) || listing.postingDate || null,
    closingDate: null,
    applyUrl: detailJobId ? buildApplyUrl(detailJobId) : null,
    sourceUrl: listing.sourceUrl || null,
    department: null,
  }
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const createSapiensScraper = () => ({
  async run({
    maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY,
    maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const jobs = []
    const seenJobIds = new Set()

    for (let page = 0; page < maxPages; page += 1) {
      const startRow = page * PAGE_SIZE
      const listingUrl = startRow === 0 ? SEARCH_PAGE_URL : buildSearchUrl({ startRow })
      const listingHtml = await fetchText(listingUrl)
      const listings = extractSearchResults(listingHtml)
      const summary = extractPaginationSummary(listingHtml)

      if (listings.length === 0) break

      for (const listing of listings) {
        if (seenJobIds.has(listing.jobId)) continue
        seenJobIds.add(listing.jobId)

        const detail = extractJobDetail(await fetchText(listing.sourceUrl), listing)
        if (!isIndiaLocation(detail.location)) continue

        jobs.push({
          ...detail,
          company: COMPANY_NAME,
          link: detail.applyUrl || detail.sourceUrl,
          source: SOURCE,
          scrapedAt: now(),
        })

        if (maxJobs && jobs.length >= maxJobs) return jobs
      }

      if (!summary.totalPages || page + 1 >= summary.totalPages) break
    }

    return jobs
  },
})

export const run = async (options = {}) => createSapiensScraper().run(options)
