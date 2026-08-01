import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'

import { ENDURANCE_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = ENDURANCE_CATALOG.source
export const COMPANY = ENDURANCE_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = ENDURANCE_CATALOG.officialBrandName
export const VERIFIED_ON = ENDURANCE_CATALOG.verifiedOn
export const HOMEPAGE_URL = ENDURANCE_CATALOG.officialHomepageUrl
export const CAREERS_URL = ENDURANCE_CATALOG.officialCareersLandingUrl
export const JOB_PORTAL_URL = ENDURANCE_CATALOG.companyCareerPage
export const PROVIDER_METADATA = ENDURANCE_CATALOG

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const ALTERNATE_JOB_PORTAL_URL = 'https://www.endurancegroup.com/job-portal/'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/span)\b[^>]*>/gi, '\n')
    .replace(/<(p|div|li|h[1-6]|span)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const toAbsoluteUrl = (value, baseUrl = HOMEPAGE_URL) => {
  if (!value) return null

  try {
    const url = new URL(decodeHtmlEntities(value), baseUrl)
    return url.toString().replace(/([^:]\/)\/+/g, '$1')
  } catch {
    return null
  }
}

const extractTitle = (html) => normalizeWhitespace(
  String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
)

const extractLast = (pattern, value, transform = (match) => match[1]) => {
  const matches = [...String(value ?? '').matchAll(pattern)]
  if (matches.length === 0) return null
  return transform(matches.at(-1))
}

const normalizeJobTitle = (value) =>
  normalizeWhitespace(String(value ?? '').replace(/^Job Opening for\s+/i, ''))

const extractSlugFromUrl = (value) => {
  try {
    const url = new URL(value)
    const parts = url.pathname.replace(/\/+$/g, '').split('/').filter(Boolean)
    return normalizeWhitespace(parts.at(-1))
  } catch {
    return null
  }
}

const extractPrimaryCity = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const firstToken = normalized.split(',')[0]?.trim()
  return normalizeCity(firstToken || normalized) || firstToken || normalized
}

const extractListItems = (html) => [...String(html ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const extractJobPortalUrl = (html) => {
  const directMatch = String(html ?? '').match(
    /href=["']([^"']*(?:careers\/job-portal|job-portal)\/?)["']/i,
  )

  return toAbsoluteUrl(directMatch?.[1], CAREERS_URL)
}

export const normalizeDetailUrl = (value) => {
  const normalized = toAbsoluteUrl(value, HOMEPAGE_URL)
  if (!normalized) return null

  try {
    const url = new URL(normalized)
    const pathname = url.pathname.replace(/\/+$/g, '')
    if (!/^\/career\/[^/]+$/i.test(pathname)) return null
    return `${url.origin}${pathname}/`
  } catch {
    return null
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')

  return extractTitle(page) === 'Endurance Technologies Limited.'
    && /Join the Endurance family/i.test(page)
    && /Find your fit\. Discover your family\./i.test(page)
    && /Job Portal/i.test(page)
    && /Careers/i.test(page)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const jobPortalUrl = extractJobPortalUrl(page)

  return extractTitle(page) === 'Careers - Endurance'
    && /Applying to Endurance/i.test(page)
    && /careers@endurance\.co\.in/i.test(page)
    && /Current Openings/i.test(page)
    && Boolean(jobPortalUrl)
}

export const hasOfficialJobPortalSignal = (html) => {
  const page = String(html ?? '')

  return extractTitle(page) === 'Job Portal - Endurance'
    && /<h[1-6][^>]*>\s*Current Opening\s*<\/h[1-6]>/i.test(page)
    && /Drop your CV here/i.test(page)
    && /We will consider your Profile for future Jobs/i.test(page)
    && /Read More/i.test(page)
}

export const hasOfficialJobDetailSignal = (html) => {
  const page = String(html ?? '')

  return /Apply now/i.test(page)
    && /Apply Now/i.test(page)
    && /Upload Resume\*/i.test(page)
    && /Technical/i.test(page)
}

export const extractJobCards = (html) => {
  const cards = []

  for (const match of String(html ?? '').matchAll(
    /Job Opening for\s+([^<]+)[\s\S]*?(\d+\s+Years)[\s\S]*?(?:Pune|Chennai|Mumbai|Nashik|Bangalore|Bengaluru|Gurgaon|Delhi|Hyderabad|Noida|Remote)[\s\S]*?href=["']([^"']*\/career\/[^"']+\/?)["'][^>]*>\s*Read More/gi,
  )) {
    const title = normalizeJobTitle(match[1])
    const experienceRequired = normalizeWhitespace(match[2])
    const sourceUrl = normalizeDetailUrl(match[3])
    const jobId = extractSlugFromUrl(sourceUrl)

    const windowStart = Math.max(0, match.index - 250)
    const block = String(html).slice(windowStart, match.index + match[0].length)
    const location = extractLast(
      /(?:^|>|\s)(Pune|Chennai|Mumbai|Nashik|Bangalore|Bengaluru|Gurgaon|Delhi|Hyderabad|Noida|Remote)(?:<|\s|$)/gi,
      block,
      (item) => normalizeWhitespace(item[1]),
    )

    if (!title || !experienceRequired || !sourceUrl || !jobId || !location) {
      continue
    }

    cards.push({
      title,
      company: COMPANY,
      department: null,
      location,
      city: extractPrimaryCity(location),
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: null,
      experienceRequired,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: null,
    })
  }

  return cards
}

export const extractJobDetail = (html, listing = {}) => {
  const title = normalizeWhitespace(
    String(html ?? '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1],
  ) || listing.title || null

  const experienceRequired = extractLast(
    /(\d+\s+Years)/gi,
    html,
    (match) => normalizeWhitespace(match[1]),
  ) || listing.experienceRequired || null

  const location = extractLast(
    /(?:^|>|\s)(Pune|Chennai|Mumbai|Nashik|Bangalore|Bengaluru|Gurgaon|Delhi|Hyderabad|Noida|Remote)(?:<|\s|$)/gi,
    html,
    (match) => normalizeWhitespace(match[1]),
  ) || listing.location || null

  const requiredSkills = extractListItems(html).filter(
    (item) => !/^(Job Responsibilities|Job Qualifications|Read More)$/i.test(item),
  )

  return {
    ...listing,
    title,
    company: COMPANY,
    location,
    city: extractPrimaryCity(location) || listing.city || null,
    country: 'India',
    experienceRequired,
    applyUrl: listing.sourceUrl || listing.applyUrl || null,
    sourceUrl: listing.sourceUrl || null,
    requiredSkills,
    jobDescription: requiredSkills.length > 0 ? requiredSkills.join(' ') : null,
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

export const createEnduranceScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Endurance verified official homepage no longer matches the first-party contract')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Endurance verified first-party careers page no longer matches the official contract')
    }

    const careersJobPortalUrl = extractJobPortalUrl(careersHtml)
    if (careersJobPortalUrl && ![JOB_PORTAL_URL, ALTERNATE_JOB_PORTAL_URL].includes(careersJobPortalUrl)) {
      throw new Error('Endurance verified first-party careers page no longer exposes the official job portal handoff')
    }

    const jobPortalHtml = await fetchText(JOB_PORTAL_URL)
    if (!hasOfficialJobPortalSignal(jobPortalHtml)) {
      throw new Error('Endurance verified job portal no longer matches the first-party public jobs surface')
    }

    const listings = extractJobCards(jobPortalHtml)
    const selectedListings = maxJobs ? listings.slice(0, maxJobs) : listings
    const jobs = []

    for (const listing of selectedListings) {
      const detailHtml = await fetchText(listing.sourceUrl)
      if (!hasOfficialJobDetailSignal(detailHtml)) {
        throw new Error('Endurance verified first-party job detail no longer matches the public apply surface')
      }

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

export const run = async (options = {}) => createEnduranceScraper(options).run(options)

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
