import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { EXCELRA_KNOWLEDGE_SOLUTIONS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = EXCELRA_KNOWLEDGE_SOLUTIONS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const CAREERS_PORTAL_BASE_URL = PROVIDER_METADATA.careersPortalBaseUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const INDIA_CITY_PATTERN = /\b(hyderabad|bengaluru|bangalore|mumbai|pune|chennai|noida|gurugram|gurgaon|delhi)\b/i

const decodeHtml = (value = '') => String(value)
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")

const stripTags = (value = '') => String(value).replace(/<[^>]+>/g, ' ')

const normalizeWhitespace = (value = '') => decodeHtml(stripTags(value))
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value).toLowerCase()
  if (!normalized) return null
  if (/full\s*time/.test(normalized)) return 'Full-time'
  if (/part\s*time/.test(normalized)) return 'Part-time'
  if (/contract/.test(normalized)) return 'Contract'
  if (/consultant/.test(normalized)) return 'Contract'
  return normalizeWhitespace(value)
}

const toAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const parseLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) {
    return {
      location: null,
      city: null,
      state: null,
      country: null,
    }
  }

  const parts = normalized.split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length >= 3) {
    const [city, state, country] = parts
    return {
      location: [city, state, country].filter(Boolean).join(', '),
      city,
      state,
      country,
    }
  }

  if (parts.length === 2 && /india/i.test(parts[1])) {
    return {
      location: `${parts[0]}, ${parts[1]}`,
      city: parts[0],
      state: null,
      country: 'India',
    }
  }

  return {
    location: normalized,
    city: null,
    state: null,
    country: /india/i.test(normalized) ? 'India' : null,
  }
}

const isIndiaLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  return /india/i.test(normalized) || INDIA_CITY_PATTERN.test(normalized)
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html)
  return /Excelra job opportunities/i.test(page)
    && /A more fulfilling career/i.test(page)
    && /Current openings/i.test(page)
    && /excelra\.darwinbox\.in\/ms\/candidatev2\/main\/careers\/jobDetails\//i.test(page)
}

export const extractVisibleJobCards = (html = '') => {
  const page = String(html)
  const cardPattern = /<h4 class="display-2 m-0 p-0 custom-theme-color"[^>]*>([\s\S]*?)<\/h4>[\s\S]*?<strong>([^<]+)<\/strong>[\s\S]*?<strong>([^<]+)<\/strong>[\s\S]*?<strong>([^<]+)<\/strong>[\s\S]*?<a[^>]+href="(https:\/\/excelra\.darwinbox\.in\/ms\/candidatev2\/main\/careers\/jobDetails\/[^"]+)"[^>]*>\s*<span>\s*Apply now\s*<\/span>/gi
  const jobs = []

  for (const match of page.matchAll(cardPattern)) {
    const title = normalizeWhitespace(match[1])
    const employmentType = normalizeEmploymentType(match[2])
    const locationDetails = parseLocation(match[3])
    const experienceRequired = normalizeWhitespace(match[4])
    const applyUrl = toAbsoluteUrl(match[5])

    if (!title || !employmentType || !locationDetails.location || !experienceRequired || !applyUrl) {
      continue
    }

    jobs.push({
      title,
      employmentType,
      experienceRequired,
      ...locationDetails,
      sourceUrl: applyUrl,
      applyUrl,
    })
  }

  return jobs
}

const buildJobDescription = (job) => {
  const lines = [
    `Official Excelra careers-page opening for ${job.title}.`,
    `Employment type: ${job.employmentType}.`,
    `Location: ${job.location}.`,
    `Experience: ${job.experienceRequired}.`,
    'Applications route through the linked official Excelra Darwinbox detail page.',
  ]

  return lines.join(' ')
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createExcelraKnowledgeSolutionsScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Excelra Knowledge Solutions verified first-party careers page no longer matches the trusted contract')
    }

    const jobs = extractVisibleJobCards(careersHtml)
      .filter((job) => isIndiaLocation(job.location))
      .map((job) => ({
        ...job,
        company: COMPANY,
        country: 'India',
        remoteStatus: null,
        jobDescription: buildJobDescription(job),
        source: SOURCE,
        link: job.applyUrl,
        scrapedAt: now(),
      }))
      .sort((left, right) => left.title.localeCompare(right.title))

    return jobs
  },
})

export const run = async (options = {}) => createExcelraKnowledgeSolutionsScraper().run(options)

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
