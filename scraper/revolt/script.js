import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'revolt'
export const COMPANY = 'Revolt'
export const HOMEPAGE_URL = 'https://www.revoltmotors.com/'
export const CAREERS_URL = 'https://www.revoltmotors.com/career-with-us'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/\u00a0/g, ' ')

const stripTags = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = stripTags(value)
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/['"]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const toTitleCase = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/\b[a-z]/g, (match) => match.toUpperCase()) || null

const normalizeLocation = (value) => {
  const normalized = toTitleCase(value)
  if (!normalized) return null
  return normalized.replace(/\s*\/\s*/g, '/ ').replace(/\s*,\s*/g, ', ')
}

const toCity = (location) => {
  const normalized = normalizeLocation(location)
  if (!normalized) return null
  if (/[,/]/.test(normalized)) return null
  return normalized
}

const formatLocation = (location) => {
  const normalized = normalizeLocation(location)
  if (!normalized) return null
  return /india$/i.test(normalized) ? normalized : `${normalized}, India`
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return /<title>\s*Revolt Electric Bikes- EV Bike Price India and Latest Models\s*<\/title>/i.test(page)
    && /<meta[^>]+name="description"[^>]+Find the best electric bikes in India/i.test(page)
    && /<meta[^>]+property="og:site_name"[^>]+content="Revolt Motors"/i.test(page)
    && /href="\/career-with-us"/i.test(page)
    && normalized.includes('contact@revoltmotors.com')
    && normalized.includes('Revolt Intellicorp Private Limited')
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return /<title>\s*Revolt Motors Careers \| Jobs and Hiring Opportunities\s*<\/title>/i.test(page)
    && /<link[^>]+rel="canonical"[^>]+href="https:\/\/www\.revoltmotors\.com\/career-with-us"/i.test(page)
    && normalized.includes('Build your career at Revolt')
    && normalized.includes('Check all our job openings')
    && normalized.includes('Select Department')
    && normalized.includes('Select Location')
    && normalized.includes('Apply Filter')
}

export const extractJobOpenings = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('Revolt verified first-party careers page no longer matches the trusted public surface')
  }

  const blocks = String(html ?? '').split(/<div data-slot="card" class="/i).slice(1)
  const jobs = []

  for (const block of blocks) {
    const title = normalizeWhitespace(
      block.match(/<div data-slot="card-title"[^>]*>([\s\S]*?)<\/div>/i)?.[1],
    )
    const spans = [...block.matchAll(/<span(?:\s[^>]*)?>([\s\S]*?)<\/span>/gi)]
      .map((match) => normalizeWhitespace(match[1]))
      .filter(Boolean)
    const description = normalizeWhitespace(
      block.match(/<div data-slot="card-content"[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/i)?.[1],
    )

    const location = spans[0]
    const department = spans[1]

    if (!title || !location || !department || !description) {
      continue
    }

    const normalizedLocation = formatLocation(location)
    const city = toCity(location)
    const jobSlug = slugify(`${SOURCE}-${title}-${department}-${location}`)

    if (!jobSlug || !normalizedLocation) {
      throw new Error(`Revolt verified card for ${title} no longer exposes a stable identifier`)
    }

    jobs.push({
      title,
      company: COMPANY,
      location: normalizedLocation,
      city,
      country: 'India',
      department,
      jobId: jobSlug,
      requisitionId: jobSlug,
      sourceUrl: CAREERS_URL,
      applyUrl: CAREERS_URL,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: description,
    })
  }

  if (jobs.length === 0) {
    throw new Error('Revolt verified first-party careers page no longer exposes inline public role cards')
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

export const createRevoltScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Revolt verified official homepage no longer matches the trusted public surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    const jobs = extractJobOpenings(careersHtml)
    const scrapedAt = now()

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt,
    }))
  },
})

export const run = async (options = {}) => createRevoltScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
