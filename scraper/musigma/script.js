import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const OFFICIAL_CAREERS_URL = 'https://www.mu-sigma.com/career/'
export const LINKEDIN_INDIA_JOBS_URL = 'https://www.linkedin.com/jobs/search/?f_C=37734&geoId=102713980'
export const COMPANY = 'Mu Sigma'
export const SOURCE = 'musigma'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

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
    .replace(/&#8211;|&ndash;/gi, '-')
    .replace(/&#8212;|&mdash;/gi, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (normalized === 'full_time' || normalized === 'full time') return 'Full-time'
  if (normalized === 'part_time' || normalized === 'part time') return 'Part-time'
  if (normalized.includes('contract')) return 'Contract'
  if (normalized.includes('intern')) return 'Internship'
  return normalizeWhitespace(value)
}

const parseLocation = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) {
    return {
      location: null,
      city: null,
      country: null,
    }
  }

  const parts = normalized.split(',').map((part) => normalizeWhitespace(part)).filter(Boolean)
  const city = parts[0] || null
  const country = parts.at(-1) === 'India' ? 'India' : parts.at(-1) || null

  return {
    location: normalized,
    city,
    country,
  }
}

const parseJobPostingJsonLd = (html) => {
  const scripts = [...String(html ?? '').matchAll(
    /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/gi,
  )]

  for (const [, rawJson] of scripts) {
    try {
      const parsed = JSON.parse(rawJson)
      if (parsed?.['@type'] === 'JobPosting') return parsed
    } catch {
      // Skip malformed JSON-LD payloads until the public JobPosting blob is found.
    }
  }

  return null
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /mu sigma/i.test(page)
    && (
      /linkedin\.com\/jobs\/search\/\?f_C=37734&geoId=102713980/i.test(page)
      || /linkedin\.com\/company\/mu-sigma(?:\/\?viewAsMember=true)?/i.test(page)
    )
    && (
      /build what matters at mu sigma/i.test(page)
      || /explore exciting career opportunities/i.test(page)
      || /life at mu sigma/i.test(page)
    )
}

export const extractSearchResults = (html) => [...String(html ?? '').matchAll(
  /<div class="base-card[\s\S]*?job-search-card"[\s\S]*?data-entity-urn="urn:li:jobPosting:([0-9]+)"[\s\S]*?<a class="base-card__full-link[^"]*" href="([^"]+)"[\s\S]*?<h3 class="base-search-card__title">\s*([\s\S]*?)\s*<\/h3>[\s\S]*?<h4 class="base-search-card__subtitle">[\s\S]*?<a[^>]*>\s*([\s\S]*?)\s*<\/a>[\s\S]*?<span class="job-search-card__location">\s*([\s\S]*?)\s*<\/span>[\s\S]*?<time class="job-search-card__listdate" datetime="([^"]+)"/gi,
)]
  .map((match) => {
    const [, jobId, rawHref, rawTitle, rawCompany, rawLocation, postingDate] = match
    const sourceUrl = normalizeWhitespace(rawHref)?.replace(/&amp;/g, '&')
    const title = stripTags(rawTitle)
    const company = stripTags(rawCompany)
    const locationData = parseLocation(stripTags(rawLocation))

    if (!title || !jobId || !sourceUrl || locationData.country !== 'India') return null

    return {
      title,
      company,
      department: null,
      location: locationData.location,
      city: locationData.city,
      country: locationData.country,
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: normalizeWhitespace(postingDate),
      closingDate: null,
      jobDescription: null,
    }
  })
  .filter(Boolean)

export const extractJobDetail = (html) => {
  const jobPosting = parseJobPostingJsonLd(html)
  if (!jobPosting) return {}

  const address = jobPosting?.jobLocation?.address || {}
  const country = address.addressCountry === 'IN'
    ? 'India'
    : normalizeWhitespace(address.addressCountry)
  const parts = [
    normalizeWhitespace(address.addressLocality),
    normalizeWhitespace(address.addressRegion),
    country,
  ].filter(Boolean)

  return {
    title: normalizeWhitespace(jobPosting?.title) || null,
    company: normalizeWhitespace(jobPosting?.hiringOrganization?.name) || null,
    location: parts.join(', ') || null,
    city: normalizeWhitespace(address.addressLocality),
    country,
    employmentType: normalizeEmploymentType(jobPosting?.employmentType),
    postingDate: normalizeWhitespace(jobPosting?.datePosted)?.slice(0, 10) || null,
    jobDescription: stripTags(jobPosting?.description) || null,
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

export const createMuSigmaScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const officialCareersHtml = await fetchText(OFFICIAL_CAREERS_URL)
    if (!hasOfficialCareersSignal(officialCareersHtml)) {
      throw new Error('Mu Sigma official careers page no longer exposes the verified LinkedIn jobs handoff')
    }

    const listings = extractSearchResults(await fetchText(LINKEDIN_INDIA_JOBS_URL))
    const selectedJobs = maxJobs ? listings.slice(0, maxJobs) : listings
    const enrichedJobs = []

    for (const listing of selectedJobs) {
      const detail = extractJobDetail(await fetchText(listing.sourceUrl))
      enrichedJobs.push({
        ...listing,
        ...Object.fromEntries(
          Object.entries(detail).filter(([, value]) => value != null),
        ),
      })
    }

    return enrichedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createMuSigmaScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
