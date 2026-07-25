import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'
import { LINKEDIN_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = LINKEDIN_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const LINKEDIN_JOBS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ROLE_URLS = PROVIDER_METADATA.verifiedRoleUrls

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/&#8212;|&mdash;/gi, '-')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtml(String(value ?? ''))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  decodeHtml(String(value ?? ''))
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const escapeRegex = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (normalized === 'full_time' || normalized === 'full time' || normalized === 'full-time') return 'Full-time'
  if (normalized === 'part_time' || normalized === 'part time' || normalized === 'part-time') return 'Part-time'
  if (normalized.includes('contract')) return 'Contract'
  if (normalized.includes('intern')) return 'Internship'
  return normalizeWhitespace(value)
}

const normalizeQualification = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return normalized[0].toUpperCase() + normalized.slice(1)
}

const parseSearchLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) {
    return {
      location: null,
      city: null,
      country: null,
    }
  }

  const parts = normalized.split(',').map((part) => normalizeWhitespace(part)).filter(Boolean)
  if (parts.length === 0) {
    return {
      location: null,
      city: null,
      country: null,
    }
  }

  if (parts.length === 1) {
    return {
      location: normalized,
      city: normalized,
      country: 'India',
    }
  }

  return {
    location: normalized,
    city: parts[0] || null,
    country: parts.at(-1) === 'India' ? 'India' : 'India',
  }
}

const detailLocationFromJsonLd = (jobPosting) => {
  const address = jobPosting?.jobLocation?.address || {}
  const locality = normalizeWhitespace(address.addressLocality)
  const region = normalizeWhitespace(address.addressRegion)
  const country = address.addressCountry === 'IN'
    ? 'India'
    : normalizeWhitespace(address.addressCountry)
  const parts = [locality, region, country].filter(Boolean)

  return {
    location: parts.join(', ') || null,
    city: locality,
    country,
  }
}

const extractLocationFromTitleTag = (html = '') => {
  const rawLocation = normalizeWhitespace(
    String(html ?? '').match(/<title>\s*LinkedIn hiring[\s\S]*? in ([^|]+?) \| LinkedIn\s*<\/title>/i)?.[1],
  )

  if (!rawLocation) {
    return {
      location: null,
      city: null,
      country: null,
    }
  }

  const parts = rawLocation.split(',').map((part) => normalizeWhitespace(part)).filter(Boolean)

  return {
    location: rawLocation,
    city: parts[0] || rawLocation,
    country: parts.at(-1) === 'India' ? 'India' : parts.at(-1) || null,
  }
}

const selectRicherLocation = (primary, fallback) => {
  const primarySegments = primary?.location?.split(',').length ?? 0
  const fallbackSegments = fallback?.location?.split(',').length ?? 0
  return fallbackSegments > primarySegments ? fallback : primary
}

const parseJobPostingJsonLd = (html = '') => {
  const scripts = [...String(html ?? '').matchAll(
    /<script[^>]+type="application\/ld\+json"[^>]*>\s*([\s\S]*?)\s*<\/script>/gi,
  )]

  for (const [, rawJson] of scripts) {
    try {
      const parsed = JSON.parse(rawJson)
      if (parsed?.['@type'] === 'JobPosting') return parsed
    } catch {
      // Skip malformed or unrelated JSON-LD blocks until the public JobPosting payload is found.
    }
  }

  return null
}

const formatExperienceRequirement = (value) => {
  const months = Number.parseInt(value, 10)
  if (!Number.isFinite(months) || months <= 0) return null
  if (months < 12) return `${months}+ months`

  const years = months / 12
  const formatted = Number.isInteger(years)
    ? String(years)
    : years.toFixed(1).replace(/\.0$/, '')

  return `${formatted}+ years`
}

const extractSuggestedSkills = (rawDescription = '') => {
  const decoded = decodeHtml(String(rawDescription ?? ''))
  const section = decoded.match(/Suggested Skills[\s\S]*?(<ul[\s\S]*?<\/ul>)/i)?.[1]

  return [...String(section ?? '').matchAll(/<li>([\s\S]*?)<\/li>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)
}

const extractRemoteStatus = (jobDescription) => {
  const normalized = normalizeWhitespace(jobDescription)?.toLowerCase() || ''
  if (!normalized) return null
  if (normalized.includes('hybrid')) return 'Hybrid'
  if (/\bremote\b/.test(normalized)) return 'Remote'
  if (/\bon-site\b|\bon site\b/.test(normalized)) return 'On-site'
  return null
}

const extractCriteriaValue = (html = '', label) => {
  const pattern = new RegExp(
    `<h3[^>]*>\\s*${escapeRegex(label)}\\s*<\\/h3>[\\s\\S]*?<span[^>]*description__job-criteria-text[^"]*"[^>]*>\\s*([\\s\\S]*?)\\s*<\\/span>`,
    'i',
  )

  return stripTags(String(html ?? '').match(pattern)?.[1])
}

export const hasVerifiedJobsPageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /<meta[^>]+name=["']linkedin:pageTag["'][^>]+content=["'][^"]*jserp/i.test(page)
    && /<meta[^>]+property=["']og:url["'][^>]+content=["']https:\/\/www\.linkedin\.com\/jobs\/search["']/i.test(page)
    && /jobs in India/i.test(text)
    && /LinkedIn/i.test(text)
}

export const extractSearchResults = (html = '') => [...String(html ?? '').matchAll(
  /<div class="base-card[\s\S]*?job-search-card"[\s\S]*?data-entity-urn="urn:li:jobPosting:([0-9]+)"[\s\S]*?<a class="base-card__full-link[^"]*" href="([^"]+)"[\s\S]*?<h3 class="base-search-card__title">\s*([\s\S]*?)\s*<\/h3>[\s\S]*?<h4 class="base-search-card__subtitle">[\s\S]*?<a[^>]*>\s*([\s\S]*?)\s*<\/a>[\s\S]*?<span class="job-search-card__location">\s*([\s\S]*?)\s*<\/span>[\s\S]*?<time class="job-search-card__listdate" datetime="([^"]+)"/gi,
)]
  .map((match) => {
    const [, jobId, rawHref, rawTitle, rawCompany, rawLocation, postingDate] = match
    const title = stripTags(rawTitle)
    const company = stripTags(rawCompany)
    const sourceUrl = normalizeWhitespace(rawHref)?.replace(/&amp;/g, '&')
    const locationData = parseSearchLocation(stripTags(rawLocation))

    if (!jobId || !title || !company || !sourceUrl) return null
    if (company !== COMPANY) return null

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
      remoteStatus: null,
    }
  })
  .filter(Boolean)
  .filter((listing, index, collection) =>
    collection.findIndex((candidate) => candidate.jobId === listing.jobId) === index)

export const extractJobDetail = (html = '', listing = {}) => {
  const jobPosting = parseJobPostingJsonLd(html)
  if (!jobPosting) {
    throw new Error(`LinkedIn detail page no longer matches the verified public JobPosting shell: ${listing.sourceUrl || 'unknown'}`)
  }

  const title = normalizeWhitespace(jobPosting.title)
  const expectedTitle = normalizeWhitespace(listing.title)
  const company = normalizeWhitespace(jobPosting?.hiringOrganization?.name)
  const decodedDescription = decodeHtml(jobPosting.description)
  const jobDescription = stripTags(decodedDescription)
  const locationData = selectRicherLocation(
    detailLocationFromJsonLd(jobPosting),
    extractLocationFromTitleTag(html),
  )
  const employmentType = normalizeEmploymentType(jobPosting.employmentType)
    || extractCriteriaValue(html, 'Employment type')
  const experienceRequired = formatExperienceRequirement(
    jobPosting?.experienceRequirements?.monthsOfExperience,
  )
  const minimumQualification = normalizeQualification(
    jobPosting?.educationRequirements?.credentialCategory,
  )
  const requiredSkills = extractSuggestedSkills(jobPosting.description)
  const remoteStatus = extractRemoteStatus(jobDescription)
  const postingDate = normalizeWhitespace(jobPosting.datePosted)?.slice(0, 10) || null

  if (
    !title
    || !expectedTitle
    || title !== expectedTitle
    || company !== COMPANY
    || !jobDescription
    || !locationData.location
  ) {
    throw new Error(`LinkedIn detail page no longer matches the verified public JobPosting shell: ${listing.sourceUrl || 'unknown'}`)
  }

  return {
    title,
    company,
    location: locationData.location,
    city: locationData.city,
    country: locationData.country,
    employmentType,
    experienceRequired,
    minimumQualification,
    postingDate,
    jobDescription,
    requiredSkills,
    remoteStatus,
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

export const createLinkedInScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const searchHtml = await fetchText(LINKEDIN_JOBS_URL)
    if (!hasVerifiedJobsPageSignal(searchHtml)) {
      throw new Error('LinkedIn jobs search page no longer matches the verified public company-filtered shell')
    }

    const listings = extractSearchResults(searchHtml)
    if (listings.length === 0) {
      return []
    }

    const selectedListings = maxJobs ? listings.slice(0, maxJobs) : listings
    const scrapedAt = now()
    const jobs = []

    for (const listing of selectedListings) {
      const detailHtml = await fetchText(listing.sourceUrl)
      const detail = extractJobDetail(detailHtml, listing)

      jobs.push({
        ...listing,
        ...Object.fromEntries(
          Object.entries(detail).filter(([, value]) => value != null),
        ),
        source: SOURCE,
        link: listing.applyUrl || listing.sourceUrl,
        scrapedAt,
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createLinkedInScraper().run(options)

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
