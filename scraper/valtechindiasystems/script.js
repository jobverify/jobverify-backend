import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { VALTECH_INDIA_SYSTEMS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = VALTECH_INDIA_SYSTEMS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const JOBS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&amp;/gi, '&')
  .replace(/&nbsp;/gi, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim() || null

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '').replace(/<[^>]+>/g, ' '),
)

const extractFirst = (pattern, value) => pattern.exec(String(value ?? ''))?.[1] ?? null

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

const toAbsoluteUrl = (value, baseUrl = JOBS_URL) => {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

export const hasOfficialJobsPageSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  return /Jobs list - Valtech India/i.test(rawHtml)
    && /<h1[^>]*>\s*Jobs list\s*<\/h1>/i.test(rawHtml)
    && /careers\.india\.valtech\.com\/jobs\/\d+/i.test(rawHtml)
}

const parseDotLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  const parts = normalized?.split(/\s*[·•]\s*/).map((part) => normalizeWhitespace(part)).filter(Boolean) || []

  return {
    department: parts[0] || null,
    location: parts[1] ? `${parts[1]}, India` : null,
    city: parts[1] || null,
  }
}

export const extractJobListings = (html = '') => Array.from(
  String(html ?? '').matchAll(/<div[^>]*class=["'][^"']*job-listing[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi),
)
  .map((match) => {
    const block = match[1]
    const sourceUrl = toAbsoluteUrl(extractFirst(/<a[^>]+href=["']([^"']+\/jobs\/\d+[^"']*)["']/i, block))
    const title = stripTags(extractFirst(/<a[^>]*>([\s\S]*?)<\/a>/i, block))
    const meta = parseDotLocation(stripTags(extractFirst(/<p[^>]*>([\s\S]*?)<\/p>/i, block)))

    if (!sourceUrl || !title || !meta.location) return null

    return {
      title,
      company: COMPANY,
      department: meta.department,
      location: meta.location,
      city: meta.city,
      country: 'India',
      sourceUrl,
      applyUrl: sourceUrl,
      requiredSkills: [],
    }
  })
  .filter(Boolean)

export const extractJobDetail = (html = '', listing = {}) => {
  const applyUrl = toAbsoluteUrl(
    extractFirst(/<a[^>]+href=["']([^"']*\/apply)["'][^>]*>\s*Apply for this job/i, html),
    listing.sourceUrl,
  ) || listing.sourceUrl
  const title = stripTags(extractFirst(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html)) || listing.title
  const description = [
    stripTags(extractFirst(/<p[^>]*>(We are Valtech[\s\S]*?)<\/p>/i, html)),
    ...[...String(html ?? '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((match) => stripTags(match[1])),
  ].filter(Boolean)
  const requiredSkills = [...String(html ?? '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)

  const detailDepartment = stripTags(extractFirst(/Department<\/div>\s*<div>([\s\S]*?)<\/div>/i, html)) || listing.department
  const detailLocation = stripTags(extractFirst(/Locations<\/div>\s*<div>([\s\S]*?)<\/div>/i, html))
  const city = detailLocation || listing.city

  return {
    title,
    company: COMPANY,
    department: detailDepartment,
    location: city ? `${city}, India` : listing.location,
    city,
    country: 'India',
    sourceUrl: listing.sourceUrl,
    applyUrl,
    requiredSkills,
    employmentType: null,
    postingDate: null,
    jobDescription: normalizeWhitespace(description.join(' ')),
  }
}

export const createValtechindiasystemsScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now: overrideNow = now,
  } = {}) {
    const listingHtml = await fetchText(JOBS_URL)
    if (!hasOfficialJobsPageSignal(listingHtml)) {
      throw new Error('Valtech verified Teamtailor listing page no longer matches the known public jobs surface')
    }

    const scrapedAt = overrideNow()
    const jobs = []

    for (const listing of extractJobListings(listingHtml)) {
      const detail = extractJobDetail(await fetchText(listing.sourceUrl), listing)
      jobs.push({
        ...detail,
        link: detail.applyUrl || detail.sourceUrl,
        source: SOURCE,
        scrapedAt,
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createValtechindiasystemsScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
