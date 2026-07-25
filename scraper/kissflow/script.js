import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'
import { KISSFLOW_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = KISSFLOW_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ROLE_URLS = PROVIDER_METADATA.verifiedRoleUrls

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&#8217;|&rsquo;/gi, "'")
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
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const toUniqueArray = (values) => [...new Set(values.filter(Boolean))]

const extractFirst = (html, pattern) => normalizeWhitespace(String(html ?? '').match(pattern)?.[1])

const toIndiaLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const cities = toUniqueArray(
    normalized
      .replace(/\s*&\s*/g, ',')
      .split(',')
      .map((part) => normalizeWhitespace(part)),
  )

  if (cities.length === 0) return 'India'
  return [...cities, 'India'].join(', ')
}

const extractCity = (location) => normalizeWhitespace(location)?.split(',')?.[0] ?? null

export const hasVerifiedCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /<title>\s*Careers\s*-\s*Kissflow\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/careers\.kissflow\.com\/["']/i.test(page)
    && /https:\/\/kissflow\.com\//i.test(page)
    && text.includes('Get Jobs')
    && text.includes('Open Positions')
    && text.includes('Solution Advisor')
    && text.includes('Client Director')
    && text.includes('Manager - Digital Marketing')
  }

export const extractListingCards = (html = '') => {
  const cards = [...String(html ?? '').matchAll(
    /<a\s+href="(https:\/\/careers\.kissflow\.com\/[^"]+)"\s+class="career-in-row">[\s\S]*?<h6[^>]*>([\s\S]*?)<\/h6>[\s\S]*?<p[^>]*>\s*Experience:\s*([^<]+)<\/p>/gi,
  )]
    .map((match) => ({
      title: normalizeWhitespace(match[2]),
      sourceUrl: normalizeWhitespace(match[1]),
      experienceRequired: normalizeWhitespace(match[3]),
    }))
    .filter((card) => card.title && card.sourceUrl && card.experienceRequired)

  return cards.filter((card, index, collection) =>
    collection.findIndex((candidate) => candidate.sourceUrl === card.sourceUrl) === index)
}

const extractJobDescription = (html = '') => stripTags(
  extractFirst(
    html,
    /Job Description:\s*<\/span>\s*<\/h6>\s*<p>([\s\S]*?)<\/p>/i,
  ),
)

const extractRequiredSkills = (html = '') => {
  const section = String(html ?? '').match(
    /<h6[^>]*>\s*Required Skills\s*<\/h6>([\s\S]*?)(?:<h6[^>]*>\s*Applicant Details\s*<\/h6>|<\/main>)/i,
  )?.[1]

  return [...String(section ?? '').matchAll(/<li>([\s\S]*?)<\/li>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)
}

export const extractJobDetail = (html = '', listing = {}) => {
  const title = extractFirst(
    html,
    /<h1[^>]*class="[^"]*\bjob-title\b[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
  )
  const experienceRequired = extractFirst(
    html,
    /job-experience[^>]*>\s*<span[^>]*>\s*Experience:\s*<\/span>\s*([^<]+)</i,
  )
  const rawLocation = extractFirst(
    html,
    /job-location[^>]*>\s*<span[^>]*>\s*Work Location:\s*<\/span>\s*([^<]+)</i,
  )
  const location = toIndiaLocation(rawLocation)
  const jobDescription = extractJobDescription(html)
  const requiredSkills = extractRequiredSkills(html)
  const expectedTitle = normalizeWhitespace(listing.title)

  if (
    !title
    || !expectedTitle
    || title !== expectedTitle
    || !experienceRequired
    || !location
    || !jobDescription
    || !/Apply now/i.test(String(html ?? ''))
    || !/Job Description:/i.test(String(html ?? ''))
  ) {
    throw new Error(`Kissflow detail page no longer matches the verified first-party role shell: ${listing.sourceUrl || 'unknown'}`)
  }

  return {
    title,
    location,
    city: extractCity(location),
    country: 'India',
    experienceRequired,
    jobDescription,
    requiredSkills,
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

export const createKissflowScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasVerifiedCareersPageSignal(careersHtml)) {
      throw new Error('Kissflow careers page no longer matches the verified first-party jobs surface')
    }

    const listings = extractListingCards(careersHtml)
    if (listings.length === 0) {
      throw new Error('Kissflow careers page no longer matches the verified first-party jobs surface')
    }

    const selectedListings = maxJobs ? listings.slice(0, maxJobs) : listings
    const scrapedAt = now()

    const jobs = []
    for (const listing of selectedListings) {
      const detailHtml = await fetchText(listing.sourceUrl)
      const detail = extractJobDetail(detailHtml, listing)
      const jobId = slugify(detail.title)

      if (!jobId) {
        throw new Error(`Kissflow detail page no longer matches the verified first-party role shell: ${listing.sourceUrl}`)
      }

      jobs.push({
        title: detail.title,
        company: COMPANY,
        department: null,
        location: detail.location,
        city: detail.city,
        country: detail.country,
        jobId: `${SOURCE}-${jobId}`,
        requisitionId: `${SOURCE}-${jobId}`,
        sourceUrl: listing.sourceUrl,
        applyUrl: listing.sourceUrl,
        employmentType: null,
        experienceRequired: detail.experienceRequired || listing.experienceRequired,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: detail.requiredSkills,
        postingDate: null,
        closingDate: null,
        jobDescription: detail.jobDescription,
        remoteStatus: 'On-site',
        source: SOURCE,
        link: listing.sourceUrl,
        scrapedAt,
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createKissflowScraper().run(options)

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
