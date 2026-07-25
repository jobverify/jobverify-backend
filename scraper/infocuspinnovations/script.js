import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../utils/loadConfig.js'
import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'infocuspinnovations'
export const COMPANY = 'InfoCusp Innovations'
export const HOMEPAGE_URL = 'https://www.infocusp.com/'
export const CAREERS_URL = 'https://www.infocusp.com/careers/openings/'
export const EXPECTED_IDENTIFIER = 'd8a117a8-6620-46fb-959e-742de38602e5'
export const EXPECTED_KEKA_DOMAIN = 'https://infocusp.keka.com/careers/'

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeDomain = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return normalized.endsWith('/') ? normalized : `${normalized}/`
}

const parseQuotedConfigValue = (block, key) => {
  const singleQuoteMatch = String(block ?? '').match(new RegExp(`${key}\\s*:\\s*'([^']+)'`, 'i'))
  if (singleQuoteMatch?.[1]) return normalizeWhitespace(singleQuoteMatch[1])

  const doubleQuoteMatch = String(block ?? '').match(new RegExp(`${key}\\s*:\\s*"([^"]+)"`, 'i'))
  return normalizeWhitespace(doubleQuoteMatch?.[1] || null)
}

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title[^>]*>\s*Infocusp - Leading Technology Solutions\s*<\/title>/i.test(rawHtml)
    && /Current Openings/i.test(rawHtml)
    && /Move AI Beyond Experimentation/i.test(normalized)
    && /Infocusp helps enterprises deploy AI into real business workflows/i.test(normalized)
}

export const hasVerifiedCareersPageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title[^>]*>\s*Openings - Infocusp\s*<\/title>/i.test(rawHtml)
    && /<link[^>]+rel="canonical"[^>]+href="https:\/\/www\.infocusp\.com\/careers\/openings\/"/i.test(rawHtml)
    && /id="current-openings"/i.test(rawHtml)
    && /id="jobs-container"/i.test(rawHtml)
    && /Current Openings/i.test(normalized)
    && /careers@infocusp\.com/i.test(rawHtml)
}

export const extractCareersBundlePath = (html) =>
  String(html ?? '').match(/\/_astro\/CurrentOpeningsList[^"' ]+\.js(?:\?[^"' ]*)?/i)?.[0] ?? null

export const extractCareerConfig = (bundleJs) => {
  const identifier = parseQuotedConfigValue(bundleJs, 'identifier')
  const domain = normalizeDomain(parseQuotedConfigValue(bundleJs, 'domain'))

  if (!identifier || !domain) return null

  return { identifier, domain, portalName: 'default' }
}

export const buildActiveJobsUrl = ({ domain, identifier, portalName = 'default' } = {}) => {
  const normalizedDomain = normalizeDomain(domain)
  if (!normalizedDomain || !identifier) return null
  return `${normalizedDomain}api/embedjobs/${portalName}/active/${identifier}`
}

const buildJobDetailUrl = ({ domain, jobId } = {}) => {
  const normalizedDomain = normalizeDomain(domain)
  if (!normalizedDomain || !jobId) return null
  return `${normalizedDomain}jobdetails/${jobId}`
}

const isIndiaLocation = (location = {}) => {
  if (String(location.countryCode || '').toUpperCase() === 'IN') return true
  if (/india/i.test(String(location.countryName || ''))) return true
  return /india/i.test([location.name, location.city, location.state].filter(Boolean).join(' '))
}

const toEmploymentType = (jobType) => (jobType === 2 || jobType === '2' ? 'Full Time' : null)

const normalizePostingDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

const mapJob = (job, { domain } = {}) => {
  const locations = Array.isArray(job?.jobLocations) ? job.jobLocations : []
  const location = locations.find(isIndiaLocation)
  const jobId = normalizeWhitespace(job?.id)
  const title = normalizeWhitespace(job?.title)

  if (!location || !jobId || !title) return null

  const city = normalizeWhitespace(location.city) || normalizeWhitespace(location.name)
  const locationLabel = [city, normalizeWhitespace(location.state), 'India']
    .filter((part, index, values) => part && values.indexOf(part) === index)
    .join(', ')
  const detailUrl = buildJobDetailUrl({ domain, jobId })

  if (!detailUrl) return null

  return {
    title,
    company: COMPANY,
    department: normalizeWhitespace(job.departmentName),
    location: locationLabel || 'India',
    city,
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl: detailUrl,
    applyUrl: detailUrl,
    employmentType: toEmploymentType(job.jobType),
    experienceRequired: normalizeWhitespace(job.experience),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: Array.isArray(job.skillNames)
      ? job.skillNames.map((skill) => normalizeWhitespace(skill)).filter(Boolean)
      : [],
    postingDate: normalizePostingDate(job.publishedOn),
    closingDate: null,
    jobDescription: normalizeWhitespace(job.description),
  }
}

export const extractSearchResults = (payload, { domain } = {}) =>
  (Array.isArray(payload) ? payload : [])
    .map((job) => mapJob(job, { domain }))
    .filter(Boolean)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'infocuspinnovations-html',
  timeoutMs: 15000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
  },
  label: 'infocuspinnovations-json',
  timeoutMs: 15000,
})

export const createInfoCuspInnovationsScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({ fetchText = defaultFetchText, fetchJson = defaultFetchJson } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('InfoCusp Innovations verified official homepage no longer matches the known public surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasVerifiedCareersPageSignal(careersHtml)) {
      throw new Error('InfoCusp Innovations verified first-party careers surface no longer matches the known public shell')
    }

    const bundlePath = extractCareersBundlePath(careersHtml)
    if (!bundlePath) {
      throw new Error('InfoCusp Innovations careers page no longer exposes the verified public jobs bundle')
    }

    const bundleUrl = new URL(bundlePath, HOMEPAGE_URL).toString()
    const careerConfig = extractCareerConfig(await fetchText(bundleUrl))
    if (!careerConfig) {
      throw new Error('InfoCusp Innovations careers bundle no longer exposes the verified Keka configuration')
    }

    if (
      careerConfig.identifier !== EXPECTED_IDENTIFIER
      || careerConfig.domain !== EXPECTED_KEKA_DOMAIN
      || careerConfig.portalName !== 'default'
    ) {
      throw new Error('InfoCusp Innovations verified Keka job surface changed materially')
    }

    const activeJobsUrl = buildActiveJobsUrl(careerConfig)
    if (!activeJobsUrl) {
      throw new Error('Unable to build InfoCusp Innovations active jobs URL')
    }

    const jobs = extractSearchResults(await fetchJson(activeJobsUrl), careerConfig)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createInfoCuspInnovationsScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
