import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const BASE_URL = 'https://careers.vodafoneidea.com'
const COMPANY = 'Vodafone Idea Limited'
const SOURCE = 'vodafoneidea'
const PAGE_SIZE = 7
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

export const OFFICIAL_JOBS_URL = 'https://careers.vodafoneidea.com/go/All-Current-Job-Opportunities/4268701/'

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
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol|\/table|\/tr|\/td)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
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

const parseDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const dateOnlyMatch = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(normalized)
  if (dateOnlyMatch) {
    const monthIndex = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
      .indexOf(dateOnlyMatch[2].toLowerCase())

    if (monthIndex >= 0) {
      const year = dateOnlyMatch[3]
      const month = String(monthIndex + 1).padStart(2, '0')
      const day = String(Number.parseInt(dateOnlyMatch[1], 10)).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return normalized

  const year = parsed.getUTCFullYear()
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
  const day = String(parsed.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (/,\s*IN$/i.test(normalized)) {
    return normalized.replace(/,\s*IN$/i, ', India')
  }
  if (/^IN$/i.test(normalized)) {
    return 'India'
  }
  return normalized
}

const extractCity = (location) => normalizeWhitespace(location)?.split(',')[0]?.trim() || null

const extractJobIdFromUrl = (value) => extractFirst(
  /\/(\d+)\/?(?:[#?].*)?$/i,
  value,
  (match) => match[1],
)

const isIndiaLocation = (value) => /(?:,\s*IN$|,\s*India$|\bIndia\b)/i.test(String(value ?? ''))

export const buildSearchPageUrl = (startRow = 0) => {
  const normalizedStartRow = Number.isFinite(Number(startRow)) ? Number(startRow) : 0
  const pathname = normalizedStartRow > 0
    ? `/go/All-Current-Job-Opportunities/4268701/${normalizedStartRow}/`
    : '/go/All-Current-Job-Opportunities/4268701/'

  const url = new URL(pathname, BASE_URL)
  url.searchParams.set('q', '')
  url.searchParams.set('sortColumn', 'referencedate')
  url.searchParams.set('sortDirection', 'desc')
  return url.toString()
}

export const hasOfficialListingSignal = (html) => {
  const page = String(html ?? '')

  return /All Current Job Opportunities/i.test(page)
    && /Vodafone Idea Limited \(formerly Idea Cellular Limited\)/i.test(page)
    && /class="paginationLabel"/i.test(page)
    && /class="jobTitle-link"/i.test(page)
}

export const extractSearchResults = (html) => [...String(html ?? '').matchAll(
  /<tr[^>]*class="data-row"[^>]*>([\s\S]*?)<\/tr>/gi,
)]
  .map((match) => {
    const rowHtml = match[1]
    const title = normalizeWhitespace(
      extractFirst(/<a[^>]*class="jobTitle-link"[^>]*>([\s\S]*?)<\/a>/i, rowHtml),
    )
    const relativeLink = normalizeWhitespace(
      extractFirst(/<a(?=[^>]*class="jobTitle-link")(?=[^>]*href="([^"]+)")[^>]*>/i, rowHtml),
    )
    const department = normalizeWhitespace(
      extractFirst(/<td class="colDepartment[\s\S]*?<span class="jobDepartment">\s*([\s\S]*?)\s*<\/span>/i, rowHtml),
    )
    const rawLocation = normalizeWhitespace(
      extractFirst(/<td class="colLocation[\s\S]*?<span class="jobLocation">\s*([\s\S]*?)\s*<\/span>/i, rowHtml),
    )
    const sourceUrl = toAbsoluteUrl(relativeLink)
    const jobId = extractJobIdFromUrl(sourceUrl)
    const location = normalizeLocation(rawLocation)
    const postingDate = parseDate(extractFirst(
      /<td class="colDate[\s\S]*?<span class="jobDate">\s*([\s\S]*?)\s*<\/span>/i,
      rowHtml,
    ))

    if (!title || !sourceUrl || !jobId || !location || !isIndiaLocation(rawLocation)) return null

    return {
      title,
      department,
      location,
      city: extractCity(location),
      jobId,
      requisitionId: jobId,
      sourceUrl,
      postingDate,
    }
  })
  .filter(Boolean)

export const extractPaginationSummary = (html) => {
  const totalResults = extractFirst(
    /Results\s*<b>[^<]+<\/b>\s*of\s*<b>([\d,]+)<\/b>/i,
    html,
    (match) => Number.parseInt(match[1].replace(/,/g, ''), 10),
  )
  const pageSize = extractFirst(
    /Results\s*<b>(\d+)\s*[–-]\s*(\d+)<\/b>/i,
    html,
    (match) => Number.parseInt(match[2], 10) - Number.parseInt(match[1], 10) + 1,
  )
  const currentPage = extractFirst(
    /Page\s+(\d+)\s+of\s+(\d+)/i,
    html,
    (match) => Number.parseInt(match[1], 10),
  )
  const totalPages = extractFirst(
    /Page\s+(\d+)\s+of\s+(\d+)/i,
    html,
    (match) => Number.parseInt(match[2], 10),
  )

  return {
    totalResults: Number.isInteger(totalResults) ? totalResults : null,
    currentPage: Number.isInteger(currentPage) ? currentPage : null,
    totalPages: Number.isInteger(totalPages) ? totalPages : null,
    pageSize: Number.isInteger(pageSize) ? pageSize : null,
  }
}

export const extractJobDetail = (html, listing = {}) => {
  const title = normalizeWhitespace(
    extractFirst(/data-careersite-propertyid="title"[^>]*>([\s\S]*?)<\/span>/i, html),
  ) || normalizeWhitespace(
    extractFirst(/<meta property="og:title" content="([^"]+)"/i, html),
  ) || listing.title || null
  const location = normalizeLocation(
    extractFirst(/<span class="jobGeoLocation">\s*([\s\S]*?)\s*<\/span>/i, html),
  ) || listing.location || null
  const jobId = listing.jobId || extractJobIdFromUrl(listing.sourceUrl) || null
  const requisitionId = listing.requisitionId || jobId
  const descriptionHtml = extractFirst(
    /data-careersite-propertyid="description"[^>]*>\s*<span class="jobdescription">([\s\S]*?)<\/span>/i,
    html,
  )
  const applyPath = normalizeWhitespace(
    extractFirst(/class="btn btn-primary btn-large btn-lg apply dialogApplyBtn "\s+href="([^"]+)"/i, html),
  ) || (jobId ? `/talentcommunity/apply/${jobId}/?locale=en_GB` : null)

  return {
    title,
    department: listing.department || null,
    location,
    city: extractCity(location) || listing.city || null,
    jobId,
    requisitionId,
    employmentType: null,
    experienceRequired: null,
    jobDescription: stripTags(descriptionHtml),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: parseDate(extractFirst(/itemprop="datePosted" content="([^"]+)"/i, html)) || listing.postingDate || null,
    closingDate: parseDate(extractFirst(/itemprop="validThrough" content="([^"]+)"/i, html)),
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

export const createVodafoneIdeaScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const jobs = []
    const seenJobIds = new Set()

    for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
      const listingHtml = await fetchText(buildSearchPageUrl(pageIndex * PAGE_SIZE))

      if (pageIndex === 0 && !hasOfficialListingSignal(listingHtml)) {
        throw new Error('Response is not the verified official Vodafone Idea jobs page')
      }

      const listings = extractSearchResults(listingHtml)
      const summary = extractPaginationSummary(listingHtml)

      if (listings.length === 0) break

      for (const listing of listings) {
        if (seenJobIds.has(listing.jobId)) continue
        seenJobIds.add(listing.jobId)

        const detailHtml = await fetchText(listing.sourceUrl)
        const detail = extractJobDetail(detailHtml, listing)

        jobs.push({
          title: detail.title || listing.title,
          company: COMPANY,
          department: detail.department,
          location: detail.location || listing.location,
          city: detail.city || listing.city,
          country: 'India',
          jobId: detail.jobId || listing.jobId,
          requisitionId: detail.requisitionId || listing.requisitionId,
          sourceUrl: detail.sourceUrl || listing.sourceUrl,
          applyUrl: detail.applyUrl || null,
          link: detail.applyUrl || detail.sourceUrl || listing.sourceUrl,
          employmentType: detail.employmentType,
          experienceRequired: detail.experienceRequired,
          minimumQualification: detail.minimumQualification,
          preferredQualification: detail.preferredQualification,
          requiredSkills: detail.requiredSkills,
          postingDate: detail.postingDate || listing.postingDate,
          closingDate: detail.closingDate,
          jobDescription: detail.jobDescription,
          source: SOURCE,
          scrapedAt: now(),
        })

        if (maxJobs && jobs.length >= maxJobs) {
          return jobs
        }
      }

      if (summary.totalPages && pageIndex + 1 >= summary.totalPages) break
      if (summary.totalResults && (pageIndex + 1) * (summary.pageSize || listings.length) >= summary.totalResults) break
      if (listings.length < PAGE_SIZE && !summary.totalPages) break
    }

    return jobs
  },
})

export const run = async () => createVodafoneIdeaScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Vodafone Idea scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
