import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

import { SEEQ_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const WORKABLE_BOARD_URL = PROVIDER_METADATA.workableBoardUrl
export const JOBS_FEED_URL = PROVIDER_METADATA.jobsFeedUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/\r/g, '')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeUrl = (value) => String(value ?? '').replace(/\/+$/, '')

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/markdown,text/plain;q=0.8,*/*;q=0.7',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

const parseLocation = (value) => {
  const parts = String(value ?? '')
    .split(',')
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)

  return {
    location: parts.join(', ') || null,
    city: parts[0] || null,
    state: parts.length >= 3 ? parts[1] : null,
    country: parts.at(-1) || null,
  }
}

const isIndiaLocation = (value) => /(^|[\s,(])india($|[\s,).])/i.test(String(value ?? ''))

const ensureTrailingSlash = (value) => {
  const normalized = String(value ?? '').trim()
  return normalized.endsWith('/') ? normalized : `${normalized}/`
}

const extractJobId = (url) => {
  const match = String(url ?? '').match(/\/j\/([A-Z0-9]+)\/?$/i)
  return match?.[1]?.toUpperCase() || null
}

const normalizeScrapedAt = (value) => {
  if (value instanceof Date) return value.toISOString()

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid now() value supplied to Seeq scraper')
  }

  return parsed.toISOString()
}

export const hasOfficialCareersPageSignal = (html = '') => {
  const page = String(html ?? '')

  return /<title>\s*Careers: Join our Team \| Seeq\s*<\/title>/i.test(page)
    && /Help change manufacturing for the better/i.test(page)
    && page.includes(WORKABLE_BOARD_URL)
    && /See Openings/i.test(page)
    && /Some job openings/i.test(page)
}

export const hasOfficialWorkableBoardSignal = (html = '') => {
  const page = String(html ?? '')

  return /<title>\s*Seeq\s*-\s*Current Openings\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/apply\.workable\.com\/seeq\/["'][^>]*>/i.test(page)
    && /<meta[^>]+name=["']subdomain["'][^>]+content=["']seeq["'][^>]*>/i.test(page)
    && /window\.careers\s*=/i.test(page)
}

export const hasOfficialJobsFeedSignal = (markdown = '') => {
  const value = String(markdown ?? '')

  return /^#\s*Seeq\s*-\s*Current Openings/im.test(value)
    && /^\d+\s+current openings?/im.test(value)
    && /Powered by\s+\[Workable\]\(https:\/\/www\.workable\.com\)/i.test(value)
}

export const extractJobsFromMarkdown = (markdown = '') => String(markdown ?? '')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .map((line) => {
    const match = /^-\s+\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)\s*-\s*(.+)$/i.exec(line)
    if (!match) return null

    const [, rawTitle, rawUrl, rawLocation] = match
    const sourceUrl = ensureTrailingSlash(rawUrl)
    const jobId = extractJobId(sourceUrl)
    const locationBits = parseLocation(rawLocation)

    if (!rawTitle || !jobId || !isIndiaLocation(locationBits.location)) return null

    return {
      title: normalizeWhitespace(rawTitle),
      company: COMPANY,
      location: locationBits.location,
      city: locationBits.city,
      state: locationBits.state,
      country: locationBits.country,
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: `${sourceUrl}apply`,
      department: null,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    }
  })
  .filter(Boolean)

export const createSeeqScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    maxJobs: runMaxJobs,
    now: runNow,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Seeq verified first-party careers page no longer matches the trusted public surface')
    }

    const workableBoardHtml = await fetchText(WORKABLE_BOARD_URL)
    if (!hasOfficialWorkableBoardSignal(workableBoardHtml)) {
      throw new Error('Seeq verified Workable board no longer matches the trusted public surface')
    }

    const jobsFeed = await fetchText(JOBS_FEED_URL)
    if (!hasOfficialJobsFeedSignal(jobsFeed)) {
      throw new Error('Seeq verified Workable jobs feed no longer matches the trusted public surface')
    }

    const limit = Number.isInteger(runMaxJobs) ? runMaxJobs : maxJobs
    const jobs = extractJobsFromMarkdown(jobsFeed)
    const selectedJobs = limit ? jobs.slice(0, limit) : jobs
    const scrapedAt = normalizeScrapedAt((runNow || now)())

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt,
    }))
  },
})

export const run = async (options = {}) => createSeeqScraper().run(options)

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
