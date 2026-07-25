import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { ZINGHR_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = ZINGHR_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&#x27;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value).toLowerCase()
  if (!normalized) return null
  if (normalized === 'full time') return 'Full-time'
  if (normalized === 'part time') return 'Part-time'
  return normalizeWhitespace(value)
}

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (/\bindia\b/i.test(normalized)) return normalized
  return `${normalized}, India`
}

const extractCity = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized || /[\/,]/.test(normalized)) return null
  if (/\s{2,}/.test(normalized)) return null
  if (normalized.split(' ').length > 1) return null
  return normalized
}

const extractJobIdFromUrl = (url) => {
  try {
    const pathname = new URL(url).pathname
    return pathname.split('/').filter(Boolean).at(-1) || null
  } catch {
    return null
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

export const hasVerifiedJobsIndexSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Jobs\s*-\s*ZingHR HCM Solution\s*<\/title>/i.test(page)
    && normalized.includes('Jobs')
    && normalized.includes('Filter by')
    && normalized.includes('Customer Support- (HRMS/HCM)')
    && normalized.includes('Sales Manager')
    && normalized.includes('More Details')
}

export const extractJobCards = (html = '') => {
  const cards = []

  for (const match of String(html ?? '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const detailUrl = match[1]
    const text = normalizeWhitespace(match[2])

    if (!/More Details$/i.test(text)) continue

    const parsed = text.match(
      /^(.*?)\s+(Business Development|Customer Experience|HR|Product Development)\s+(Full Time|Part Time)\s+(.*?)\s+More Details$/i,
    )

    if (!parsed) {
      throw new Error('The verified ZingHR jobs page changed materially')
    }

    cards.push({
      title: normalizeWhitespace(parsed[1]),
      category: normalizeWhitespace(parsed[2]),
      employmentType: normalizeEmploymentType(parsed[3]),
      location: normalizeLocation(parsed[4]),
      detailUrl,
    })
  }

  return cards
}

export const extractJobDetail = (html = '', listing = {}) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)
  const title = normalizeWhitespace(page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]) || listing.title || null
  const postingDate = normalized.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/i)?.[0] || null
  const category = normalizeWhitespace(normalized.match(/Job Category:\s*(.+?)\s+Job Type:/i)?.[1]) || listing.category || null
  const employmentType = normalizeEmploymentType(
    normalized.match(/Job Type:\s*(.+?)\s+Job Location:/i)?.[1] || listing.employmentType,
  )
  const rawLocation = normalizeWhitespace(normalized.match(/Job Location:\s*(.+?)\s+Apply for this position/i)?.[1])
  const location = normalizeLocation(rawLocation || listing.location)
  const jobDescription = normalizeWhitespace(normalized.match(/JOB DESCRIPTION\s+(.+?)\s+Job Category:/i)?.[1])

  return {
    title,
    category,
    employmentType,
    location,
    postingDate,
    jobDescription,
    detailUrl: listing.detailUrl || null,
  }
}

const hasVerifiedJobDetailSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('JOB DESCRIPTION')
    && normalized.includes('Job Category:')
    && normalized.includes('Job Type:')
    && normalized.includes('Job Location:')
    && normalized.includes('Apply for this position')
}

export const createZingHrScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const jobsIndexHtml = await fetchText(CAREERS_URL)

    if (!hasVerifiedJobsIndexSignal(jobsIndexHtml)) {
      throw new Error('The verified ZingHR jobs page no longer matches the trusted first-party surface')
    }

    const listings = extractJobCards(jobsIndexHtml)
    if (listings.length === 0) {
      return []
    }

    const jobs = []

    for (const listing of listings) {
      const detailHtml = await fetchText(listing.detailUrl)

      if (!hasVerifiedJobDetailSignal(detailHtml)) {
        throw new Error('The verified ZingHR job detail page no longer matches the trusted first-party surface')
      }

      const detail = extractJobDetail(detailHtml, listing)
      const jobId = extractJobIdFromUrl(listing.detailUrl)

      jobs.push({
        jobId,
        requisitionId: jobId,
        title: detail.title,
        company: COMPANY,
        department: detail.category,
        location: detail.location,
        city: extractCity(detail.location?.replace(/,\s*India$/i, '')),
        country: 'India',
        link: listing.detailUrl,
        applyUrl: listing.detailUrl,
        sourceUrl: listing.detailUrl,
        employmentType: detail.employmentType,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        jobDescription: detail.jobDescription,
        postingDate: detail.postingDate,
        closingDate: null,
        remoteStatus: 'On-site',
        source: SOURCE,
        scrapedAt: now(),
        companyCareerPage: CAREERS_URL,
        companyDomain: PROVIDER_METADATA.companyDomain,
        atsPlatform: PROVIDER_METADATA.atsPlatform,
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createZingHrScraper(options).run(options)

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
