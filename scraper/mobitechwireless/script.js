import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'mobitechwireless'
export const COMPANY = 'Mobitech Wireless Solution Private Limited'
export const HOMEPAGE_URL = 'https://mobitechwireless.in/'
export const CAREERS_URL = 'https://careers.mobitechwireless.in/'
export const COMPANY_DOMAIN = 'mobitechwireless.in'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeVisibleText = (value) => normalizeWhitespace(value)
  .replace(/[–—â€“â€”]/g, '-')

const stripTags = (value) => normalizeVisibleText(String(value ?? '').replace(/<[^>]+>/g, ' '))

const slugify = (value) => normalizeVisibleText(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const JOB_CARD_PATTERN = /<a\b[^>]*href=["']([^"']*\/jobs\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi

const BOUNDARY_MARKERS = [
  'Permanent',
  'Full Time',
  'Part Time',
  'Production Division',
  'R & D Division',
  'Sales Division',
  'Vijayamangalam',
  'Perundurai',
  'Andhra Pradesh',
  'Karnataka',
  'Tamil Nadu',
  'More Details',
]

const findFirstMarkerIndex = (value) => {
  const text = String(value ?? '')
  let markerIndex = -1

  for (const marker of BOUNDARY_MARKERS) {
    const index = text.toLowerCase().indexOf(marker.toLowerCase())
    if (index !== -1 && (markerIndex === -1 || index < markerIndex)) {
      markerIndex = index
    }
  }

  return markerIndex
}

const parseEmploymentType = (title, remainder) => {
  if (/^internship\b/i.test(title)) return 'Internship'
  if (/^permanent\b/i.test(remainder) || /\bpermanent\b/i.test(remainder)) return 'Permanent'
  if (/\bfull time\b/i.test(remainder)) return 'Full-time'
  if (/\bpart time\b/i.test(remainder)) return 'Part-time'
  return null
}

const parseLocation = (rawLocation) => {
  const text = normalizeVisibleText(rawLocation)
  if (!text) {
    return {
      location: null,
      city: null,
      state: null,
      country: 'India',
    }
  }

  const knownLocation = /Vijayamangalam|Perundurai|Andhra Pradesh|Karnataka|Tamil Nadu/i.test(text)
  if (!knownLocation) {
    return {
      location: `${text}, India`,
      city: null,
      state: null,
      country: 'India',
    }
  }

  let location = text
    .replace(/\bAndhra Pradesh\b/gi, 'Andhra Pradesh, ')
    .replace(/\bKarnataka\b/gi, 'Karnataka, ')
    .replace(/\bTamil Nadu\b/gi, 'Tamil Nadu, ')
    .replace(/\bVijayamangalam\b/gi, 'Vijayamangalam, ')
    .replace(/\bPerundurai\b/gi, 'Perundurai, ')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ', ')
    .replace(/,\s*$/g, '')
    .trim()

  if (!/india$/i.test(location)) {
    location = `${location}, India`
  }

  const city =
    /Vijayamangalam/i.test(text) && !/Andhra Pradesh|Karnataka/i.test(text)
      ? 'Vijayamangalam'
      : /Perundurai/i.test(text) && !/Andhra Pradesh|Karnataka/i.test(text)
        ? 'Perundurai'
        : null

  return {
    location,
    city,
    state: city ? 'Tamil Nadu' : null,
    country: 'India',
  }
}

const parseJobCard = (href, rawHtml) => {
  const sourceUrl = new URL(href, CAREERS_URL).toString()
  const pageText = normalizeVisibleText(stripTags(rawHtml))

  if (!/More Details/i.test(pageText)) {
    return null
  }

  const boundaryIndex = findFirstMarkerIndex(pageText)
  const title = boundaryIndex === -1 ? pageText : normalizeVisibleText(pageText.slice(0, boundaryIndex))
  if (!title) return null

  let remainder = boundaryIndex === -1 ? '' : normalizeVisibleText(pageText.slice(boundaryIndex))
  const employmentType = parseEmploymentType(title, remainder)
  remainder = remainder.replace(/^(?:(?:Permanent|Full Time|Part Time|Internship)\b\s*)+/i, '')
  remainder = remainder.replace(/\bMore Details\b.*$/i, '').trim()

  const divisionMatch = remainder.match(/\b(Production Division|R & D Division|Sales Division)\b/i)
  const department = divisionMatch ? normalizeVisibleText(divisionMatch[1]) : null
  const location = normalizeVisibleText(remainder.replace(/\b(Production Division|R & D Division|Sales Division)\b/i, ''))
  const jobId = slugify(new URL(sourceUrl).pathname.split('/').filter(Boolean).at(-1))

  return {
    title,
    company: COMPANY,
    department,
    ...parseLocation(location),
    jobId,
    requisitionId: jobId,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType,
    workplaceType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /Mobitech Wireless Solution/i.test(text)
    && /Irrigation automation/i.test(text)
    && /Smart Irrigation system/i.test(text)
    && /href=["']https:\/\/careers\.mobitechwireless\.in\/["']/i.test(page)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /Join Our Team/i.test(text)
    && /Build Technology/i.test(text)
    && /Load more/i.test(text)
    && /More Details/i.test(text)
    && /careers\.mobitechwireless\.in\/jobs\//i.test(page)
}

export const extractPublicJobs = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('Mobitech Wireless verified first-party careers page no longer matches the known public surface')
  }

  const jobs = []
  const seenUrls = new Set()

  for (const match of String(html ?? '').matchAll(JOB_CARD_PATTERN)) {
    const job = parseJobCard(match[1], match[2])
    if (!job || seenUrls.has(job.sourceUrl)) continue
    seenUrls.add(job.sourceUrl)
    jobs.push(job)
  }

  if (jobs.length === 0) {
    throw new Error('Mobitech Wireless verified careers page no longer exposes public job listings')
  }

  return jobs
}

export const createMobitechWirelessScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Mobitech Wireless verified official homepage no longer matches the known first-party surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    const jobs = extractPublicJobs(careersHtml)

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: (overrideNow || now)(),
      companyCareerPage: CAREERS_URL,
      companyDomain: COMPANY_DOMAIN,
      atsPlatform: 'official-company-careers',
    }))
  },
})

export const run = async (options = {}) => createMobitechWirelessScraper().run(options)

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
