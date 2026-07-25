import path from 'path'
import { fileURLToPath } from 'url'

import { normalizeCity } from '../utils/cityNormalizer.js'
import { fetchTextWithRetry } from '../utils/fetch.js'
import { isIndiaJob as isIndiaJobInScope } from '../utils/indiaLocationFilter.js'
import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREERS_URL = 'https://www.ganitinc.com/careers'
export const COMPANY = 'Ganit'
export const SOURCE = 'ganit'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
const DETAIL_URL_REGEX = /^https:\/\/ganitinc\.zohorecruit\.in\/jobs\/Careers\/(\d+)\/[^?\s]+(?:\?[^"\s<>]*)?$/i

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => String(value ?? '').replace(/<[^>]+>/g, ' ')

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (/full.?time/.test(normalized)) return 'Full-time'
  if (/part.?time/.test(normalized)) return 'Part-time'
  if (/contract/.test(normalized)) return 'Contract'
  if (/intern/.test(normalized)) return 'Internship'
  return normalizeWhitespace(value)
}

const inferCity = (location) => {
  const primaryToken = String(location ?? '').split(',')[0]?.split('/')[0]?.trim()
  return normalizeCity(primaryToken) || normalizeCity(location) || null
}

const inferCountry = (location, city) => {
  if (/india/i.test(String(location ?? ''))) return 'India'
  if (city && isIndiaJobInScope({ location, city })) return 'India'
  return null
}

const extractParagraphs = (blockHtml) => Array.from(String(blockHtml ?? '').matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi))
  .map((match) => normalizeWhitespace(stripTags(match[1])))
  .filter(Boolean)

const extractField = (blockHtml, label) => {
  const value = extractParagraphs(blockHtml)
    .find((paragraph) => new RegExp(`^${label}\\s*:`, 'i').test(paragraph))

  return normalizeWhitespace(value?.replace(new RegExp(`^${label}\\s*:`, 'i'), ''))
}

const extractDescription = (blockHtml) => {
  const paragraphs = extractParagraphs(blockHtml)

  return paragraphs.find((value) => !/^(location|department|employment type)\s*:/i.test(value)) || null
}

const extractBlocks = (html) => Array.from(String(html ?? '').matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/gi))
  .map((match) => match[0])

const extractHref = (blockHtml) =>
  normalizeWhitespace(blockHtml.match(/<a\b[^>]*href=["']([^"']+)["']/i)?.[1])

const extractTitle = (blockHtml) =>
  normalizeWhitespace(stripTags(blockHtml.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1]))

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /ganit/i.test(page)
    && /careers/i.test(page)
    && /https:\/\/www\.ganitinc\.com\/careers\/?/i.test(page)
    && /https:\/\/ganitinc\.zohorecruit\.in\/jobs\/Careers\//i.test(page)
}

const defaultFetchText = (url) =>
  fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    label: SOURCE,
    timeoutMs: 15000,
  })

export const extractIndiaJobs = (html) => {
  const jobs = []
  const seenJobIds = new Set()

  for (const blockHtml of extractBlocks(html)) {
    const title = extractTitle(blockHtml)
    const sourceUrl = extractHref(blockHtml)
    const jobId = normalizeWhitespace(sourceUrl?.match(DETAIL_URL_REGEX)?.[1])
    if (!title || !sourceUrl || !jobId || seenJobIds.has(jobId)) continue

    const location = extractField(blockHtml, 'Location')
    const city = inferCity(location)
    const country = inferCountry(location, city)
    const job = {
      title,
      company: COMPANY,
      department: extractField(blockHtml, 'Department'),
      location,
      city,
      country,
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: normalizeEmploymentType(extractField(blockHtml, 'Employment Type')),
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: extractDescription(blockHtml),
    }

    if (!job.location || !isIndiaJobInScope(job)) continue

    seenJobIds.add(jobId)
    jobs.push(job)
  }

  return jobs
}

export const createGanitScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Response is not the verified official Ganit careers page')
    }

    const jobs = extractIndiaJobs(careersHtml)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createGanitScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Ganit scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
