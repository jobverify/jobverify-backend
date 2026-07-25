import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'technotreon'
export const COMPANY = 'Technotreon'
export const HOMEPAGE_URL = 'https://technotreon.in/'
export const CAREERS_URL = 'https://technotreon.in/careers'
export const COMPANY_DOMAIN = 'technotreon.in'
export const ATS_PLATFORM = 'official-company-careers'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&lsquo;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripTags = (value) => normalizeWhitespace(value)

const toAbsoluteUrl = (value) => {
  const normalized = normalizeWhitespace(value)
  return normalized ? new URL(normalized, CAREERS_URL).toString() : null
}

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const normalizeDepartment = (title) => normalizeWhitespace(title)
  .replace(/\s+standardised aptitude test$/i, '')
  .trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Technotreon:\s*The Innovation Company\s*<\/title>/i.test(page)
    && /href=["']\/careers["']/i.test(page)
    && normalized.includes('TECHNOTREON: THE INNOVATION COMPANY')
    && normalized.includes('We invent, patent, and commercialize breakthrough technologies')
    && normalized.includes('At Technotreon, we invent the next big thing')
    && normalized.includes('research[at]technotreon[dot]in')
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*CAREERS\s*<\/title>/i.test(page)
    && normalized.includes("Although we aren't sailing for the Antarctic (yet)")
    && normalized.includes('Open call for all humans who are not machines')
    && normalized.includes('DEPARTMENTS AT TECHNOTREON')
    && normalized.includes('The Only Room Where Inventors, Engineers & IP Lawyers Build')
    && /href=["']https:\/\/forms\.gle\//i.test(page)
}

export const extractListings = (html) => {
  const page = String(html ?? '')
  const pattern = /<h2>\s*([^<]*STANDARDISED Aptitude Test)\s*<\/h2>([\s\S]*?)<a[^>]+href=["']([^"']+)["'][^>]*>\s*Apply\s*<\/a>/gi
  const listings = []

  for (const [, rawTitle, content, rawApplyUrl] of page.matchAll(pattern)) {
    const paragraphs = Array.from(
      content.matchAll(/<p>([\s\S]*?)<\/p>/gi),
      ([, paragraph]) => stripTags(paragraph),
    ).filter(Boolean)
    const title = stripTags(rawTitle)
    const applyUrl = toAbsoluteUrl(rawApplyUrl)

    if (!title || !applyUrl || paragraphs.length === 0) {
      continue
    }

    listings.push({
      title,
      applyUrl,
      department: normalizeDepartment(title),
      description: paragraphs.join(' '),
      location: 'India',
    })
  }

  return listings
}

export const createTechnotreonScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Technotreon verified official homepage changed; refusing to scrape guessed jobs')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Technotreon verified official careers page changed; refusing to scrape guessed jobs')
    }

    const listings = extractListings(careersHtml)
    if (listings.length === 0) {
      throw new Error('Technotreon verified official careers page no longer exposes parseable public openings')
    }

    return listings.map((listing) => {
      const requisitionId = `${SOURCE}-${slugify(listing.title)}`

      return {
        title: listing.title,
        company: COMPANY,
        location: listing.location,
        city: null,
        country: 'India',
        source: SOURCE,
        sourceUrl: CAREERS_URL,
        applyUrl: listing.applyUrl,
        link: listing.applyUrl,
        companyCareerPage: CAREERS_URL,
        companyDomain: COMPANY_DOMAIN,
        atsPlatform: ATS_PLATFORM,
        jobId: requisitionId,
        requisitionId,
        department: listing.department,
        employmentType: null,
        remoteStatus: null,
        experienceRequired: null,
        jobDescription: listing.description,
        requiredSkills: [],
        preferredQualification: null,
        minimumQualification: null,
        closingDate: null,
        postingDate: null,
        scrapedAt: new Date().toISOString(),
      }
    })
  },
})

export const run = async (options = {}) => createTechnotreonScraper().run(options)

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
