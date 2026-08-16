import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'stellaraaedutechpvtltd'
export const COMPANY = 'Stellaraa Edutech Pvt. Ltd.'
export const BRAND = 'Stellaraa'
export const HOMEPAGE_URL = 'https://stellaraa.com/'
export const LINKEDIN_COMPANY_ID = '104439273'
export const LINKEDIN_COMPANY_PAGE_URL = 'https://www.linkedin.com/company/stellaraa/'
export const LINKEDIN_INDIA_JOBS_URL = 'https://www.linkedin.com/jobs/search/?f_C=104439273&geoId=102713980'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const REQUEST_TIMEOUT_MS = 15000

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/\u2019/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#8211;|&ndash;/gi, '-')
    .replace(/&#8212;|&mdash;/gi, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const decodeHtml = (value) =>
  String(value ?? '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/\u2019/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#8211;|&ndash;/gi, '-')
    .replace(/&#8212;|&mdash;/gi, '-')

const stripTags = (value) => normalizeWhitespace(
  decodeHtml(value)
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const decodeAttribute = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/\\\//g, '/')
    .replace(/\\"/g, '"'),
)

const normalizeHtml = (value) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const capitalize = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (normalized === 'full_time' || normalized === 'full time') return 'Full-time'
  if (normalized === 'part_time' || normalized === 'part time') return 'Part-time'
  if (normalized.includes('contract')) return 'Contract'
  if (normalized.includes('intern')) return 'Internship'
  return capitalize(normalized.replace(/_/g, ' '))
}

const toCountryName = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (/^(?:in|india)$/i.test(normalized)) return 'India'
  return normalized
}

const parseLocation = (value, { defaultCountry = null } = {}) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) {
    return {
      location: null,
      city: null,
      country: defaultCountry,
    }
  }

  const parts = normalized
    .split(',')
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)

  const lastPart = parts.at(-1)
  const explicitCountry = /^(?:india|in|united states|usa|us|united kingdom|uk|uae)$/i.test(lastPart || '')
    ? toCountryName(lastPart)
    : null

  let country = explicitCountry || defaultCountry || null

  const includesExplicitCountry = Boolean(explicitCountry && country === explicitCountry)
  const location = country && !includesExplicitCountry
    ? `${normalized}, ${country}`
    : normalized

  return {
    location,
    city: parts[0] || null,
    country,
  }
}

const parseSkills = (value) => String(value ?? '')
  .split(',')
  .map((skill) => normalizeWhitespace(skill))
  .filter(Boolean)
  .filter((skill, index, array) => array.indexOf(skill) === index)

const parseJobPostingJsonLd = (html) => {
  const scripts = [...String(html ?? '').matchAll(
    /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/gi,
  )]

  for (const [, rawJson] of scripts) {
    try {
      const parsed = JSON.parse(rawJson)
      const candidates = Array.isArray(parsed) ? parsed : [parsed]
      const jobPosting = candidates.find((entry) => entry?.['@type'] === 'JobPosting')
      if (jobPosting) return jobPosting
    } catch {
      // Skip malformed JSON-LD blobs until the public JobPosting payload is found.
    }
  }

  return null
}

const jobPostingBelongsToStellaraa = (jobPosting) => {
  const companyName = normalizeWhitespace(jobPosting?.hiringOrganization?.name)?.toLowerCase()
  const sameAs = normalizeWhitespace(jobPosting?.hiringOrganization?.sameAs)?.toLowerCase()

  return companyName === BRAND.toLowerCase()
    && sameAs?.includes('/company/stellaraa')
}

const detailLocationFromJobPosting = (jobPosting) => {
  const address = jobPosting?.jobLocation?.address || {}
  const country = toCountryName(address.addressCountry)
  const parts = [
    normalizeWhitespace(address.addressLocality),
    normalizeWhitespace(address.addressRegion),
    country,
  ].filter(Boolean)

  return {
    location: parts.join(', ') || null,
    city: normalizeWhitespace(address.addressLocality),
    country,
  }
}

const extractLocationFromDescription = (descriptionHtml, defaultCountry) => {
  const decoded = decodeHtml(descriptionHtml)
  const match = decoded.match(/\bLocation:\s*([^<\n]+)/i)
  if (!match) return null
  return parseLocation(match[1], { defaultCountry })
}

const fetchWithTimeout = async (url, options, consumeResponse) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  timeout.unref?.()

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })

    return consumeResponse(response)
  } finally {
    clearTimeout(timeout)
  }
}

const defaultFetchText = async (url) => {
  return fetchWithTimeout(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  }, async (response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`)
    }

    return response.text()
  })
}

export const pageIndicatesStellaraaHomepage = (html) => {
  const raw = String(html ?? '')
  const normalizedRaw = normalizeHtml(raw)
  const text = stripTags(raw) || ''

  return /<title>\s*home(?:\s*\||\s+)\s*stellaraa\s*<\/title>/i.test(raw)
    && normalizedRaw.includes('href="https://stellaraa.com/home/about_us"')
    && normalizedRaw.includes('href="https://stellaraa.com/home/contact_us"')
    && normalizedRaw.includes('href="https://www.linkedin.com/company/stellaraa/"')
    && text.includes('At STELLARAA, we envision a world where education is accessible, engaging, and transformative.')
}

export const pageIndicatesStellaraaCompany = (html) => {
  const raw = String(html ?? '')
  const normalized = normalizeWhitespace(raw)?.toLowerCase() || ''

  return normalized.includes('stellaraa | linkedin')
    && normalized.includes(`urn:li:organization:${LINKEDIN_COMPANY_ID}`)
    && normalized.includes('where education meets innovation')
    && normalized.includes('empowering education through innovation')
    && normalized.includes('bengaluru, karnataka')
    && normalized.includes('51-200 employees')
    && (
      raw.includes('https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fwww%2Estellaraa%2Ecom%2F')
      || raw.includes('https://www.stellaraa.com/')
    )
    && (
      raw.includes('https://in.linkedin.com/company/stellaraa')
      || raw.includes('https://www.linkedin.com/company/stellaraa/')
    )
}

export const searchPageShowsZeroResults = (html) => {
  const normalized = normalizeWhitespace(html)?.toLowerCase() || ''

  return (
    normalized.includes('0 jobs in india')
    || normalized.includes('0 jobs jobs in india')
  )
    && (
      normalized.includes("we couldn't find a match")
      || normalized.includes('no matching jobs found')
      || normalized.includes('no jobs found')
    )
}

export const extractSearchResults = (html) => [...String(html ?? '').matchAll(
  /<div class="base-card[\s\S]*?job-search-card"[\s\S]*?data-entity-urn="urn:li:jobPosting:([0-9]+)"[\s\S]*?<a class="base-card__full-link[^"]*" href="([^"]+)"[\s\S]*?<h3 class="base-search-card__title">\s*([\s\S]*?)\s*<\/h3>[\s\S]*?<h4 class="base-search-card__subtitle">[\s\S]*?<a[^>]*>\s*([\s\S]*?)\s*<\/a>[\s\S]*?<span class="job-search-card__location">\s*([\s\S]*?)\s*<\/span>[\s\S]*?<time class="job-search-card__listdate" datetime="([^"]+)"[^>]*>/gi,
)]
  .map((match) => {
    const [, jobId, rawHref, rawTitle, rawCompany, rawLocation, postingDate] = match
    const title = stripTags(rawTitle)
    const company = stripTags(rawCompany)
    const locationData = parseLocation(stripTags(rawLocation))
    const sourceUrl = decodeAttribute(rawHref)

    if (!title || !jobId || !sourceUrl) return null
    if (company?.toLowerCase() !== BRAND.toLowerCase()) return null
    if (locationData.country !== 'India') return null

    return {
      title,
      company: COMPANY,
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

  const defaultCountry = toCountryName(jobPosting?.jobLocation?.address?.addressCountry)
  const descriptionHtml = decodeHtml(jobPosting?.description)
  const descriptionLocation = extractLocationFromDescription(descriptionHtml, defaultCountry)
  const fallbackLocation = detailLocationFromJobPosting(jobPosting)
  const locationData = descriptionLocation?.location ? descriptionLocation : fallbackLocation

  return {
    companyBrand: normalizeWhitespace(jobPosting?.hiringOrganization?.name) || null,
    companyLinkedInUrl: normalizeWhitespace(jobPosting?.hiringOrganization?.sameAs) || null,
    location: locationData.location,
    city: locationData.city,
    country: locationData.country,
    employmentType: normalizeEmploymentType(jobPosting?.employmentType),
    postingDate: normalizeWhitespace(jobPosting?.datePosted)?.slice(0, 10) || null,
    closingDate: normalizeWhitespace(jobPosting?.validThrough)?.slice(0, 10) || null,
    minimumQualification: capitalize(jobPosting?.educationRequirements?.credentialCategory),
    requiredSkills: parseSkills(jobPosting?.skills),
    jobDescription: stripTags(descriptionHtml),
  }
}

export const createStellaraaEdutechScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText

    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!pageIndicatesStellaraaHomepage(homepageHtml)) {
      throw new Error('Stellaraa verified official homepage no longer matches the expected first-party surface')
    }

    const companyHtml = await fetchText(LINKEDIN_COMPANY_PAGE_URL)
    if (!pageIndicatesStellaraaCompany(companyHtml)) {
      throw new Error('Stellaraa LinkedIn company page no longer matches the verified official public surface')
    }

    const searchHtml = await fetchText(LINKEDIN_INDIA_JOBS_URL)
    const listings = extractSearchResults(searchHtml)

    if (listings.length === 0) {
      if (searchPageShowsZeroResults(searchHtml)) return []

      throw new Error('Stellaraa LinkedIn jobs search page no longer matches the expected public India jobs search page')
    }

    const selectedJobs = maxJobs ? listings.slice(0, maxJobs) : listings
    const enrichedJobs = []

    for (const listing of selectedJobs) {
      const detailHtml = await fetchText(listing.sourceUrl)
      const detail = extractJobDetail(detailHtml)

      if (
        detail.companyBrand
        && detail.companyBrand.toLowerCase() !== BRAND.toLowerCase()
      ) {
        throw new Error(`Stellaraa job detail for ${listing.sourceUrl} no longer resolves to the verified company`)
      }

      if (
        detail.companyLinkedInUrl
        && !detail.companyLinkedInUrl.toLowerCase().includes('/company/stellaraa')
      ) {
        throw new Error(`Stellaraa job detail for ${listing.sourceUrl} no longer points back to the verified company page`)
      }

      const { companyBrand, companyLinkedInUrl, ...publicDetail } = detail
      enrichedJobs.push({
        ...listing,
        ...Object.fromEntries(
          Object.entries(publicDetail).filter(([, value]) => {
            if (value == null) return false
            if (Array.isArray(value) && value.length === 0) return false
            return true
          }),
        ),
      })
    }

    return enrichedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createStellaraaEdutechScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running ${COMPANY} scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
