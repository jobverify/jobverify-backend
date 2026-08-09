import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import DIGITAL_WEB_SOLUTIONS_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = DIGITAL_WEB_SOLUTIONS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const JOBS_BOARD_URL = PROVIDER_METADATA.officialJobsBoardUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;|&#8217;/gi, "'")
  .replace(/&ndash;|&#8211;|â€“/gi, '-')
  .replace(/&mdash;|&#8212;/gi, '-')
  .replace(/â‚¹/gi, 'INR ')

const normalizeWhitespace = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

const toAbsoluteUrl = (value) => {
  try {
    return new URL(value, JOBS_BOARD_URL).toString()
  } catch {
    return null
  }
}

const inferCountry = (location, detailCountry) => {
  if (detailCountry === 'IN') return 'India'
  const normalized = normalizeWhitespace(location)
  if (!normalized) return detailCountry === 'IN' ? 'India' : null
  if (/\bindia\b/i.test(normalized)) return 'India'
  if (/gurgaon|noida|hybrid|remote/i.test(normalized)) return 'India'
  return null
}

const inferRemoteStatus = (location, detail = {}) => {
  const normalized = normalizeWhitespace(location)
  if (/^remote$/i.test(normalized)) return 'Remote'
  if (/^hybrid$/i.test(normalized)) return 'Hybrid'
  if (detail.jobLocationType === 'TELECOMMUTE' && !/^hybrid$/i.test(normalized)) return 'Remote'
  return 'On-site'
}

const extractJsonLd = (html = '') => {
  for (const match of String(html ?? '').matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const candidate = match[1]?.trim()
    if (!candidate) continue

    try {
      const parsed = JSON.parse(candidate)
      const jobPosting = Array.isArray(parsed)
        ? parsed.find((item) => item?.['@type'] === 'JobPosting')
        : parsed?.['@type'] === 'JobPosting'
          ? parsed
          : null

      if (jobPosting) return jobPosting
    } catch {
      continue
    }
  }

  return null
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title[^>]*>\s*Careers\s*-\s*Digital Web Solutions\s*<\/title>/i.test(page)
    && text.includes('View All Jobs')
    && page.includes(JOBS_BOARD_URL)
}

export const hasOfficialJobsBoardSignal = (html = '') =>
  /<title[^>]*>\s*Jobs at Digital Web Solutions\s*<\/title>/i.test(String(html ?? ''))

export const extractBoardJobs = (html = '') => {
  const jobs = []
  const page = String(html ?? '')
  const cardPattern =
    /<a[^>]*href=["'](\/co\/digital-web-solutions\/[^"']+\/\d+)["'][^>]*>([\s\S]*?)<\/a>/gi

  for (const match of page.matchAll(cardPattern)) {
    const sourceUrl = toAbsoluteUrl(match[1])
    const block = match[2]
    const title = normalizeWhitespace(block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1])
    const spanTexts = [...block.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)]
      .map((item) => stripTags(item[1]))
      .filter(Boolean)

    if (!title || !sourceUrl) continue

    const location = spanTexts.find((item) => /remote|hybrid|india|gurgaon|noida/i.test(item)) || null
    const experienceRequired = spanTexts.find((item) => /\byears?\b/i.test(item)) || null
    const employmentType = spanTexts.find((item) => /full time|part time|internship|contract/i.test(item)) || null

    jobs.push({
      title,
      listingLocation: location,
      listingExperienceRequired: experienceRequired,
      listingEmploymentType: employmentType,
      sourceUrl,
      applyUrl: sourceUrl,
    })
  }

  return jobs
}

export const extractDetailJobData = (html = '', listing = {}) => {
  const jobPosting = extractJsonLd(html)
  const responsibilities = normalizeWhitespace(jobPosting?.responsibilities)
  const description = normalizeWhitespace(jobPosting?.description)
  const location = listing.listingLocation
    || normalizeWhitespace(jobPosting?.jobLocation?.address?.addressLocality)
    || normalizeWhitespace(jobPosting?.jobLocationType)
    || null
  const country = inferCountry(location, normalizeWhitespace(jobPosting?.jobLocation?.address?.addressCountry))
  const remoteStatus = inferRemoteStatus(location, jobPosting || {})

  return {
    title: normalizeWhitespace(jobPosting?.title) || listing.title || null,
    company: COMPANY,
    department: null,
    location,
    city: /^remote$|^hybrid$/i.test(location || '') ? null : location,
    country,
    jobId: listing.sourceUrl?.split('/').pop() || listing.title || null,
    requisitionId: listing.sourceUrl?.split('/').pop() || listing.title || null,
    sourceUrl: listing.sourceUrl,
    applyUrl: listing.applyUrl,
    employmentType: normalizeWhitespace(jobPosting?.employmentType) || listing.listingEmploymentType || null,
    experienceRequired: listing.listingExperienceRequired || null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: Array.isArray(jobPosting?.skills)
      ? jobPosting.skills.map((skill) => normalizeWhitespace(skill)).filter(Boolean)
      : [],
    postingDate: null,
    closingDate: null,
    jobDescription: [description, responsibilities].filter(Boolean).join(' ') || null,
    remoteStatus,
  }
}

export const createDigitalWebSolutionsScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Digital Web Solutions verified first-party careers page no longer matches the trusted handoff')
    }

    const boardHtml = await fetchText(JOBS_BOARD_URL)
    if (!hasOfficialJobsBoardSignal(boardHtml)) {
      throw new Error('Digital Web Solutions official Hirenext jobs board no longer matches the trusted surface')
    }

    const listings = extractBoardJobs(boardHtml)
    const jobs = []

    for (const listing of listings) {
      const detailHtml = await fetchText(listing.sourceUrl)
      const detail = extractDetailJobData(detailHtml, listing)

      if (!detail.title || !detail.sourceUrl) continue

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

export const run = async (options = {}) => createDigitalWebSolutionsScraper().run(options)

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
