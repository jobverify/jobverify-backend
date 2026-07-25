import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

import { OKTA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = OKTA_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const PUBLIC_BOARD_URL = PROVIDER_METADATA.publicBoardUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const ROW_PATTERN =
  /<div class="views-row[^"]*">[\s\S]*?<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<div class="field-content">([\s\S]*?)<\/div><\/div><\/div>/gi

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&#8211;|&ndash;|&#8212;|&mdash;/gi, '-')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#038;|&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/section|\/article|\/li|\/ul|\/ol|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<(p|div|section|article|li|ul|ol|h[1-6]|span)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const toAbsoluteUrl = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return new URL(normalized, HOMEPAGE_URL).toString()
}

export const extractJobId = (value) => String(value ?? '').match(/-(\d+)\/?$/)?.[1] ?? null

export const hasOfficialCareersPageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /Careers at Okta/i.test(page)
    && text.includes('Open positions')
    && new RegExp(PUBLIC_BOARD_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(page)
}

export const hasOfficialJobListingSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return new RegExp(
    `<link[^>]+rel=["']canonical["'][^>]+href=["']${PUBLIC_BOARD_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`,
    'i',
  ).test(page)
    && text.includes('Find your place here')
    && /data-drupal-selector=["']views-exposed-form-careers-main["']/i.test(page)
    && /<div class="views-row[^"]*">/i.test(page)
    && /\/company\/careers\//i.test(page)
}

export const extractIndiaJobsFromJobListing = (html) => {
  const jobs = []
  const seenJobIds = new Set()

  for (const segment of String(html ?? '').split(/<h3>/i).slice(1)) {
    const closingTagIndex = segment.search(/<\/h3>/i)
    if (closingTagIndex < 0) continue

    const rawDepartment = segment.slice(0, closingTagIndex)
    const body = segment.slice(closingTagIndex)
    const department = stripTags(rawDepartment)
    if (!department) continue

    ROW_PATTERN.lastIndex = 0
    for (const match of body.matchAll(ROW_PATTERN)) {
      const detailUrl = toAbsoluteUrl(match[1])
      const title = stripTags(match[2])
      const location = stripTags(match[3])
      const jobId = extractJobId(detailUrl)

      if (!detailUrl || !title || !location || !jobId) continue
      if (!/\bIndia\b/i.test(location)) continue
      if (seenJobIds.has(jobId)) continue

      seenJobIds.add(jobId)
      jobs.push({
        title,
        company: COMPANY,
        department,
        location,
        city: normalizeWhitespace(location.split(',')[0]) || null,
        country: 'India',
        jobId,
        requisitionId: jobId,
        sourceUrl: detailUrl,
        applyUrl: detailUrl,
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: `Official Okta jobs page lists ${title} in ${location} under ${department}.`,
        remoteStatus: null,
      })
    }
  }

  return jobs
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'okta-html',
  timeoutMs: 15000,
})

export const createOktaScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Okta official careers landing page no longer matches the verified public surface')
    }

    const listingHtml = await fetchText(PUBLIC_BOARD_URL)
    if (!hasOfficialJobListingSignal(listingHtml)) {
      throw new Error('Okta official job listing page no longer matches the verified first-party public surface')
    }

    const jobs = extractIndiaJobsFromJobListing(listingHtml)
    const departmentCount = new Set(jobs.map((job) => job.department).filter(Boolean)).size

    if (jobs.length < 5 || departmentCount < 2) {
      throw new Error('Okta official India jobs surface no longer exposes the expected public first-party role set')
    }

    const scrapedAt = now()
    const decoratedJobs = jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt,
    }))

    return maxJobs ? decoratedJobs.slice(0, maxJobs) : decoratedJobs
  },
})

export const run = async (options = {}) => createOktaScraper(options).run(options)

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
