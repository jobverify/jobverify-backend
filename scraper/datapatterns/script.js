import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://www.datapatternsindia.com/careers/current-openings.php'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&#8211;|&ndash;|&#8212;|&mdash;/gi, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([:;,])/g, '$1')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const toAbsoluteUrl = (value) => new URL(value, CAREER_PAGE_URL).toString()

const extractOpeningFields = (html) => {
  const fields = new Map()
  const pattern = /<div\b[^>]*\bid\s*=\s*["']opening["'][^>]*>\s*<div\b[^>]*\bid\s*=\s*["']openingleft["'][^>]*>([\s\S]*?)<\/div>\s*<div\b[^>]*\bid\s*=\s*["']openingright["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi

  for (const match of String(html ?? '').matchAll(pattern)) {
    const label = stripTags(match[1])?.toLowerCase()
    if (label) fields.set(label, match[2])
  }

  return fields
}

const extractMinimumQualification = (descriptionHtml) => {
  const lines = String(descriptionHtml ?? '')
    .replace(/<(br|\/p)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)

  const qualification = lines.find((line) => /\bqualifications?\s*[:;]/i.test(line))
  return normalizeWhitespace(qualification?.replace(/^.*?\bqualifications?\s*[:;]?\s*/i, ''))
}

export const extractListings = (html) => {
  const listings = new Map()
  const pattern = /<a\b[^>]*href\s*=\s*["']([^"']*openings\.php\?id=(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi

  for (const match of String(html ?? '').matchAll(pattern)) {
    const requisitionId = normalizeWhitespace(match[2])
    const title = stripTags(match[3])
    if (!requisitionId || !title || listings.has(requisitionId)) continue

    listings.set(requisitionId, {
      title,
      requisitionId,
      detailUrl: toAbsoluteUrl(match[1]),
    })
  }

  return [...listings.values()]
}

export const extractDataPatternsJob = (html, listing) => {
  const fields = extractOpeningFields(html)
  const descriptionHtml = fields.get('job description') || ''
  const title = stripTags(fields.get('designation')) || listing.title
  const location = stripTags(fields.get('location')) || 'India'
  const normalizedLocation = /india/i.test(location) ? location : `${location}, India`
  const applyUrl = String(fields.get('email') || '').match(/href\s*=\s*["'](mailto:[^"']+)["']/i)?.[1] || null

  return {
    title,
    company: 'Data Patterns',
    department: stripTags(fields.get('functional area')),
    location: normalizedLocation,
    city: normalizeWhitespace(location.split(',')[0]),
    country: 'India',
    jobId: `datapatterns-${listing.requisitionId}`,
    requisitionId: listing.requisitionId,
    sourceUrl: listing.detailUrl,
    applyUrl,
    employmentType: null,
    experienceRequired: stripTags(fields.get('experience')),
    minimumQualification: extractMinimumQualification(descriptionHtml),
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: stripTags(descriptionHtml),
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'datapatterns',
  timeoutMs: 15000,
})

export const createDataPatternsScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const listingHtml = await fetchText(CAREER_PAGE_URL)
    const listings = extractListings(listingHtml)
    const selectedListings = maxJobs ? listings.slice(0, maxJobs) : listings
    const jobs = []

    for (const listing of selectedListings) {
      const detailHtml = await fetchText(listing.detailUrl)
      jobs.push(extractDataPatternsJob(detailHtml, listing))
    }

    return jobs.map((job) => ({
      ...job,
      source: 'datapatterns',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createDataPatternsScraper().run()
