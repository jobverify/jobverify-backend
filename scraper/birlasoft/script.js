import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const BASE_URL = 'https://jobs.birlasoft.com'
const INDIA_PATH = '/go/India/684744/'
const PAGE_SIZE = 25
const DEFAULT_LOCALE = 'en_US'

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
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? transform(match) : null
}

const toAbsoluteUrl = (value) => {
  if (!value) return null
  try {
    return new URL(value, BASE_URL).toString()
  } catch {
    return null
  }
}

const toTitleCase = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  return normalized
    .toLowerCase()
    .split(' ')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ')
}

const normalizeDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const monthDayYear = /^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})$/.exec(normalized)
  if (monthDayYear) {
    const [, monthName, day, year] = monthDayYear
    const monthMap = {
      jan: '01',
      feb: '02',
      mar: '03',
      apr: '04',
      may: '05',
      jun: '06',
      jul: '07',
      aug: '08',
      sep: '09',
      oct: '10',
      nov: '11',
      dec: '12',
    }
    const month = monthMap[monthName.toLowerCase()]
    if (month) return `${year}-${month}-${day.padStart(2, '0')}`
  }

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

const normalizeIndiaLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const city = normalizeWhitespace(extractFirst(
    /INDIA\s*-\s*(.+?)(?:\s*-\s*BIRLASOFT|\s*,\s*IN\b|$)/i,
    normalized,
  ))
  if (!city) return 'India'

  return `${toTitleCase(city) || city}, India`
}

const extractCity = (location) => normalizeWhitespace(location)?.split(',')[0] || null

export const buildSearchUrl = ({ page = 1 } = {}) => {
  const pageNumber = Math.max(1, Number(page) || 1)
  const offset = (pageNumber - 1) * PAGE_SIZE
  const pathSuffix = offset > 0 ? `${offset}/` : ''
  return `${BASE_URL}${INDIA_PATH}${pathSuffix}?q=&sortColumn=referencedate&sortDirection=desc`
}

export const buildJobDetailUrl = (value) => toAbsoluteUrl(value)

export const buildApplyUrl = (jobId, locale = DEFAULT_LOCALE) =>
  `${BASE_URL}/talentcommunity/apply/${normalizeWhitespace(jobId) || ''}/?locale=${locale}&jobID=${normalizeWhitespace(jobId) || ''}#tracked`

export const extractSearchResults = (html) => [...String(html).matchAll(
  /<tr class="data-row">([\s\S]*?)<\/tr>/gi,
)]
  .map((match) => {
    const rowHtml = match[1]
    const detailPath = normalizeWhitespace(extractFirst(
      /<a href="([^"]+)" class="jobTitle-link">/i,
      rowHtml,
    ))
    const title = stripTags(extractFirst(/class="jobTitle-link">([\s\S]*?)<\/a>/i, rowHtml))
    const rawLocation = stripTags(extractFirst(/<span class="jobLocation">([\s\S]*?)<\/span>/i, rowHtml))
    const jobId = normalizeWhitespace(extractFirst(/\/(\d+)\/$/i, detailPath))
    const location = normalizeIndiaLocation(rawLocation)
    const sourceUrl = buildJobDetailUrl(detailPath)

    if (!detailPath || !title || !jobId || !location || !sourceUrl) return null

    return {
      title,
      company: 'Birlasoft',
      department: null,
      location,
      city: extractCity(location),
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: buildApplyUrl(jobId),
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: normalizeDate(extractFirst(/<span class="jobDate">([\s\S]*?)<\/span>/i, rowHtml)),
      closingDate: null,
      jobDescription: null,
    }
  })
  .filter(Boolean)

export const extractPaginationSummary = (html) => {
  const currentPage = Number.parseInt(
    normalizeWhitespace(extractFirst(/Page\s+(\d+)\s+of\s+\d+/i, html)) || '',
    10,
  )
  const totalPages = Number.parseInt(
    normalizeWhitespace(extractFirst(/Page\s+\d+\s+of\s+(\d+)/i, html)) || '',
    10,
  )
  const totalJobCount = Number.parseInt(
    normalizeWhitespace(extractFirst(/Results\s+\d+\s+to\s+\d+\s+of\s+(\d+)/i, html)) || '',
    10,
  )

  return {
    hasNext: Number.isFinite(currentPage) && Number.isFinite(totalPages) ? currentPage < totalPages : false,
    currentPage: Number.isFinite(currentPage) ? currentPage : null,
    totalPages: Number.isFinite(totalPages) ? totalPages : null,
    totalJobCount: Number.isFinite(totalJobCount) ? totalJobCount : null,
  }
}

export const extractJobDetail = (html, listing = {}) => {
  const title = stripTags(extractFirst(/itemprop="title"[^>]*>([\s\S]*?)<\/span>/i, html)) || listing.title || null
  const detailLocation = stripTags(extractFirst(
    /Location:[\s\S]*?<\/span>\s*<span[^>]*class="rtltextaligneligible"[^>]*>([\s\S]*?)<\/span>/i,
    html,
  ))
  const city = normalizeWhitespace(extractFirst(/itemprop="addressLocality" content="([^"]+)"/i, html))
    || listing.city
    || null
  const positionType = stripTags(extractFirst(
    /Position Type:[\s\S]*?<\/span>\s*<span[^>]*class="rtltextaligneligible"[^>]*>([\s\S]*?)<\/span>/i,
    html,
  ))
  const descriptionHtml = extractFirst(/itemprop="description"[^>]*>([\s\S]*?)<\/span>/i, html)
  const jobId = normalizeWhitespace(extractFirst(/jobID\s*:\s*'?(\d+)'?/i, html)) || listing.jobId || null

  return {
    title,
    company: 'Birlasoft',
    department: null,
    location: normalizeIndiaLocation(detailLocation) || listing.location || null,
    city,
    jobId,
    requisitionId: stripTags(extractFirst(
      /Requisition ID:[\s\S]*?<\/span>\s*<span[^>]*class="rtltextaligneligible"[^>]*>([\s\S]*?)<\/span>/i,
      html,
    )) || listing.requisitionId || null,
    sourceUrl: listing.sourceUrl || buildJobDetailUrl(listing.sourceUrl),
    applyUrl: buildApplyUrl(jobId),
    employmentType: positionType || null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: extractListItems(descriptionHtml),
    postingDate: normalizeDate(extractFirst(/itemprop="datePosted" content="([^"]+)"/i, html)) || listing.postingDate || null,
    closingDate: normalizeDate(extractFirst(/itemprop="validThrough" content="([^"]+)"/i, html)),
    jobDescription: stripTags(descriptionHtml),
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
  const maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null

  for (let page = 1; page <= maxPages; page += 1) {
    const html = await fetchText(buildSearchUrl({ page }))
    const listings = extractSearchResults(html)
    const summary = extractPaginationSummary(html)

    for (const listing of listings) {
      if (seenJobIds.has(listing.jobId)) continue
      seenJobIds.add(listing.jobId)

      const detailHtml = await fetchText(listing.sourceUrl)
      const detail = extractJobDetail(detailHtml, listing)

      jobs.push({
        ...detail,
        company: 'Birlasoft',
        source: 'birlasoft',
        link: detail.applyUrl || detail.sourceUrl,
        scrapedAt: new Date().toISOString(),
      })

      if (maxJobs && jobs.length >= maxJobs) {
        return jobs
      }
    }

    if (!summary.hasNext || (summary.totalPages && page >= summary.totalPages)) {
      break
    }
  }

  return jobs
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Birlasoft scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)
  const cities = [...new Set(jobs.map((job) => job.city).filter(Boolean))].sort()
  console.log(`Cities found: ${cities.join(', ')}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'birlasoft')
    console.log('DB result:', result)
    process.exit(0)
  }
}
