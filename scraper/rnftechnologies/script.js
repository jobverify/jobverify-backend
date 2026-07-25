import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { RNF_TECHNOLOGIES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = RNF_TECHNOLOGIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const INDIA_LOCATION_PATTERN =
  /\b(?:india|noida|gurugram|gurgaon|delhi|new delhi|bangalore|bengaluru|hyderabad|chennai|mumbai|pune)\b/i

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&quot;/gi, '"')

const normalizeWhitespace = (value) => decodeHtmlEntities(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<\/(p|div|li|td|th|tr|section|article|h[1-6]|nav|table|tbody|thead)>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const toAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  try {
    const url = new URL(value, baseUrl)
    if (url.hostname !== 'www.rnftechnologies.com') return null
    return url.toString()
  } catch {
    return null
  }
}

const stripTags = (value) => normalizeWhitespace(value) || null

const extractFirst = (pattern, value) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? match[1] : null
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialListingsSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title[^>]*>\s*Join Our Team\s*\|\s*RNF Technologies\s*<\/title>/i.test(page)
    && normalized.includes('Current Job Openings')
    && normalized.includes('Job Title')
    && normalized.includes('Location')
  }

export const extractJobListings = (html = '') => {
  const page = String(html ?? '')
  const jobs = []

  for (const match of page.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const rowHtml = match[1]
    const href = extractFirst(/<a[^>]*href=["']([^"']+)["']/i, rowHtml)
    const cells = [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map((cellMatch) => stripTags(cellMatch[1]))
      .filter(Boolean)
    const jobTitle = stripTags(extractFirst(/<a[^>]*href=["'][^"']+["'][^>]*>([\s\S]*?)<\/a>/i, rowHtml))
    const location = cells[1] || null
    const sourceUrl = toAbsoluteUrl(href)

    if (!jobTitle || !location || !sourceUrl || !INDIA_LOCATION_PATTERN.test(location)) continue

    jobs.push({
      title: jobTitle,
      location,
      city: stripTags(location.split(',')[0]) || null,
      country: 'India',
      jobId: slugify(jobTitle),
      requisitionId: slugify(jobTitle),
      sourceUrl,
      detailUrl: sourceUrl,
      link: sourceUrl,
    })
  }

  return jobs
}

export const hasOfficialDetailSignal = (html = '', listing = {}) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)
  const expectedTitle = listing.title ? new RegExp(listing.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null

  return /<title[^>]*>[\s\S]*?\|\s*RNF Technologies\s*<\/title>/i.test(page)
    && normalized.includes('Current Openings')
    && normalized.includes('Relevant Experience:')
    && normalized.includes('Job Description')
    && normalized.includes('Skills')
    && /\/join-our-team\/current-openings\/(?:\d+|[a-z0-9-]+)\/apply/i.test(page)
    && (!expectedTitle || expectedTitle.test(normalized))
  }

export const extractJobDetail = (html = '', listing = {}) => {
  if (!hasOfficialDetailSignal(html, listing)) {
    throw new Error('The verified RNF Technologies detail page no longer matches the trusted first-party surface')
  }

  const title = stripTags(extractFirst(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html)) || listing.title
  const department = stripTags(extractFirst(/Department:\s*([^<\n]+)</i, `${html}<`))
  const experienceRequired = stripTags(
    extractFirst(/Relevant Experience:\s*([^<\n]+)</i, `${html}<`),
  )
  const jobDescription = stripTags(extractFirst(
    /<h2[^>]*>\s*Job Description\s*<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/i,
    html,
  ))
  const skillsSectionHtml = extractFirst(
    /<h2[^>]*>\s*Skills\s*<\/h2>\s*(?:<ul[^>]*>)?([\s\S]*?)(?:<\/ul>|<h2[^>]*>|$)/i,
    html,
  )
  const requiredSkills = [...String(skillsSectionHtml ?? '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)
  const applyHref = extractFirst(
    /<a[^>]*href=["']([^"']*\/join-our-team\/current-openings\/(?:\d+|[a-z0-9-]+)\/apply)["']/i,
    html,
  )
  const applyUrl = toAbsoluteUrl(applyHref, listing.sourceUrl || CAREERS_URL)

  return {
    title,
    company: COMPANY,
    department: department || null,
    location: listing.location || null,
    city: listing.city || null,
    country: listing.country || 'India',
    jobId: listing.jobId || slugify(title),
    requisitionId: listing.requisitionId || slugify(title),
    sourceUrl: listing.sourceUrl || null,
    applyUrl,
    employmentType: null,
    experienceRequired: experienceRequired || null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills,
    postingDate: null,
    closingDate: null,
    jobDescription,
    remoteStatus: 'On-site',
  }
}

export const createRNFTechnologiesScraper = ({
  maxJobs = null,
  now: defaultNow = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, now = defaultNow } = {}) {
    const listingsHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialListingsSignal(listingsHtml)) {
      throw new Error('The verified RNF Technologies current openings surface no longer matches the trusted first-party page')
    }

    const listings = extractJobListings(listingsHtml)
    const selectedListings = maxJobs ? listings.slice(0, maxJobs) : listings
    const jobs = []

    for (const listing of selectedListings) {
      const detailHtml = await fetchText(listing.detailUrl)
      const job = extractJobDetail(detailHtml, listing)
      jobs.push({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: now(),
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createRNFTechnologiesScraper().run(options)

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
