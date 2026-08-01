import path from 'path'
import { fileURLToPath } from 'url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const BASE_URL = 'https://www.suntecgroup.com'
export const CAREERS_URL = `${BASE_URL}/career/`

const SOURCE = 'suntec'
const COMPANY = 'SunTec Group'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&#x27;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/section|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, ' ')
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const toAbsoluteUrl = (value) => {
  if (!value) return null

  try {
    return new URL(decodeHtmlEntities(value), BASE_URL).toString()
  } catch {
    return null
  }
}

const slugFromUrl = (url) => {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean)
    return parts[parts.length - 1] || null
  } catch {
    return null
  }
}

const isDetailUrl = (url) => {
  if (!url) return false

  try {
    const parsed = new URL(url)
    return /(^|\.)suntecgroup\.com$/i.test(parsed.hostname)
      && /^\/careers\/[^/]+\/?$/i.test(parsed.pathname)
  } catch {
    return false
  }
}

const getTextLines = (html) => [...String(html ?? '').matchAll(/<(?:p|li|h1|h2|h3|h4)[^>]*>([\s\S]*?)<\/(?:p|li|h1|h2|h3|h4)>/gi)]
  .map((match) => normalizeWhitespace(match[1]))
  .filter(Boolean)

const extractFieldFromLines = (lines, label) => {
  const matcher = new RegExp(`^${label}\\s*:\\s*(.+)$`, 'i')

  for (const line of lines) {
    const match = matcher.exec(line)
    if (match) return normalizeWhitespace(match[1])
  }

  return null
}

const extractDescription = (html) => {
  const sectionMatch = String(html ?? '').match(
    /<(section|div)[^>]*class=["'][^"']*elementor-widget-theme-post-content[^"']*["'][^>]*>([\s\S]*?)<\/\1>/i,
  )

  return stripTags(sectionMatch?.[2]) || null
}

const inferRemoteStatus = (location) => {
  if (/hybrid/i.test(location || '')) return 'Hybrid'
  if (/remote|work from home/i.test(location || '')) return 'Remote'
  return 'On-site'
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /SunTec Group/i.test(page)
    && /Career/i.test(page)
    && /(Gravity Forms|gform_wrapper|elementor)/i.test(page)
    && /href=["'][^"']*(?:https?:\/\/www\.suntecgroup\.com)?\/careers\/[^"'/?#]+\/?["']/i.test(page)
}

export const extractListings = (html) => {
  const jobs = []
  const seen = new Set()

  for (const match of String(html ?? '').matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const sourceUrl = toAbsoluteUrl(match[1])
    const title = normalizeWhitespace(match[2])
    const jobId = slugFromUrl(sourceUrl)

    if (!isDetailUrl(sourceUrl) || !title || !jobId || seen.has(sourceUrl)) continue

    seen.add(sourceUrl)
    jobs.push({
      title,
      company: COMPANY,
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: sourceUrl,
    })
  }

  return jobs
}

export const extractJobDetail = (html, listing = {}) => {
  const lines = getTextLines(html)
  const title = normalizeWhitespace(lines[0]) || listing.title || null
  const department = extractFieldFromLines(lines, 'Department')
  const location = extractFieldFromLines(lines, 'Location')
  const experienceRequired = extractFieldFromLines(lines, 'Experience')
  const city = normalizeWhitespace(location)?.split(',')[0] || null
  const country = /india/i.test(location || '') ? 'India' : null

  return {
    title,
    company: COMPANY,
    department,
    location,
    city,
    country,
    jobId: listing.jobId || slugFromUrl(listing.sourceUrl) || null,
    requisitionId: listing.requisitionId || listing.jobId || slugFromUrl(listing.sourceUrl) || null,
    sourceUrl: listing.sourceUrl || null,
    applyUrl: listing.sourceUrl || listing.applyUrl || null,
    employmentType: null,
    experienceRequired,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: extractDescription(html),
    remoteStatus: inferRemoteStatus(location),
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createSuntecScraper = ({ maxJobs = null } = {}) => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('verified SunTec careers surface no longer matches the official public careers page')
    }

    const listings = extractListings(careersHtml)
    const selectedListings = maxJobs ? listings.slice(0, maxJobs) : listings
    const jobs = []

    for (const listing of selectedListings) {
      const detailHtml = await fetchText(listing.sourceUrl)
      jobs.push({
        ...extractJobDetail(detailHtml, listing),
        source: SOURCE,
        link: listing.sourceUrl,
        scrapedAt: now(),
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createSuntecScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running SunTec scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)

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
