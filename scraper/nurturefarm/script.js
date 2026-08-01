import path from 'path'
import { fileURLToPath } from 'url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_URL = 'https://nurture.skillate.com/'

const COMPANY = 'Nurture.Farm'
const SOURCE = 'nurturefarm'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || null
}

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, '\'')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const stripTags = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<\/(div|section|article|li|p|h[1-6]|main|header|footer|a)>/gi, '\n')
  .replace(/<(br|hr)\b[^>]*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')

const extractVisibleLines = (html) => stripTags(html)
  .split(/\r?\n/)
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const normalizeLocation = (value) => {
  const location = normalizeWhitespace(value)
  if (!location) {
    return { city: null, country: 'India', location: 'India' }
  }

  if (/india/i.test(location)) {
    const city = normalizeWhitespace(location.replace(/,\s*india$/i, ''))
    return {
      city: city && !/^india$/i.test(city) ? city : null,
      country: 'India',
      location,
    }
  }

  return {
    city: location,
    country: 'India',
    location: `${location}, India`,
  }
}

const resolveJobUrl = (href) => {
  if (!href) return CAREERS_URL

  try {
    return new URL(href, CAREERS_URL).toString()
  } catch {
    return CAREERS_URL
  }
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return /Job openings at Nurture\.Farm/i.test(page)
    && /\bOpen Jobs\b/i.test(page)
    && /\bDepartment\b/i.test(page)
    && /\bLocation\b/i.test(page)
    && /Join Talent Pool|powered-by-skillate/i.test(page)
}

export const extractViewJobUrls = (html) => [...String(html ?? '').matchAll(
  /<a\b[^>]*href=["']([^"']+)["'][^>]*>\s*View Job\s*<\/a>/gi,
)]
  .map((match) => resolveJobUrl(match[1]))

export const extractJobListings = (html) => {
  if (!hasOfficialCareersSignal(html)) return []

  const lines = extractVisibleLines(html)
  const viewJobUrls = extractViewJobUrls(html)
  const roleIndex = lines.findIndex((line) => /^ROLE$/i.test(line))
  if (roleIndex === -1) return []

  const jobs = []
  for (let index = roleIndex + 3; index < lines.length; index += 1) {
    const title = lines[index]
    if (!title) continue
    if (/^Join Talent Pool$/i.test(title) || /^Submit Resume$/i.test(title)) break
    if (/^View Job$/i.test(title)) continue

    const locationLine = lines[index + 1]
    const department = normalizeWhitespace(lines[index + 2])
    const action = lines[index + 3]

    if (!locationLine || !department || !/^View Job$/i.test(action)) continue

    const jobId = slugify(title)
    const location = normalizeLocation(locationLine)
    const applyUrl = viewJobUrls[jobs.length] || CAREERS_URL

    jobs.push({
      title,
      location: location.location,
      city: location.city,
      country: location.country,
      jobId,
      requisitionId: jobId,
      sourceUrl: CAREERS_URL,
      applyUrl,
      department,
      employmentType: null,
      experienceRequired: null,
      postingDate: null,
      closingDate: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      jobDescription: null,
      remoteStatus: 'On-site',
    })

    index += 3
  }

  return jobs
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createNurtureFarmScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(html)) {
      throw new Error('Nurture.Farm careers page no longer matches the verified public Skillate surface')
    }

    return extractJobListings(html).map((job) => ({
      ...job,
      company: COMPANY,
      link: job.applyUrl || job.sourceUrl,
      source: SOURCE,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createNurtureFarmScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Nurture.Farm scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
