import path from 'path'
import { fileURLToPath } from 'url'

import { filterIndiaJobs } from '../../scraper-support/utils/indiaLocationFilter.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const BASE_URL = 'https://careers.mediatek.com'
export const CAREERS_PAGE_URL = `${BASE_URL}/en/jobs`
const DETAIL_BASE_URL = `${BASE_URL}/eREC/JobSearch/JobDetail/`
const MEDIA_TECH_JOB_ID = /^MT[A-Z0-9]+$/i

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&ndash;|&#8211;/gi, '-')
    .replace(/&mdash;|&#8212;/gi, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || null
}

const toHtmlText = (value) => normalizeWhitespace(
  String(value || '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ''),
)

const jobIdFromUrl = (value) => {
  try {
    const id = new URL(value, BASE_URL).pathname.split('/').filter(Boolean).at(-1)
    return MEDIA_TECH_JOB_ID.test(id || '') ? id.toUpperCase() : null
  } catch {
    return null
  }
}

export const buildDetailUrl = (jobId) => {
  const normalizedId = String(jobId || '').trim().toUpperCase()
  if (!MEDIA_TECH_JOB_ID.test(normalizedId)) return null
  return `${DETAIL_BASE_URL}${normalizedId}`
}

const extractListingLocation = (html) => {
  const labeled = html.match(/(?:location|locationName|jobLocation)["'\s:=<>]+([^<"'}\]]+)/i)
  return normalizeWhitespace(labeled?.[1])
    || normalizeWhitespace(html.match(/<[^>]*class=["'][^"']*(?:location|city)[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i)?.[1])
    || normalizeWhitespace(html.match(/(?:India|Taiwan|China|Japan|Singapore|United States)[^<]{0,80}/i)?.[0])
}

export const extractListings = (html) => {
  const seenIds = new Set()

  return [...String(html || '').matchAll(/<a\b[^>]*href=["']([^"']*\/en\/jobs\/MT[A-Z0-9]+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => {
      const jobId = jobIdFromUrl(match[1])
      if (!jobId || seenIds.has(jobId)) return null
      seenIds.add(jobId)

      const title = toHtmlText(match[2])
      if (!title) return null

      return {
        title,
        jobId,
        sourceUrl: new URL(match[1], BASE_URL).toString(),
        listingLocation: extractListingLocation(match[2]),
      }
    })
    .filter(Boolean)
}

const extractLabeledValue = (html, label) => {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(`<dt[^>]*>\\s*${escapedLabel}\\s*<\\/dt>\\s*<dd[^>]*>([\\s\\S]*?)<\\/dd>`, 'i'),
    new RegExp(`<t[hd][^>]*>\\s*${escapedLabel}\\s*<\\/t[hd]>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`, 'i'),
    new RegExp(`${escapedLabel}\\s*:?\\s*<\\/[^>]+>\\s*<[^>]+>([\\s\\S]*?)<\\/[^>]+>`, 'i'),
  ]
  for (const pattern of patterns) {
    const value = normalizeWhitespace(html.match(pattern)?.[1])
    if (value) return value
  }
  return null
}

const extractDescription = (html) => {
  const match = String(html || '').match(/<(?:section|div)[^>]+(?:id|class)=["'][^"']*(?:job[-_ ]?description|jobdetail|description)[^"']*["'][^>]*>([\s\S]*?)<\/(?:section|div)>/i)
  return toHtmlText(match?.[1])
}

const extractCity = (location) => normalizeWhitespace(location)?.split(',')[0] || null

export const extractDetail = (html, listing) => {
  const location = extractLabeledValue(html, 'Location') || listing.listingLocation
  if (!location) return null

  return {
    title: extractLabeledValue(html, 'Job Title') || toHtmlText(String(html).match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]) || listing.title,
    company: 'MediaTek',
    department: extractLabeledValue(html, 'Department'),
    location,
    city: extractCity(location),
    country: /\bindia\b/i.test(location) ? 'India' : null,
    jobId: listing.jobId,
    requisitionId: extractLabeledValue(html, 'Job ID') || listing.jobId,
    sourceUrl: listing.sourceUrl,
    applyUrl: buildDetailUrl(listing.jobId),
    employmentType: extractLabeledValue(html, 'Employment Type') || extractLabeledValue(html, 'Job Type'),
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: extractDescription(html),
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; Jobify/1.0)',
    Accept: 'text/html,application/xhtml+xml',
  },
  label: 'mediatek',
  timeoutMs: 15000,
})

export const createMediatekScraper = ({ maxJobs = 100 } = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const listings = extractListings(await fetchText(CAREERS_PAGE_URL)).slice(0, maxJobs)
    const jobs = await Promise.all(listings.map(async (listing) => {
      const detailUrl = buildDetailUrl(listing.jobId)
      const detailHtml = await fetchText(detailUrl)
      return extractDetail(detailHtml, listing)
    }))

    return filterIndiaJobs(jobs.filter(Boolean)).map((job) => ({
      ...job,
      source: 'mediatek',
      link: job.applyUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createMediatekScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()
  console.log(`Total MediaTek India jobs scraped: ${jobs.length}`)
  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, 'mediatek')
}
