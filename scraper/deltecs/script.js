import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCity } from '../utils/cityNormalizer.js'
import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

import { DELTECS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = DELTECS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const PUBLIC_BRAND_NAME = PROVIDER_METADATA.publicBrandName
export const VERIFIED_AT = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&#34;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&#8217;|&rsquo;|&#x27;/gi, "'")
  .replace(/&ndash;/gi, '–')
  .replace(/&mdash;/gi, '—')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(value)
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeText = (value) => normalizeWhitespace(value) || null

const absoluteUrl = (value, baseUrl = HOMEPAGE_URL) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? transform(match) : null
}

const stripTagsToText = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const uniqueStrings = (values) => {
  const seen = new Set()
  const output = []

  for (const value of values) {
    const normalized = normalizeText(value)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    output.push(normalized)
  }

  return output
}

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[–—]/g, '-')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const extractTextLines = (html) => {
  const normalized = decodeHtmlEntities(String(html ?? ''))
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/[•●▪◦]/g, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')

  return normalized
    .split('\n')
    .map((line) => normalizeText(line))
    .filter(Boolean)
}

const isSectionSubheading = (line) =>
  /^[A-Za-z][A-Za-z ()/-]{0,40}$/.test(line)
  && !/[.!?]/.test(line)

const extractOverviewLines = (html) =>
  extractTextLines(
    extractFirst(
      /<div class="job-summary-wrapper">[\s\S]*?<h2>\s*Role Overview\s*<\/h2>[\s\S]*?<div class="summary-description">([\s\S]*?)<\/div>/i,
      html,
    ),
  )

const extractSectionLines = (html, heading) =>
  extractTextLines(
    extractFirst(
      new RegExp(
        `<div class="job-responsibilities-wrapper">[\\s\\S]*?<h2>\\s*(?:<b>)?\\s*${heading}\\s*(?:<\\/b>)?\\s*<\\/h2>[\\s\\S]*?<div class="job-section-description">([\\s\\S]*?)<\\/div>`,
        'i',
      ),
      html,
    ),
  )

const extractMustHaveLines = (html) =>
  extractTextLines(
    extractFirst(
      /<div class="job-section-with-title-description">[\s\S]*?<h3[^>]*>\s*Must-Have Skills\s*<\/h3>[\s\S]*?<div class="job-section-description">([\s\S]*?)<\/div>/i,
      html,
    ),
  ).filter((line) => !isSectionSubheading(line))

const buildJobDescription = ({
  overviewLines,
  responsibilityLines,
  mustHaveLines,
  whyJoinUsLines,
}) => {
  const sections = [
    { heading: 'Role Overview', lines: overviewLines },
    { heading: 'Key Responsibilities', lines: responsibilityLines },
    { heading: 'Must-Have Skills', lines: mustHaveLines },
    { heading: 'Why join us?', lines: whyJoinUsLines },
  ].filter((section) => section.lines.length > 0)

  const output = []

  for (const section of sections) {
    if (output.length > 0) output.push('')
    output.push(section.heading)

    for (const line of section.lines) {
      if (section.heading === 'Role Overview') {
        output.push(line)
      } else {
        output.push(`- ${line}`)
      }
    }
  }

  return output.join('\n') || null
}

const parseLocation = (value) => {
  const location = normalizeText(value)
  if (!location) {
    return {
      location: null,
      city: null,
      country: null,
    }
  }

  const firstToken = location.split(',')[0]
  const city = normalizeCity(firstToken)

  return {
    location,
    city: city || null,
    country: /india/i.test(location) ? 'India' : null,
  }
}

export const hasOfficialHomepageSignal = (html = '') => {
  const page = String(html ?? '')

  return /<title>\s*DronaHQ \| Enterprise platform to build apps and agents faster\s*<\/title>/i.test(page)
    && /"name"\s*:\s*"DronaHQ"/i.test(page)
    && /"foundingOrganization"\s*:\s*{[\s\S]*?"name"\s*:\s*"Deltecs Infotech Pvt Ltd"/i.test(page)
    && /https:\/\/www\.linkedin\.com\/company\/deltecs-infotech/i.test(page)
    && /href=["']\/careers\/["']/i.test(page)
}

export const hasOfficialCareersPageSignal = (html = '') => {
  const page = String(html ?? '')

  return /<title>\s*Careers at DronaHQ\s*<\/title>/i.test(page)
    && /Join the team behind DronaHQ/i.test(page)
    && /Open Positions at DronaHQ/i.test(page)
    && /class=["'][^"']*job-card[^"']*["']/i.test(page)
    && /https:\/\/www\.dronahq\.com\/career\/[^"']+/i.test(page)
    && /Apply now/i.test(page)
    && /Deltecs Infotech Pvt Ltd/i.test(page)
}

export const extractListings = (html = '') => {
  const listings = [...String(html ?? '').matchAll(
    /<div class="job-card">[\s\S]*?<h3>\s*<a href="([^"]+)">\s*([\s\S]*?)\s*<\/a>\s*<\/h3>[\s\S]*?<div class="job-other-info">\s*<span>([\s\S]*?)<\/span>\s*<span>([\s\S]*?)<\/span>\s*<span>([\s\S]*?)<\/span>[\s\S]*?<a href="([^"]+)"[^>]*class="apply-btn"/gi,
  )].map((match) => {
    const sourceUrl = absoluteUrl(match[1])
    const applyUrl = absoluteUrl(match[6])

    if (!sourceUrl || sourceUrl !== applyUrl) return null

    return {
      title: stripTagsToText(match[2]),
      sourceUrl,
      location: stripTagsToText(match[3]),
      workplaceType: stripTagsToText(match[4]),
      experienceRequired: stripTagsToText(match[5]),
    }
  }).filter(Boolean)

  return uniqueStrings(listings.map((listing) => JSON.stringify(listing))).map((serialized) => JSON.parse(serialized))
}

const extractDetailTitle = (html) =>
  normalizeText(extractFirst(/<h1 class="job-title">\s*([\s\S]*?)<\/h1>/i, html))

const extractDetailPageUrl = (html) =>
  normalizeText(extractFirst(/<div class="job-url-wrapper">\s*([\s\S]*?)<\/div>/i, html))

export const hasOfficialJobDetailSignal = (html = '', listing = {}) => {
  const page = String(html ?? '')
  const pageUrl = extractDetailPageUrl(page)

  return /<title>\s*[^<]+ - DronaHQ\s*<\/title>/i.test(page)
    && extractDetailTitle(page) === listing.title
    && /class="location">\s*Location\s*<\/span>/i.test(page)
    && /Job type/i.test(page)
    && /Experience/i.test(page)
    && /class="apply-btn"/i.test(page)
    && pageUrl === listing.sourceUrl
    && /Role Overview/i.test(page)
    && /Key Responsibilities/i.test(page)
    && /Must-Have Skills/i.test(page)
}

export const extractJobDetail = (html = '', listing = {}) => {
  if (!hasOfficialJobDetailSignal(html, listing)) {
    throw new Error('Deltecs verified job detail no longer matches the trusted first-party surface')
  }

  const title = extractDetailTitle(html)
  const locationText = normalizeText(
    extractFirst(
      /<div class="job-location-wrapper">[\s\S]*?<span class="location">\s*Location\s*<\/span>\s*<span>\s*<span>\s*([\s\S]*?)\s*<\/span>/i,
      html,
    ),
  )
  const workplaceType = normalizeText(
    extractFirst(/<span class="wokr-type">\s*([\s\S]*?)\s*<\/span>/i, html),
  )
  const employmentType = normalizeText(
    extractFirst(
      /<div class="job-type-wrapper">\s*<span>\s*Job type\s*<\/span>\s*<span>\s*([\s\S]*?)\s*<\/span>\s*<\/div>/i,
      html,
    ),
  )
  const experienceRequired = normalizeText(
    extractFirst(
      /<div class="job-experience">\s*<span>\s*Experience\s*<\/span>\s*<span>\s*([\s\S]*?)\s*<\/span>\s*<\/div>/i,
      html,
    ),
  )
  const overviewLines = extractOverviewLines(html)
  const responsibilityLines = extractSectionLines(html, 'Key Responsibilities')
  const mustHaveLines = extractMustHaveLines(html)
  const whyJoinUsLines = extractSectionLines(html, 'Why join us\\?')
  const { location, city, country } = parseLocation(locationText)
  const slug = decodeURIComponent(new URL(listing.sourceUrl).pathname.split('/').filter(Boolean).at(-1) ?? '')

  return {
    title,
    company: COMPANY,
    department: null,
    location,
    city,
    country,
    jobId: `${SOURCE}-${slugify(slug)}`,
    requisitionId: `${SOURCE}-${slugify(slug)}`,
    sourceUrl: listing.sourceUrl,
    applyUrl: listing.sourceUrl,
    employmentType,
    workplaceType,
    experienceRequired,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: uniqueStrings([
      ...responsibilityLines,
      ...mustHaveLines,
    ]),
    compensation: null,
    postingDate: null,
    closingDate: null,
    jobDescription: buildJobDescription({
      overviewLines,
      responsibilityLines,
      mustHaveLines,
      whyJoinUsLines,
    }),
    companyCareerPage: CAREERS_URL,
    companyDomain: PROVIDER_METADATA.companyDomain,
    atsPlatform: PROVIDER_METADATA.atsPlatform,
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

export const createDeltecsScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Deltecs verified official homepage no longer matches the trusted first-party surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Deltecs verified careers page no longer matches the trusted first-party surface')
    }

    const listings = extractListings(careersHtml).filter((listing) => /india/i.test(listing.location || ''))
    const limitedListings = maxJobs ? listings.slice(0, maxJobs) : listings
    const jobs = []

    for (const listing of limitedListings) {
      const detailHtml = await fetchText(listing.sourceUrl)
      const job = extractJobDetail(detailHtml, listing)

      if (job.country === 'India') {
        jobs.push({
          ...job,
          source: SOURCE,
          link: job.applyUrl || job.sourceUrl,
          scrapedAt: now(),
        })
      }
    }

    return jobs.sort((left, right) => left.title.localeCompare(right.title) || left.jobId.localeCompare(right.jobId))
  },
})

export const run = async (options = {}) => createDeltecsScraper().run(options)

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
