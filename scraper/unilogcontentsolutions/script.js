import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

import UNILOG_CONTENT_SOLUTIONS_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = UNILOG_CONTENT_SOLUTIONS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const OFFICIAL_CAREERS_URL = PROVIDER_METADATA.officialCareersPageUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const FOREIGN_LOCATION_PATTERN =
  /\b(united states|usa|philadelphia|wayne, pa|pennsylvania|europe|canada|uk|united kingdom)\b/i

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&#8211;|&ndash;/gi, '–')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(String(value))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const slugifyUrl = (value) => {
  try {
    const pathname = new URL(value).pathname.replace(/\/+$/, '')
    const segments = pathname.split('/').filter(Boolean)
    return segments.at(-1) || null
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

const toCityList = (location) =>
  String(location ?? '')
    .split(/[\/,]/)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)
    .filter((part) => !/^remote$/i.test(part))

const isIndiaLocation = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return false
  return !FOREIGN_LOCATION_PATTERN.test(normalized)
}

export const hasOfficialUnilogCareersSignals = (html = '') => {
  const page = String(html ?? '')

  return /Careers at Unilog/i.test(page)
    && /Build What(?:’|')s Next in B2B Commerce\. Together\./i.test(page)
    && /Open Roles/i.test(page)
}

export const extractVisibleRoleCards = (html = '') => {
  const cards = []
  const seenJobIds = new Set()

  for (const match of String(html ?? '').matchAll(/<article\b[^>]*class=["'][^"']*\bjob-role-card\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi)) {
    const articleHtml = match[0]
    const title = normalizeWhitespace(articleHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1])
    const sourceUrl = normalizeWhitespace(articleHtml.match(/<a[^>]*href=["']([^"']+)["']/i)?.[1])
    const employmentType = normalizeWhitespace(articleHtml.match(/<p[^>]*>\s*(Full Time|Contract)\s*<\/p>/i)?.[1])
    const locationValues = Array.from(
      articleHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi),
      (entry) => normalizeWhitespace(entry[1]),
    ).filter(Boolean)
    const location = locationValues
      .filter((value) => value !== employmentType)
      .join(' / ')
      .replace(/\s+\/\s+\/\s+/g, ' / ')
      .trim()

    if (!title || !sourceUrl || !location || !isIndiaLocation(location)) continue

    const jobId = slugifyUrl(sourceUrl)
    if (!jobId || seenJobIds.has(jobId)) continue

    seenJobIds.add(jobId)
    cards.push({
      title,
      location,
      cities: toCityList(location),
      country: 'India',
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType,
      jobId,
    })
  }

  return cards
}

export const createUnilogContentSolutionsScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)

    if (!hasOfficialUnilogCareersSignals(careersHtml)) {
      throw new Error('Unilog Content Solutions verified official careers page no longer matches the verified public surface')
    }

    const jobs = extractVisibleRoleCards(careersHtml)
    const limitedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return limitedJobs.map((job) => ({
      title: job.title,
      company: COMPANY_NAME,
      department: null,
      location: job.location,
      city: job.cities[0] || null,
      country: job.country,
      jobId: job.jobId,
      requisitionId: null,
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
      employmentType: job.employmentType,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createUnilogContentSolutionsScraper(options).run(options)

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
