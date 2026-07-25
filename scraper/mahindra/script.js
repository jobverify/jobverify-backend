import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const BASE_URL = 'https://jobs.mahindracareers.com'
const SEARCH_PATH = '/search/?q=&sortColumn=referencedate&sortDirection=desc'

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

export const buildSearchPageUrl = (startRow = 0) => {
  const url = new URL(SEARCH_PATH, BASE_URL)
  if (startRow > 0) {
    url.searchParams.set('startrow', String(startRow))
  }
  return url.toString()
}

export const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  if (/remote/i.test(normalized)) return 'Remote'
  return normalized.split(',')[0]?.trim() || null
}

export const extractJobIdFromUrl = (value) =>
  extractFirst(/\/(\d+)\/?(?:[#?].*)?$/i, value, (match) => match[1])

export const extractSearchResults = (html) => {
  const rows = [...String(html).matchAll(/<tr[^>]*class="data-row"[^>]*>([\s\S]*?)<\/tr>/gi)]

  return rows
    .map((rowMatch) => {
      const rowHtml = rowMatch[1]
      const title = normalizeWhitespace(
        extractFirst(/<a[^>]*class="jobTitle-link"[^>]*>([\s\S]*?)<\/a>/i, rowHtml) ?? null,
      )
      const relativeLink = normalizeWhitespace(
        extractFirst(/<a(?=[^>]*class="jobTitle-link")(?=[^>]*href="([^"]+)")[^>]*>/i, rowHtml) ?? null,
      )
      const location = normalizeWhitespace(
        extractFirst(/<td class="colLocation[\s\S]*?<span class="jobLocation">\s*([\s\S]*?)\s*<\/span>/i, rowHtml) ?? null,
      )
      const facility = normalizeWhitespace(
        extractFirst(/<td class="colFacility[\s\S]*?<span class="jobFacility">\s*([\s\S]*?)\s*<\/span>/i, rowHtml) ?? null,
      )
      const business = normalizeWhitespace(
        extractFirst(/<td class="colShifttype[\s\S]*?<span class="jobShifttype">\s*([\s\S]*?)\s*<\/span>/i, rowHtml) ?? null,
      )
      const soarJob = normalizeWhitespace(
        extractFirst(/<td class="colDepartment[\s\S]*?<span class="jobDepartment">\s*([\s\S]*?)\s*<\/span>/i, rowHtml) ?? null,
      )
      const sourceUrl = toAbsoluteUrl(relativeLink)
      const jobId = extractJobIdFromUrl(sourceUrl)

      if (!title || !sourceUrl || !jobId) return null

      return {
        title,
        location,
        city: extractCity(location),
        facility,
        business,
        soarJob,
        jobId,
        requisitionId: jobId,
        sourceUrl,
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

const extractJobDescriptionBlock = (html) => {
  const longDescription = extractFirst(
    /data-careersite-propertyid="description"[^>]*>([\s\S]*?)<br\s*\/?>\s*<strong>\s*Job Segment:/i,
    html,
  )
  if (longDescription) return longDescription

  return extractFirst(/<span class="jobdescription">([\s\S]*?)<\/span>/i, html)
}

const extractSectionText = (descriptionText, heading) => {
  if (!descriptionText) return null

  const headings = [
    'Responsibilities & Key Deliverables',
    'Qualifications',
    'Preferred Industries',
    'General Requirements',
    'Key Success Factors',
  ]
  const nextHeadingsPattern = headings
    .filter((item) => item !== heading)
    .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')

  const pattern = new RegExp(
    `${heading.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\s*([\\s\\S]*?)(?:${nextHeadingsPattern}|$)`,
    'i',
  )

  return normalizeWhitespace(extractFirst(pattern, descriptionText) ?? null)
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

export const extractJobDetail = (html, listing = {}) => {
  const descriptionHtml = extractJobDescriptionBlock(html)
  const descriptionText = stripTags(descriptionHtml)
  const qualificationsText = extractSectionText(descriptionText, 'Qualifications')
  const experienceRequired = normalizeWhitespace(
    extractFirst(/(\d+\s*(?:\+|-|to)\s*\d+\s+years?[^.]*|(?:minimum\s+)?\d+\+?\s+years?[^.]*)/i, descriptionText) ??
      null,
  )

  const applyPath = normalizeWhitespace(
    extractFirst(/class="btn btn-primary btn-large btn-lg apply dialogApplyBtn "\s+href="([^"]+)"/i, html) ??
      null,
  )

  return {
    title: listing.title || normalizeWhitespace(
      extractFirst(/<meta property="og:description" content="([^"]+)"/i, html) ?? null,
    ),
    location: listing.location || normalizeWhitespace(
      extractFirst(/itemprop="addressLocality" content="([^"]+)"/i, html) ?? null,
    ),
    city: listing.city || normalizeWhitespace(
      extractFirst(/itemprop="addressLocality" content="([^"]+)"/i, html) ?? null,
    ),
    department: listing.facility || listing.business || null,
    employmentType: 'Full-time',
    experienceRequired,
    jobDescription: descriptionText,
    minimumQualification: qualificationsText,
    preferredQualification: null,
    requiredSkills: extractJobSegments(html),
    postingDate: normalizeWhitespace(
      extractFirst(/itemprop="datePosted" content="([^"]+)"/i, html) ?? null,
    ),
    closingDate: normalizeWhitespace(
      extractFirst(/itemprop="validThrough" content="([^"]+)"/i, html) ?? null,
    ),
    applyUrl: toAbsoluteUrl(applyPath) || (listing.jobId ? toAbsoluteUrl(`/talentcommunity/apply/${listing.jobId}/?locale=en_GB`) : null),
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
  const jobs = []
  const seenJobIds = new Set()
  const maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const listingUrl = buildSearchPageUrl(pageIndex * 10)
    const listingHtml = await fetchText(listingUrl)
    const listings = extractSearchResults(listingHtml)

    if (listings.length === 0) break

    for (const listing of listings) {
      if (seenJobIds.has(listing.jobId)) continue
      seenJobIds.add(listing.jobId)

      const detailHtml = await fetchText(listing.sourceUrl)
      const detail = extractJobDetail(detailHtml, listing)

      jobs.push({
        jobId: listing.jobId,
        requisitionId: listing.requisitionId,
        title: listing.title,
        company: 'Mahindra Group',
        department: detail.department,
        location: listing.location,
        city: listing.city,
        link: detail.applyUrl || detail.sourceUrl || listing.sourceUrl,
        applyUrl: detail.applyUrl || listing.sourceUrl,
        sourceUrl: detail.sourceUrl || listing.sourceUrl,
        source: 'mahindra',
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

    if (listings.length < 10) break
  }

  return jobs
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Mahindra scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)
  const cities = [...new Set(jobs.map((job) => job.city).filter(Boolean))].sort()
  console.log(`Cities found: ${cities.join(', ')}`)
  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'mahindra')
    console.log('DB result:', result)
    process.exit(0)
  }
}
