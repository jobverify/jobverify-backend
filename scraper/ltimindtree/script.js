import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const BASE_URL = 'https://careers.ltimindtree.com'
const SEARCH_PATH = '/search/?createNewAlert=false&q=&optionsFacetsDD_country=&optionsFacetsDD_location=&locationsearch=India'

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

const toAbsoluteUrl = (value) => {
  try {
    return new URL(value, BASE_URL).toString()
  } catch {
    return null
  }
}

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(value)
  return match ? transform(match) : null
}

export const buildIndiaSearchUrl = () => new URL(SEARCH_PATH, BASE_URL).toString()

export const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  return normalized.split(',')[0]?.trim() || null
}

export const extractJobIdFromUrl = (value) =>
  extractFirst(/\/(\d+)\/?(?:[#?].*)?$/i, value, (match) => match[1])

export const extractSearchResults = (html) => {
  const rows = [...String(html).matchAll(/<tr class="data-row">([\s\S]*?)<\/tr>/gi)]

  return rows
    .map((rowMatch) => {
      const rowHtml = rowMatch[1]
      const title = normalizeWhitespace(
        extractFirst(/<a[^>]*class="jobTitle-link"[^>]*>([\s\S]*?)<\/a>/i, rowHtml),
      )
      const relativeLink = normalizeWhitespace(
        extractFirst(/<a(?=[^>]*class="jobTitle-link")(?=[^>]*href="([^"]+)")[^>]*>/i, rowHtml),
      )
      const location = normalizeWhitespace(
        extractFirst(/<td class="colLocation hidden-phone"[\s\S]*?<span class="jobLocation">\s*([\s\S]*?)\s*<\/span>/i, rowHtml),
      )
      const postingDate = normalizeWhitespace(
        extractFirst(/<span class="jobDate">\s*([\s\S]*?)\s*<\/span>/i, rowHtml),
      )
      const sourceUrl = toAbsoluteUrl(relativeLink)
      const jobId = extractJobIdFromUrl(sourceUrl)

      if (!title || !sourceUrl || !jobId) return null

      return {
        title,
        location,
        city: extractCity(location),
        jobId,
        requisitionId: jobId,
        sourceUrl,
        postingDate,
      }
    })
    .filter(Boolean)
}

export const extractResultsSummary = (html) => {
  const totalResults = extractFirst(
    /Results\s*<b>[^<]+<\/b>\s*of\s*<b>([\d,]+)<\/b>/i,
    html,
    (match) => Number.parseInt(match[1].replace(/,/g, ''), 10),
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
  }
}

const extractJobSegments = (html) => {
  const segmentHtml = extractFirst(/<strong>\s*Job Segment:\s*<\/strong>([\s\S]*?)(?:<\/span>|<\/p>)/i, html)
  const segmentText = stripTags(segmentHtml)
  if (!segmentText) return []

  return [...new Set(
    segmentText
      .split(/[;,]/)
      .map((item) => normalizeWhitespace(item))
      .filter(Boolean),
  )]
}

const extractMinimumQualification = (descriptionText) => {
  const qualificationMatches = [...String(descriptionText ?? '').matchAll(
    /([^.]*\b(?:bachelor|master|degree|b\.tech|be|b\.e\.|m\.tech|mba)\b[^.]*\.?)/gi,
  )]
  const lastMatch = qualificationMatches.at(-1)
  return normalizeWhitespace(lastMatch?.[1] ?? null)
}

export const extractJobDetail = (html, listing = {}) => {
  const descriptionHtml = extractFirst(/<span class="jobdescription">([\s\S]*?)<\/span>/i, html)
  const descriptionText = normalizeWhitespace(
    stripTags(descriptionHtml)?.replace(/•/g, ' ') ?? null,
  )
  const applyPath = normalizeWhitespace(
    extractFirst(/class="btn btn-primary btn-large btn-lg apply dialogApplyBtn "\s+href="([^"]+)"/i, html),
  )
  const streetAddress = normalizeWhitespace(
    extractFirst(/itemprop="streetAddress" content="([^"]+)"/i, html),
  )
  const addressLocality = normalizeWhitespace(
    extractFirst(/itemprop="addressLocality" content="([^"]+)"/i, html),
  )
  const addressRegion = normalizeWhitespace(
    extractFirst(/itemprop="addressRegion" content="([^"]+)"/i, html),
  )
  const addressCountry = normalizeWhitespace(
    extractFirst(/itemprop="addressCountry" content="([^"]+)"/i, html),
  )

  const location = streetAddress || [addressLocality, addressRegion, addressCountry]
    .filter(Boolean)
    .join(', ') || listing.location || null

  return {
    title: listing.title || normalizeWhitespace(
      extractFirst(/itemprop="title"[^>]*>([\s\S]*?)<\/span>/i, html),
    ),
    location,
    city: extractCity(location),
    jobId: normalizeWhitespace(
      extractFirst(/data-careersite-propertyid="customfield2"[^>]*>([\s\S]*?)<\/span>/i, html),
    ),
    requisitionId: normalizeWhitespace(
      extractFirst(/data-careersite-propertyid="customfield2"[^>]*>([\s\S]*?)<\/span>/i, html),
    ),
    employmentType: 'Full-time',
    experienceRequired: normalizeWhitespace(
      extractFirst(/(\d+\s*(?:\+|-|to)\s*\d+\s+years?[^.]*)/i, descriptionText),
    ),
    jobDescription: descriptionText,
    minimumQualification: extractMinimumQualification(descriptionText),
    preferredQualification: null,
    requiredSkills: extractJobSegments(html),
    postingDate: normalizeWhitespace(
      extractFirst(/itemprop="datePosted" content="([^"]+)"/i, html),
    ),
    closingDate: normalizeWhitespace(
      extractFirst(/itemprop="validThrough" content="([^"]+)"/i, html),
    ),
    applyUrl: toAbsoluteUrl(applyPath),
    sourceUrl: listing.sourceUrl || null,
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
  const listingHtml = await fetchText(buildIndiaSearchUrl())
  const listings = extractSearchResults(listingHtml)
  const jobs = []
  const seenJobIds = new Set()

  for (const listing of listings) {
    if (seenJobIds.has(listing.jobId)) continue
    seenJobIds.add(listing.jobId)

    const detailHtml = await fetchText(listing.sourceUrl)
    const detail = extractJobDetail(detailHtml, listing)

    jobs.push({
      jobId: detail.jobId || listing.jobId,
      requisitionId: detail.requisitionId || listing.requisitionId,
      title: detail.title || listing.title,
      company: 'LTIMindtree',
      department: null,
      location: detail.location || listing.location,
      city: detail.city || listing.city,
      link: detail.applyUrl || listing.sourceUrl,
      applyUrl: detail.applyUrl || listing.sourceUrl,
      sourceUrl: detail.sourceUrl || listing.sourceUrl,
      source: 'ltimindtree',
      employmentType: detail.employmentType,
      experienceRequired: detail.experienceRequired,
      jobDescription: detail.jobDescription,
      minimumQualification: detail.minimumQualification,
      preferredQualification: detail.preferredQualification,
      requiredSkills: detail.requiredSkills,
      postingDate: detail.postingDate || listing.postingDate,
      closingDate: detail.closingDate,
      scrapedAt: new Date().toISOString(),
    })
  }

  return jobs
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running LTIMindtree scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)
  const cities = [...new Set(jobs.map((job) => job.city).filter(Boolean))].sort()
  console.log(`Cities found: ${cities.join(', ')}`)
  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'ltimindtree')
    console.log('DB result:', result)
    process.exit(0)
  }
}
