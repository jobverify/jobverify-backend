import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { IHCL_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = IHCL_CATALOG.source
export const COMPANY = IHCL_CATALOG.companyName
export const VERIFIED_ON = IHCL_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = IHCL_CATALOG.verifiedSurfaceSummary
export const BASE_URL = 'https://careers.ihcltata.com'
export const SEARCH_PATH = '/IHCL/search/?createNewAlert=false&q='
export const SEARCH_PAGE_URL = `${BASE_URL}${SEARCH_PATH}`
export const DEFAULT_PAGE_SIZE = 25

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const COUNTRY_BY_CODE = {
  IN: 'India',
  LK: 'Sri Lanka',
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&#x2F;/gi, '/')
  .replace(/&ndash;|&#8211;/gi, '-')
  .replace(/&mdash;|&#8212;/gi, '-')

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
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, ' '),
)

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? transform(match) : null
}

const toAbsoluteUrl = (value) => {
  try {
    return new URL(decodeHtmlEntities(value), BASE_URL).toString()
  } catch {
    return null
  }
}

const extractListItems = (value) => [...String(value ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const normalizeDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return normalized

  return parsed.toISOString().slice(0, 10)
}

const normalizeCountry = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  return COUNTRY_BY_CODE[normalized.toUpperCase()] || normalized
}

const extractSectionValueByLabel = (html, label) => {
  const escapedLabel = String(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const matches = [...String(html ?? '').matchAll(
    new RegExp(
      `<span[^>]*class=["'][^"']*section-label[^"']*["'][^>]*>\\s*${escapedLabel}\\s*<\\/span>\\s*<div[^>]*>([\\s\\S]*?)<\\/div>`,
      'gi',
    ),
  )]

  for (const match of matches) {
    const value = normalizeWhitespace(match[1])
    if (value) return value
  }

  return null
}

export const buildSearchUrl = (startRow = null) => {
  const url = new URL(SEARCH_PATH, BASE_URL)
  if (Number.isInteger(startRow) && startRow > 0) {
    url.searchParams.set('startrow', String(startRow))
  }
  return url.toString()
}

export const extractJobIdFromUrl = (value) =>
  extractFirst(/\/(\d+)\/?(?:[#?].*)?$/i, value, (match) => match[1])

export const hasOfficialSearchResultsSignal = (html) => {
  const page = String(html ?? '')

  return /id="tile-search-results-label"/i.test(page)
    && /<a(?=[^>]*class=["'][^"']*\bjobTitle-link\b[^"']*["'])/i.test(page)
    && /jobRecordsFound:\s*parseInt\("\d+"\)/i.test(page)
    && /theindianhP2/i.test(page)
    && (
      /var\s+brand\s*=\s*['"]IHCL['"]/i.test(page)
      || /["']brand["']\s*:\s*["']IHCL["']/i.test(page)
    )
}

export const hasOfficialEmptyStateSignal = (html) => {
  const page = String(html ?? '')

  return /jobRecordsFound:\s*parseInt\("0"\)/i.test(page)
    && /theindianhP2/i.test(page)
    && (
      /var\s+brand\s*=\s*['"]IHCL['"]/i.test(page)
      || /["']brand["']\s*:\s*["']IHCL["']/i.test(page)
    )
}

export const extractSearchResults = (html) => {
  const rows = [...String(html ?? '').matchAll(/<li class="job-tile\b[\s\S]*?<\/li>/gi)]

  return rows
    .map((rowMatch) => {
      const rowHtml = rowMatch[0]
      const relativeLink = normalizeWhitespace(
        extractFirst(/<a(?=[^>]*class=["'][^"']*\bjobTitle-link\b[^"']*["'])(?=[^>]*href="([^"]+)")[^>]*>/i, rowHtml),
      )
      const sourceUrl = toAbsoluteUrl(relativeLink)
      const title = normalizeWhitespace(
        extractFirst(/<a(?=[^>]*class=["'][^"']*\bjobTitle-link\b[^"']*["'])[^>]*>([\s\S]*?)<\/a>/i, rowHtml),
      )
      const businessUnit = extractSectionValueByLabel(rowHtml, 'Business Unit')
      const department = extractSectionValueByLabel(rowHtml, 'Department')
      const postingDate = extractSectionValueByLabel(rowHtml, 'Date')
      const requisitionId = extractSectionValueByLabel(rowHtml, 'Job Req ID')
      const jobId = extractJobIdFromUrl(sourceUrl)

      if (!title || !sourceUrl || !jobId) return null

      return {
        title,
        businessUnit,
        department,
        location: businessUnit || null,
        city: null,
        country: null,
        jobId,
        requisitionId: requisitionId || jobId,
        sourceUrl,
        postingDate,
      }
    })
    .filter(Boolean)
}

export const extractResultsSummary = (html) => {
  const page = String(html ?? '')
  const pageSize = extractFirst(
    /jobRecordsPerPage:\s*parseInt\("(\d+)"\)/i,
    page,
    (match) => Number.parseInt(match[1], 10),
  )
  const totalResults = extractFirst(
    /jobRecordsFound:\s*parseInt\("(\d+)"\)/i,
    page,
    (match) => Number.parseInt(match[1], 10),
  ) ?? extractFirst(
    /Showing\s+\d+\s+to\s+\d+\s+of\s+(\d+)\s+Jobs/i,
    page,
    (match) => Number.parseInt(match[1], 10),
  )

  return {
    totalResults: Number.isInteger(totalResults) ? totalResults : null,
    pageSize: Number.isInteger(pageSize) ? pageSize : null,
  }
}

export const extractJobDetail = (html, listing = {}) => {
  const title = normalizeWhitespace(
    extractFirst(/<(?:span|h1)\b[^>]*itemprop="title"[^>]*>([\s\S]*?)<\/(?:span|h1)>/i, html),
  ) || listing.title || null
  const descriptionHtml = extractFirst(
    /itemprop="description"[^>]*>([\s\S]*?)<\/span>\s*<\/span>/i,
    html,
  ) || extractFirst(
    /itemprop="description"[^>]*>([\s\S]*?)<\/span>/i,
    html,
  )
  const applyPath = normalizeWhitespace(
    extractFirst(/<a(?=[^>]*class="[^"]*\bdialogApplyBtn\b[^"]*")(?=[^>]*href="([^"]+)")[^>]*>/i, html),
  )
  const businessUnit = normalizeWhitespace(
    extractFirst(/data-careersite-propertyid="businessunit"[^>]*>([\s\S]*?)<\/span>/i, html),
  ) || listing.businessUnit || null
  const department = normalizeWhitespace(
    extractFirst(/data-careersite-propertyid="dept"[^>]*>([\s\S]*?)<\/span>/i, html),
  ) || listing.department || null
  const requisitionId = normalizeWhitespace(
    extractFirst(/data-careersite-propertyid="customfield3"[^>]*>([\s\S]*?)<\/span>/i, html),
  ) || listing.requisitionId || listing.jobId || null
  const city = normalizeWhitespace(
    extractFirst(/itemprop="addressLocality" content="([^"]+)"/i, html),
  ) || listing.city || null
  const country = normalizeCountry(
    extractFirst(/itemprop="addressCountry" content="([^"]+)"/i, html),
  ) || listing.country || null
  const jobId = normalizeWhitespace(
    extractFirst(/\/apply\/(\d+)\/\?locale=/i, applyPath),
  ) || listing.jobId || null
  const jobDescription = stripTags(descriptionHtml)
  const requiredSkills = extractListItems(descriptionHtml)
  const hasPublicDetailEvidence = Boolean(
    title
    || jobDescription
    || requiredSkills.length > 0
    || applyPath
    || businessUnit
    || department
    || city
    || country
    || requisitionId,
  )

  return {
    title,
    businessUnit,
    department,
    location: businessUnit || listing.location || city || null,
    city,
    country,
    jobId,
    requisitionId,
    employmentType: null,
    experienceRequired: null,
    jobDescription,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills,
    publicExperienceChecked: hasPublicDetailEvidence,
    postingDate: normalizeDate(
      extractFirst(/itemprop="datePosted" content="([^"]+)"/i, html),
    ) || normalizeDate(listing.postingDate),
    closingDate: normalizeDate(
      extractFirst(/itemprop="validThrough" content="([^"]+)"/i, html),
    ),
    applyUrl: toAbsoluteUrl(applyPath),
    sourceUrl: listing.sourceUrl || null,
  }
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const createIhclScraper = () => ({
  async run({
    maxPages = config.maxPages,
    maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const jobs = []
    const seenJobIds = new Set()
    const pageLimit = Number.isInteger(maxPages) ? maxPages : Number.POSITIVE_INFINITY
    let startRow = 0
    let pageNumber = 1

    while (pageNumber <= pageLimit) {
      const listingHtml = await fetchText(buildSearchUrl(startRow || null))

      if (
        pageNumber === 1
        && !hasOfficialSearchResultsSignal(listingHtml)
        && !hasOfficialEmptyStateSignal(listingHtml)
      ) {
        throw new Error('Response is not the verified official IHCL jobs page')
      }

      const listings = extractSearchResults(listingHtml)
      const summary = extractResultsSummary(listingHtml)

      if (listings.length === 0) {
        return jobs
      }

      for (const listing of listings) {
        if (seenJobIds.has(listing.jobId)) continue
        seenJobIds.add(listing.jobId)

        const detailHtml = await fetchText(listing.sourceUrl)
        const detail = extractJobDetail(detailHtml, listing)

        jobs.push({
          jobId: detail.jobId || listing.jobId,
          requisitionId: detail.requisitionId || listing.requisitionId,
          title: detail.title || listing.title,
          company: COMPANY,
          businessUnit: detail.businessUnit || listing.businessUnit || null,
          department: detail.department || listing.department || null,
          location: detail.location || listing.location || null,
          city: detail.city || listing.city || null,
          country: detail.country || listing.country || null,
          link: detail.applyUrl || detail.sourceUrl || listing.sourceUrl,
          applyUrl: detail.applyUrl || listing.sourceUrl,
          sourceUrl: detail.sourceUrl || listing.sourceUrl,
          source: SOURCE,
          employmentType: detail.employmentType,
          experienceRequired: detail.experienceRequired,
          jobDescription: detail.jobDescription,
          minimumQualification: detail.minimumQualification,
          preferredQualification: detail.preferredQualification,
          requiredSkills: detail.requiredSkills,
          publicExperienceChecked: detail.publicExperienceChecked ?? false,
          postingDate: detail.postingDate || listing.postingDate,
          closingDate: detail.closingDate,
          scrapedAt: now(),
        })

        if (maxJobs && jobs.length >= maxJobs) {
          return jobs
        }
      }

      const pageSize = summary.pageSize || DEFAULT_PAGE_SIZE
      if (!summary.totalResults || startRow + pageSize >= summary.totalResults) {
        break
      }

      startRow += pageSize
      pageNumber += 1
    }

    return jobs
  },
})

export const run = async (options = {}) => createIhclScraper().run(options)

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
