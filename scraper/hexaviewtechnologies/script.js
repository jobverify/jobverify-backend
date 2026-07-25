import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { HEXAVIEW_TECHNOLOGIES_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const JOB_LISTING_URL = PROVIDER_METADATA.jobListingUrl

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripScriptsAndStyles = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')

const stripTags = (value) => normalizeWhitespace(stripScriptsAndStyles(value).replace(/<[^>]+>/g, ' '))

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const formatLocation = (locations) => {
  const label = locations.join('/')
  return label ? `${label}, India` : 'India'
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (/^full\s*time$/i.test(normalized) || /^fulltime$/i.test(normalized)) return 'Full-time'
  return normalized
}

const normalizeRemoteStatus = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase()
}

const extractTags = (block = '') => Array.from(
  block.matchAll(/<div[^>]*class="job-list-gray-tag[^"]*"[^>]*>([\s\S]*?)<\/div>/gi),
  (match) => normalizeWhitespace(match[1]),
).filter(Boolean)

const extractDescription = (block = '') => {
  const match = block.match(/<div[^>]*class="job-body-rich-text[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i)
  if (!match) return null
  return stripTags(match[1])
}

const extractDepartment = (block = '') => {
  const match = block.match(/fs-cmsfilter-field="category"[^>]*>([\s\S]*?)<\/div>/i)
  return normalizeWhitespace(match?.[1] ?? null)
}

const toAbsoluteUrl = (value, baseUrl = JOB_LISTING_URL) => {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

export const hasOfficialCareersLandingSignal = (html = '') => {
  const normalized = stripTags(html) || ''

  return normalized.includes('Join Team of Innovators')
    && normalized.includes('Build the Best Work of Your Life')
    && /\/job-listing\b/i.test(String(html ?? ''))
}

export const hasOfficialJobListingSignal = (html = '') => {
  const normalized = stripTags(html) || ''

  return normalized.includes('Job Openings')
    && normalized.includes('Hexaview Technologies')
    && /job-openings\//i.test(String(html ?? ''))
    && normalized.includes('Apply Now')
}

export const extractNextPagePath = (html = '') => {
  const match = String(html ?? '').match(/<a[^>]+href="([^"]+)"[^>]*(?:aria-label="Next Page"|fs-cmsload-mode="load-under")[^>]*>/i)
  return normalizeWhitespace(match?.[1] ?? null)
}

const extractJobCards = (html = '') => {
  const cards = []
  const pattern = /<div role="listitem" class="job-list-item w-dyn-item">([\s\S]*?)<\/div>\s*<div class="job-category-hide w-dyn-list">([\s\S]*?)<\/div>\s*<\/div>/gi

  for (const match of html.matchAll(pattern)) {
    const body = match[1]
    const categoryMarkup = match[2]
    const title = normalizeWhitespace(body.match(/<h2[^>]*fs-cmsfilter-field="name"[^>]*>([\s\S]*?)<\/h2>/i)?.[1])
    const company = normalizeWhitespace(body.match(/<div[^>]*class="job-company-name"[^>]*>([\s\S]*?)<\/div>/i)?.[1])
    const locationText = normalizeWhitespace(body.match(/<div[^>]*class="job-location"[^>]*>([\s\S]*?)<\/div>/i)?.[1])
    const applyUrl = toAbsoluteUrl(body.match(/<a[^>]+href="([^"]+)"[^>]*class="job-apply-button/i)?.[1])
    const tags = extractTags(body)
    const locations = (locationText || '')
      .split('/')
      .map((value) => normalizeWhitespace(value))
      .filter(Boolean)

    if (!title || !company || !applyUrl || locations.length === 0) continue

    cards.push({
      title,
      department: extractDepartment(categoryMarkup),
      company,
      location: formatLocation(locations),
      city: locations[0],
      locations,
      employmentType: normalizeEmploymentType(tags.find((tag) => /full\s*time|fulltime/i.test(tag))),
      remoteStatus: normalizeRemoteStatus(tags.find((tag) => /hybrid|remote|on-site|onsite/i.test(tag))),
      applyUrl,
      sourceUrl: applyUrl,
      requisitionId: applyUrl.split('/').filter(Boolean).at(-1) ?? null,
      jobDescription: extractDescription(body),
    })
  }

  return cards
}

export const createHexaViewTechnologiesScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const landingHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersLandingSignal(landingHtml)) {
      throw new Error('The verified HexaView careers landing page no longer matches the trusted first-party surface')
    }

    const visited = new Set()
    const queued = [JOB_LISTING_URL]
    const jobs = []

    while (queued.length > 0) {
      const pageUrl = queued.shift()
      if (!pageUrl || visited.has(pageUrl)) continue
      visited.add(pageUrl)

      const html = await fetchText(pageUrl)
      if (!hasOfficialJobListingSignal(html)) {
        throw new Error(`The verified HexaView job listing surface changed unexpectedly at ${pageUrl}`)
      }

      jobs.push(...extractJobCards(html))

      const nextPagePath = extractNextPagePath(html)
      if (nextPagePath) {
        queued.push(toAbsoluteUrl(nextPagePath, pageUrl))
      }
    }

    const seen = new Set()

    return jobs.filter((job) => {
      const key = `${job.applyUrl}|${job.location}|${job.title}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).map((job) => ({
      title: job.title,
      company: COMPANY,
      department: job.department,
      location: job.location,
      locations: job.locations,
      city: job.city,
      country: 'India',
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
      link: job.applyUrl,
      jobId: `${job.requisitionId}-${slugify(job.locations.join('-'))}`,
      requisitionId: job.requisitionId,
      employmentType: job.employmentType,
      remoteStatus: job.remoteStatus,
      jobDescription: job.jobDescription,
      source: SOURCE,
      scrapedAt: now(),
      companyCareerPage: JOB_LISTING_URL,
      companyDomain: PROVIDER_METADATA.companyDomain,
      atsPlatform: PROVIDER_METADATA.atsPlatform,
    }))
  },
})

export const run = async (options = {}) => createHexaViewTechnologiesScraper(options).run(options)

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
