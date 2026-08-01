import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const HOMEPAGE_URL = 'https://www.movate.com/careers-at-movate/'
export const JOBS_PAGE_URL = 'https://www.movate.com/careers/latest-job-openings/'

const COMPANY = 'Movate'
const SOURCE = 'movate'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
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

const toAbsoluteUrl = (value, baseUrl = JOBS_PAGE_URL) => {
  if (!value) return null

  try {
    return new URL(decodeHtmlEntities(value), baseUrl).toString()
  } catch {
    return null
  }
}

const parseEmbeddedArray = (html) => {
  const raw = extractFirst(/var\s+arrayList\s*=\s*(\[[\s\S]*?\])\s*;/i, html)
  if (!raw) {
    throw new Error('Movate jobs page no longer exposes the embedded arrayList payload')
  }

  return JSON.parse(raw)
}

const extractListItems = (html) => [...String(html ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null

  const city = normalized.split(',')[0]?.trim() || null
  return /^bengaluru$/i.test(city) ? 'Bangalore' : city
}

const isIndiaListing = (record = {}) => {
  if (Number(record?.post_on_careers_page) !== 1) return false

  const normalizedCountry = normalizeWhitespace(record.location_country)?.toLowerCase()
  if (normalizedCountry === 'india') return true

  return /india/i.test(normalizeWhitespace(record.location) || '')
}

export const buildDetailUrl = (jobId) =>
  `https://www.movate.com/job-details/?job_id=${jobId}`

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  return /<title>\s*Careers at Movate\s*<\/title>/i.test(page)
    && /Latest Job Openings/i.test(page)
    && page.includes(JOBS_PAGE_URL)
}

export const hasOfficialJobsPageSignal = (html) => {
  const page = String(html ?? '')
  return /<title>\s*Latest Job Openings - Movate\s*<\/title>/i.test(page)
    && /var\s+arrayList\s*=\s*\[/i.test(page)
}

export const extractJobListData = (html) => parseEmbeddedArray(html)

export const extractIndiaJobs = (records) => (Array.isArray(records) ? records : [])
  .filter((record) => isIndiaListing(record))
  .map((record) => {
    const title = normalizeWhitespace(record.job_title)
    const location = normalizeWhitespace(record.location)
    const jobId = normalizeWhitespace(record.job_id)

    if (!title || !location || !jobId) return null

    const sourceUrl = buildDetailUrl(jobId)

    return {
      title,
      company: COMPANY,
      department: normalizeWhitespace(record.department),
      location,
      city: extractCity(location),
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: null,
      experienceRequired: normalizeWhitespace(record.experience),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: normalizeWhitespace(record.posted_date),
      closingDate: null,
      jobDescription: null,
      remoteStatus: null,
    }
  })
  .filter(Boolean)

export const extractJobDetail = (html, listing = {}) => {
  const applyUrl = toAbsoluteUrl(
    extractFirst(
      /https:\/\/movate\.darwinbox\.com\/ms\/candidate\/candidate\/login\?redirect=[^"'\\\s<]+/i,
      html,
      (match) => match[0],
    ),
    HOMEPAGE_URL,
  )

  const location = normalizeWhitespace(
    extractFirst(/<div[^>]+class="job-location"[^>]*>([\s\S]*?)<\/div>/i, html),
  ) || listing.location || null

  const department = normalizeWhitespace(
    extractFirst(/<div[^>]+class="job-department"[^>]*>([\s\S]*?)<\/div>/i, html),
  ) || listing.department || null

  const descriptionHtml = extractFirst(
    /<div[^>]+class="job-description"[^>]*>([\s\S]*?)<\/div>/i,
    html,
  )

  return {
    ...listing,
    title: normalizeWhitespace(extractFirst(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html)) || listing.title || null,
    department,
    location,
    city: extractCity(location) || listing.city || null,
    applyUrl: applyUrl || listing.applyUrl || null,
    sourceUrl: listing.sourceUrl || null,
    requiredSkills: extractListItems(descriptionHtml),
    jobDescription: stripTags(descriptionHtml),
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

export const createMovateScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Movate homepage no longer matches the verified official careers surface')
    }

    const jobsPageHtml = await fetchText(JOBS_PAGE_URL)
    if (!hasOfficialJobsPageSignal(jobsPageHtml)) {
      throw new Error('Movate jobs page no longer matches the verified embedded listings surface')
    }

    const listings = extractIndiaJobs(extractJobListData(jobsPageHtml))
    const selectedJobs = maxJobs ? listings.slice(0, maxJobs) : listings
    const jobs = []

    for (const listing of selectedJobs) {
      const detailHtml = await fetchText(listing.sourceUrl)
      const detail = extractJobDetail(detailHtml, listing)

      jobs.push({
        ...detail,
        source: SOURCE,
        link: detail.applyUrl || detail.sourceUrl,
        scrapedAt: now(),
      })
    }

    return jobs
  },
})

export const run = async () => createMovateScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Movate scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
