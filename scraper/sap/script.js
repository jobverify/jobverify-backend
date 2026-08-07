import path from 'path'
import { fileURLToPath } from 'url'

import { extractJobFilterSignals } from '../../src/utils/jobFilterSignals.js'
import { inferMissingExperienceRequired } from '../../scraper-support/utils/normalizeScrapedJob.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const BASE_URL = 'https://jobs.sap.com'
const DEFAULT_LOCATION = 'India'
const DEFAULT_LOCALE = 'en_US'
const PAGE_SIZE = 25

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
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
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? transform(match) : null
}

const escapeRegex = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const extractBalancedElementInnerHtml = (html, openingMatch) => {
  if (!openingMatch) return null

  const tagName = String(openingMatch[1] || '').toLowerCase()
  if (!tagName) return null

  const source = String(html ?? '')
  const startIndex = openingMatch.index + openingMatch[0].length
  const tagPattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, 'gi')
  tagPattern.lastIndex = startIndex

  let depth = 1
  let match

  while ((match = tagPattern.exec(source))) {
    if (/^<\//.test(match[0])) {
      depth -= 1
    } else if (!/\/>\s*$/i.test(match[0])) {
      depth += 1
    }

    if (depth === 0) {
      return source.slice(startIndex, match.index)
    }
  }

  return null
}

const extractElementInnerHtmlByClass = (html, className) => {
  const pattern = new RegExp(
    `<(div|span)\\b[^>]*class=(["'])[^"']*\\b${escapeRegex(className)}\\b[^"']*\\2[^>]*>`,
    'i',
  )
  const match = pattern.exec(String(html ?? ''))
  return extractBalancedElementInnerHtml(html, match)
}

const toAbsoluteUrl = (value) => {
  try {
    return new URL(decodeHtmlEntities(value), BASE_URL).toString()
  } catch {
    return null
  }
}

const extractCityFromLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return normalized.split(',')[0]?.trim() || null
}

const normalizeSearchLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  const city = extractCityFromLocation(normalized)
  return city ? `${city}, India` : DEFAULT_LOCATION
}

const normalizeDetailLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  const [city] = normalized.split(',')
  return city ? `${city.trim()}, India` : DEFAULT_LOCATION
}

const extractListingJobId = (href) => normalizeWhitespace(
  extractFirst(/\/(\d+)\/?$/i, decodeHtmlEntities(href)),
)

const parsePostedDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return normalized

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeDescription = (value) => stripTags(value)
  ?.replace(/\s*\|\s*/g, ' | ')
  ?.replace(/\s+([|])/g, ' $1')
  ?.replace(/([|])\s+/g, '$1 ')
  ?? null

export const buildSearchUrl = ({
  startRow = 0,
  location = DEFAULT_LOCATION,
  locale = DEFAULT_LOCALE,
} = {}) => {
  const url = new URL('/search/', BASE_URL)
  url.searchParams.set('q', '')
  url.searchParams.set('locationsearch', location)
  url.searchParams.set('locale', locale)

  if (Number(startRow) > 0) {
    url.searchParams.set('startrow', String(Number(startRow)))
  }

  return url.toString()
}

export const extractSearchResults = (html) => [...String(html).matchAll(
  /<tr class="data-row">([\s\S]*?)<\/tr>/gi,
)]
  .map((match) => {
    const rowHtml = match[1]
    const href = extractFirst(/<a href="([^"]+)" class="jobTitle-link">/i, rowHtml)
    const title = normalizeWhitespace(extractFirst(/<a [^>]*class="jobTitle-link">([\s\S]*?)<\/a>/i, rowHtml))
    const rawLocation = normalizeWhitespace(
      extractFirst(/<td class="colLocation[\s\S]*?<span class="jobLocation">([\s\S]*?)<\/span>/i, rowHtml),
    )
    const sourceUrl = toAbsoluteUrl(href)
    const jobId = extractListingJobId(href)

    if (!title || !rawLocation || !sourceUrl || !jobId) return null

    return {
      title,
      location: normalizeSearchLocation(rawLocation),
      city: extractCityFromLocation(rawLocation),
      jobId,
      requisitionId: jobId,
      sourceUrl,
    }
  })
  .filter(Boolean)

export const extractPaginationSummary = (html) => {
  const totalJobCount = Number.parseInt(
    extractFirst(/Results\s*<b>\d+\s*[–-]\s*\d+<\/b>\s*of\s*<b>(\d+)<\/b>/i, html) || '',
    10,
  )

  const pageRangeMatch = /Results\s*<b>(\d+)\s*[–-]\s*(\d+)<\/b>/i.exec(String(html))
  const pageSize = pageRangeMatch
    ? Number.parseInt(pageRangeMatch[2], 10) - Number.parseInt(pageRangeMatch[1], 10) + 1
    : null

  return {
    totalJobCount: Number.isFinite(totalJobCount) ? totalJobCount : null,
    pageSize: Number.isFinite(pageSize) ? pageSize : null,
  }
}

export const extractJobDetail = (html, listing = {}) => {
  const location = normalizeDetailLocation(extractFirst(
    /<p id="job-location"[\s\S]*?<span class="jobGeoLocation">([\s\S]*?)<\/span>/i,
    html,
  )) || listing.location || null
  const requisitionId = normalizeWhitespace(extractFirst(
    /data-careersite-propertyid="facility"[^>]*>([\s\S]*?)<\/span>/i,
    html,
  )) || listing.requisitionId || listing.jobId || null
  const postingDate = parsePostedDate(extractFirst(
    /data-careersite-propertyid="date"[^>]*>([\s\S]*?)<\/span>/i,
    html,
  )) || listing.postingDate || null
  const department = normalizeWhitespace(extractFirst(
    /data-careersite-propertyid="department"[^>]*>([\s\S]*?)<\/span>/i,
    html,
  ))
  const employmentType = normalizeWhitespace(extractFirst(
    /data-careersite-propertyid="shifttype"[^>]*>([\s\S]*?)<\/span>/i,
    html,
  ))
  const descriptionHtml = extractElementInnerHtmlByClass(html, 'jobdescription')
    || extractFirst(/<div class="jobdescription">([\s\S]*?)<\/div>\s*<div class="applylink/i, html)
  const applyUrl = toAbsoluteUrl(
    extractFirst(/<a[^>]+class="[^"]*applybutton[^"]*"[^>]+href="([^"]+)"/i, html)
      || extractFirst(/<a[^>]+href="([^"]+)"[^>]*>\s*Apply now/i, html),
  )
  const jobDescription = normalizeDescription(descriptionHtml)
  const experienceRequired = inferMissingExperienceRequired(
    {
      title: listing.title,
      jobDescription,
      description: jobDescription,
    },
    null,
    extractJobFilterSignals({
      title: listing.title,
      jobDescription,
      description: jobDescription,
    }).experienceProfile,
  )

  return {
    title: normalizeWhitespace(extractFirst(/<h1>([\s\S]*?)<\/h1>/i, html)) || listing.title || null,
    location,
    city: extractCityFromLocation(location) || listing.city || null,
    jobId: requisitionId,
    requisitionId,
    employmentType,
    experienceRequired,
    jobDescription,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate,
    closingDate: null,
    applyUrl,
    sourceUrl: listing.sourceUrl || null,
    department,
  }
}

const fetchText = async (url) => {
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

export const run = async () => {
  const jobs = []
  const seenJobIds = new Set()
  const maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY

  for (let page = 0; page < maxPages; page += 1) {
    const startRow = page * PAGE_SIZE
    const listingHtml = await fetchText(buildSearchUrl({ startRow }))
    const listings = extractSearchResults(listingHtml)
    const summary = extractPaginationSummary(listingHtml)

    if (listings.length === 0) break

    for (const listing of listings) {
      if (seenJobIds.has(listing.jobId)) continue
      seenJobIds.add(listing.jobId)

      const detailHtml = await fetchText(listing.sourceUrl)
      const detail = extractJobDetail(detailHtml, listing)

      jobs.push({
        jobId: detail.jobId || listing.jobId,
        requisitionId: detail.requisitionId || listing.requisitionId,
        title: detail.title || listing.title,
        company: 'SAP',
        department: detail.department,
        location: detail.location || listing.location,
        city: detail.city || listing.city,
        link: detail.applyUrl || detail.sourceUrl || listing.sourceUrl,
        applyUrl: detail.applyUrl || null,
        sourceUrl: detail.sourceUrl || listing.sourceUrl,
        source: 'sap',
        employmentType: detail.employmentType,
        experienceRequired: detail.experienceRequired,
        jobDescription: detail.jobDescription,
        minimumQualification: detail.minimumQualification,
        preferredQualification: detail.preferredQualification,
        requiredSkills: detail.requiredSkills,
        postingDate: detail.postingDate,
        closingDate: detail.closingDate,
        scrapedAt: new Date().toISOString(),
      })
    }

    const totalJobCount = summary.totalJobCount || 0
    const pageSize = summary.pageSize || listings.length
    if ((page + 1) * pageSize >= totalJobCount) break
  }

  return jobs
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running SAP scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)
  const cities = [...new Set(jobs.map((job) => job.city).filter(Boolean))].sort()
  console.log(`Cities found: ${cities.join(', ')}`)
  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'sap')
    console.log('DB result:', result)
    process.exit(0)
  }
}
