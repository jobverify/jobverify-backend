import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'qualigytech'
export const COMPANY = 'Qualigy Tech'
export const HOMEPAGE_URL = 'https://www.qualigytech.com/'
export const CAREERS_URL = 'https://www.qualigytech.com/careers/'
export const JOBS_URL = 'https://www.qualigytech.com/jobs/'

const SITE_ORIGIN = 'https://www.qualigytech.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&#8211;|&ndash;|\u2013/gi, '-')
  .replace(/&#8212;|&mdash;|\u2014/gi, '-')
  .replace(/&#8216;|&#8217;|&apos;|&rsquo;|&lsquo;|&#x27;/gi, "'")
  .replace(/&#8220;|&#8221;|&quot;|&ldquo;|&rdquo;/gi, '"')
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
    .replace(/\r/g, '')
    .replace(/<(?:br|\/p|\/div|\/li|\/ul|\/ol|\/section|\/article|\/main|\/h[1-6]|\/a|\/span)\b[^>]*>/gi, '\n')
    .replace(/<(?:p|div|li|ul|ol|section|article|main|h[1-6]|a|span)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const escapeRegex = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const toAbsoluteUrl = (value, baseUrl = JOBS_URL) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, baseUrl).toString()
  } catch {
    return null
  }
}

const isOfficialDetailUrl = (value) => {
  try {
    const url = new URL(value)
    return url.origin === SITE_ORIGIN && /^\/jobs\/[a-z0-9-]+\/$/i.test(url.pathname)
  } catch {
    return false
  }
}

const extractText = (pattern, html) => stripTags(pattern.exec(String(html ?? ''))?.[1] ?? null)

const extractSectionLists = (html) => {
  const sections = []

  for (const match of String(html ?? '').matchAll(
    /<div class="et_pb_text_inner">\s*(?:<h3>([\s\S]*?)<\/h3>)?\s*<ul>([\s\S]*?)<\/ul>/gi,
  )) {
    const heading = stripTags(match[1])
    const items = [...match[2].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
      .map((item) => stripTags(item[1]))
      .filter(Boolean)

    if (items.length === 0) continue

    sections.push({
      heading,
      items,
    })
  }

  return sections
}

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return normalized.replace(/\s*,\s*India$/i, '')
}

const deriveState = (location) => {
  const normalized = normalizeWhitespace(location)?.toLowerCase()
  if (!normalized) return null
  if (normalized.includes('bangalore') || normalized.includes('bengaluru')) return 'Karnataka'
  return null
}

const deriveCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  return normalized
}

const normalizeSkillText = (value) => normalizeWhitespace(value)

const buildJobDescription = ({ location, sections }) => {
  const lines = []

  if (location) {
    lines.push(`Location: ${location}`)
  }

  for (const section of sections) {
    const label = section.heading || 'Details'
    lines.push(`${label}: ${section.items.join(' ')}`)
  }

  return normalizeWhitespace(lines.join(' '))
}

const extractExperienceRequired = (sections = []) => {
  for (const section of sections) {
    for (const item of section.items) {
      const normalized = normalizeWhitespace(item)
      if (normalized && /years?|Atleast\d+\+?year/i.test(normalized)) {
        return normalized
      }
    }
  }

  return null
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return /<link rel="canonical" href="https:\/\/www\.qualigytech\.com\/"/i.test(page)
    && /"@type"\s*:\s*"Organization"/i.test(page)
    && /"name"\s*:\s*"QualigyTech"/i.test(page)
    && normalized.includes('Empowering Through Innovation')
    && /href="https:\/\/www\.qualigytech\.com\/careers\/"/i.test(page)
    && normalized.includes("Qualigy Tech was founded by a group of professionals")
}

export const hasOfficialCareersPageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return /<link rel="canonical" href="https:\/\/www\.qualigytech\.com\/careers\/"/i.test(page)
    && normalized.includes('Job Seekers')
    && normalized.includes('Get Your Dream Job')
    && normalized.includes('Featured Openings')
    && normalized.includes('Onsite Featured Openings')
    && /<form[^>]+action="https:\/\/www\.qualigytech\.com\/careers\/"/i.test(page)
}

export const hasOfficialJobsArchiveSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''
  const hasCanonical = /<link rel="canonical" href="https:\/\/www\.qualigytech\.com\/jobs\/"/i.test(page)
  const hasArchiveTitle = /<title>\s*Jobs\s*\|\s*QualigyTech\s*<\/title>/i.test(page)
  const hasJobsFeed = /href="https:\/\/www\.qualigytech\.com\/jobs\/feed\/"/i.test(page)

  return (hasCanonical || (hasArchiveTitle && hasJobsFeed))
    && /post-type-archive-jobpost/i.test(page)
    && normalized.includes('Job Archives')
    && /name="selected_location"/i.test(page)
    && /href="https:\/\/www\.qualigytech\.com\/jobs\/systems-support-engineer\/"/i.test(page)
    && /href="https:\/\/www\.qualigytech\.com\/jobs\/lead-devops-engineer\/"/i.test(page)
}

export const extractArchiveListings = (html) => {
  if (!hasOfficialJobsArchiveSignal(html)) {
    throw new Error('verified Qualigy Tech jobs archive no longer matches the trusted first-party public surface')
  }

  const listings = []
  const seen = new Set()

  for (const match of String(html ?? '').matchAll(
    /<a href="(https:\/\/www\.qualigytech\.com\/jobs\/[^"#]+\/)">\s*<span class="job-title">([\s\S]*?)<\/span>[\s\S]*?<div id="sjb_less_content_(\d+)"[^>]*>\s*<p>([\s\S]*?)<\/p>\s*<\/div>[\s\S]*?<a href="\1" class="btn btn-primary ">\s*Read More\s*<\/a>/gi,
  )) {
    const sourceUrl = toAbsoluteUrl(match[1], JOBS_URL)
    if (!sourceUrl || !isOfficialDetailUrl(sourceUrl) || seen.has(sourceUrl)) {
      continue
    }

    const title = stripTags(match[2])
    const excerpt = stripTags(match[4])
    const location = normalizeLocation(
      excerpt?.match(/Job location:\s*(.*?)(?:Responsibilities|$)/i)?.[1] ?? null,
    )

    if (!title || !excerpt) continue

    seen.add(sourceUrl)
    listings.push({
      title,
      sourceUrl,
      location,
      excerpt,
    })
  }

  if (listings.length === 0) {
    throw new Error('verified Qualigy Tech jobs archive changed or no trusted public role cards remain')
  }

  return listings
}

export const hasOfficialJobDetailSignal = (html, sourceUrl) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''
  const canonicalPattern = new RegExp(
    `<link rel="canonical" href="${escapeRegex(sourceUrl)}"`,
    'i',
  )

  return canonicalPattern.test(page)
    && /<title>[\s\S]*\|\s*QualigyTech<\/title>/i.test(page)
    && /<form class="jobpost-form sjb-job-\d+" id="sjb-application-form"/i.test(page)
    && /<input type="hidden" name="action" value="process_applicant_form"/i.test(page)
    && normalized.includes('Apply For This Job')
    && normalized.includes('Qualigy Tech')
}

export const extractJobDetail = (html, listing = {}) => {
  const sourceUrl = listing.sourceUrl || null
  if (!sourceUrl || !hasOfficialJobDetailSignal(html, sourceUrl)) {
    throw new Error('verified Qualigy Tech job detail no longer matches the trusted first-party application surface')
  }

  const title = extractText(/<title>([\s\S]*?)\|\s*QualigyTech<\/title>/i, html) || listing.title || null
  const location = normalizeLocation(
    extractText(/Job location:\s*([\s\S]*?)<\/(?:span|strong|p)>/i, html) || listing.location,
  )
  const jobId = normalizeWhitespace(
    String(html ?? '').match(/<input type="hidden" name="job_id" value="(\d+)"/i)?.[1] ?? null,
  )
  const sections = extractSectionLists(html).map((section) => ({
    heading: section.heading || (section.items[0]?.includes(':') ? 'Details' : null),
    items:
      section.heading
        ? section.items.map((item) => normalizeSkillText(item)).filter(Boolean)
        : section.items.map((item) => normalizeSkillText(item)).filter(Boolean),
  }))
    .map((section) => {
      if (section.heading || section.items.length === 0) return section
      return {
        heading: 'Details',
        items: section.items,
      }
    })

  return {
    title,
    company: COMPANY,
    department: null,
    location,
    city: deriveCity(location),
    state: deriveState(location),
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: null,
    experienceRequired: extractExperienceRequired(sections),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: sections.flatMap((section) => section.items),
    postingDate: null,
    closingDate: null,
    jobDescription: buildJobDescription({ location, sections }),
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

export const createQualigyTechScraper = () => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Qualigy Tech verified homepage no longer matches the trusted first-party surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Qualigy Tech verified careers page no longer matches the trusted first-party surface')
    }

    const jobsHtml = await fetchText(JOBS_URL)
    const listings = extractArchiveListings(jobsHtml)
    const jobs = []

    for (const listing of listings) {
      const detailHtml = await fetchText(listing.sourceUrl)
      const detail = extractJobDetail(detailHtml, listing)

      jobs.push({
        ...detail,
        source: SOURCE,
        link: detail.applyUrl || detail.sourceUrl,
        companyCareerPage: JOBS_URL,
        companyDomain: 'qualigytech.com',
        atsPlatform: 'official-company-careers',
        scrapedAt: now(),
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createQualigyTechScraper().run(options)

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
