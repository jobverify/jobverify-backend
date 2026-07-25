import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'panaceamedicaltechnologiespvtltd'
export const COMPANY = 'Panacea Medical Technologies Pvt. Ltd.'
export const HOMEPAGE_URL = 'https://www.panaceamedical.in/'
export const CAREERS_URL = 'https://www.panaceamedical.in/join-us/'
export const APPLY_URL = 'mailto:careers@panaceamedical.com'
export const COMPANY_DOMAIN = 'panaceamedical.in'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const HOMEPAGE_ERROR =
  'Panacea Medical Technologies official homepage no longer matches the verified first-party surface'
const CAREERS_ERROR =
  'Panacea Medical Technologies Join Us page no longer matches the verified first-party job cards surface'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&ndash;|&#8211;|&#x2013;/gi, '-')
  .replace(/&mdash;|&#8212;|&#x2014;/gi, '-')
  .replace(/[â€“â€”âˆ’]/g, '-')
  .replace(/[Ã¢â‚¬â€œÃ¢â‚¬â€]/g, '-')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(String(value ?? ''))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
) || ''

const htmlToLines = (html) => decodeHtmlEntities(
  String(html ?? '')
    .replace(/<li[^>]*>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|h[1-6]|a|span|strong|em|ul|ol)>/gi, '\n')
    .replace(/<(p|div|section|h[1-6]|a|span|strong|em|ul|ol)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)
  .replace(/\r/g, '')
  .split('\n')
  .map((line) => line.replace(/\s+/g, ' ').trim())
  .filter(Boolean)

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/['"]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const extractField = (lines, label) => {
  const pattern = new RegExp(`^${escapeRegex(label)}\\s*:\\s*(.+)$`, 'i')
  const line = lines.find((entry) => pattern.test(entry))
  return line ? normalizeWhitespace(line.replace(pattern, '$1')) : null
}

const extractTitleParts = (value) => {
  const normalized = normalizeWhitespace(value)
  const match = normalized?.match(/^([A-Z0-9_-]+)\s*:\s*(.+)$/i)

  return {
    code: normalizeWhitespace(match?.[1] || null),
    title: normalizeWhitespace(match?.[2] || normalized),
  }
}

const parseLocation = (value) => {
  const location = normalizeWhitespace(value)
  if (!location) {
    return { location: null, city: null, state: null }
  }

  if (/all over india/i.test(location) || /\/|,/.test(location)) {
    return { location, city: null, state: null }
  }

  if (/\bMalur\b/i.test(location)) {
    return { location, city: 'Malur', state: null }
  }

  if (/\bPune\b/i.test(location)) {
    return { location, city: 'Pune', state: null }
  }

  if (/\bBangalore\b/i.test(location)) {
    return { location, city: 'Bangalore', state: null }
  }

  return { location, city: null, state: null }
}

const extractDescriptionLines = (lines) => {
  const startIndex = lines.findIndex((line) =>
    /^Job Function,\s*Key Responsibilities and Duties\s*:?$/i.test(line),
  )
  if (startIndex === -1) return []
  return lines.slice(startIndex + 1).map(normalizeWhitespace).filter(Boolean)
}

const ACCORDION_SECTION_PATTERN =
  /<div class="eael-accordion-list">\s*<div\b([^>]*)class="[^"]*\beael-accordion-header\b[^"]*"[^>]*>[\s\S]*?<span class="eael-accordion-tab-title">\s*([^<]+?)\s*<\/span>[\s\S]*?<\/div>\s*<div\b[^>]*class="[^"]*\beael-accordion-content\b[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi

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
  const text = stripTags(page)

  return /Panacea Medical Technologies Pvt\. Ltd\./i.test(text)
    && /Defeating Cancer/i.test(text)
    && /Life at PMT/i.test(text)
    && /href=["']https:\/\/www\.panaceamedical\.in\/join-us\/["']/i.test(page)
    && /All Rights Reserved/i.test(text)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*Join Us\s*(?:&#8211;|-)\s*Panacea\s*<\/title>/i.test(page)
    && /Kindly send an email mentioning your Name, Contact Number, Job Position along with your resume attached to/i.test(text)
    && /mailto:careers@panaceamedical\.com/i.test(page)
    && /eael-accordion-list/i.test(page)
    && /PMT_\d{4}-\d{2}-\d{3}\s*:/i.test(text)
}

export const extractPublicJobs = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error(CAREERS_ERROR)
  }

  const jobs = [...String(html ?? '').matchAll(ACCORDION_SECTION_PATTERN)].map((match) => {
    const anchorId = normalizeWhitespace(
      match[1]?.match(/\bid=["']([^"']+)["']/i)?.[1] || null,
    ) || slugify(match[2])
    const titleParts = extractTitleParts(match[2])
    const lines = htmlToLines(match[3])
    const contentJobCode = extractField(lines, 'Job Code')
    const jobId = titleParts.code || contentJobCode
    const locationFields = parseLocation(extractField(lines, 'Location'))
    const descriptionLines = extractDescriptionLines(lines)

    if (!titleParts.title || !jobId) {
      throw new Error(CAREERS_ERROR)
    }

    return {
      title: titleParts.title,
      company: COMPANY,
      department: null,
      location: locationFields.location,
      city: locationFields.city,
      state: locationFields.state,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: anchorId ? `${CAREERS_URL}#${anchorId}` : CAREERS_URL,
      applyUrl: APPLY_URL,
      employmentType: null,
      experienceRequired: extractField(lines, 'Experience'),
      minimumQualification: extractField(lines, 'Qualification'),
      preferredQualification: null,
      requiredSkills: descriptionLines,
      postingDate: null,
      closingDate: null,
      jobDescription: normalizeWhitespace(descriptionLines.join(' ')),
    }
  })

  if (jobs.length === 0) {
    throw new Error(CAREERS_ERROR)
  }

  return jobs
}

export const createPanaceaMedicalTechnologiesScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error(HOMEPAGE_ERROR)
    }

    const careersHtml = await fetchText(CAREERS_URL)
    const jobs = extractPublicJobs(careersHtml)

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: (overrideNow || now)(),
      companyCareerPage: CAREERS_URL,
      companyDomain: COMPANY_DOMAIN,
      atsPlatform: 'official-company-careers',
    }))
  },
})

export const run = async (options = {}) => createPanaceaMedicalTechnologiesScraper().run(options)

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
