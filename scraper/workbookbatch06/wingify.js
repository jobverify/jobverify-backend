import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'wingify'
export const COMPANY = 'Wingify'
export const VERIFIED_ON = '2026-07-25'
export const CAREERS_URL = 'https://wingify.com/careers/'
export const KEKA_BOARD_URL = 'https://wingify.keka.com/careers/'
export const CAREER_PORTAL_INFO_URL = `${KEKA_BOARD_URL}api/organization/default/careerportalinfo`
export const ACTIVE_JOBS_URL = `${KEKA_BOARD_URL}api/jobs/default/active`
export const DISPOSITION = 'verified-first-party-careers-page-plus-public-keka-jobs-api'
export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 25, 2026 that https://wingify.com/careers/ was the live exact-name Wingify careers surface, that it handed applicants to the public Keka board at https://wingify.keka.com/careers/, and that https://wingify.keka.com/careers/api/jobs/default/active exposed a trustworthy public jobs inventory including India roles. This scraper validates those verified surfaces and returns India jobs only from the public Keka API.'

export const EXPECTED_KEKA_DOMAIN = 'wingify.keka.com'
export const EXPECTED_PORTAL_NAME = 'Wingify Software Pvt. Ltd.'

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;|&#8217;/gi, "'")
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

const toAbsoluteUrl = (value, baseUrl) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

export const hasOfficialCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title[^>]*>\s*Careers\s*\|\s*Wingify\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/wingify\.com\/careers\/["']/i.test(page)
    && /\bBig Problems\.\s*Smart People\.\s*Wingify\./i.test(normalized ?? '')
    && /\bOpen Positions\b/i.test(normalized ?? '')
    && /careers@wingify\.com/i.test(normalized ?? '')
}

export const extractKekaBoardUrl = (html = '') => {
  for (const match of String(html ?? '').matchAll(/href=["']([^"']+)["']/gi)) {
    const absoluteUrl = toAbsoluteUrl(match[1], CAREERS_URL)
    if (absoluteUrl === KEKA_BOARD_URL) {
      return absoluteUrl
    }
  }

  return null
}

export const hasKekaBoardSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)

  return /\bWingify Software Pvt\.\s*Ltd\./i.test(normalized ?? '')
    && /\bBe a part of building something great\b/i.test(normalized ?? '')
    && /\bBrowse all jobs\b/i.test(normalized ?? '')
    && /\bKeka Hire\b/i.test(normalized ?? '')
}

export const hasExpectedPortalIdentity = (payload = {}) => {
  const name = normalizeWhitespace(payload?.name)
  const shortName = normalizeWhitespace(payload?.shortName)
  const domain = normalizeWhitespace(payload?.careersPortalDomain)
  const companyWebsite = normalizeWhitespace(payload?.companyWebsite)

  return name === EXPECTED_PORTAL_NAME
    && shortName === EXPECTED_PORTAL_NAME
    && domain === EXPECTED_KEKA_DOMAIN
    && companyWebsite === 'https://wingify.com/'
}

const buildJobDetailUrl = ({ domain, jobId } = {}) => {
  const normalizedDomain = normalizeDomain(domain)
  if (!normalizedDomain || !jobId) return null
  return `${normalizedDomain}jobdetails/${jobId}`
}

const buildApplyUrl = ({ domain, jobId } = {}) => {
  const normalizedDomain = normalizeDomain(domain)
  if (!normalizedDomain || !jobId) return null
  return `${normalizedDomain}applyjob/${jobId}`
}

const isIndiaLocation = (location = {}) => {
  const countryCode = String(location.countryCode ?? '').trim().toUpperCase()
  if (countryCode === 'IN' || countryCode === 'IND') return true
  if (/^india$/i.test(String(location.countryName ?? '').trim())) return true

  return /\bindia\b/i.test(
    [location.name, location.city, location.state]
      .filter(Boolean)
      .join(' '),
  )
}

const addUniquePart = (parts, seen, value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return

  const key = normalized.toLowerCase()
  if (seen.has(key)) return

  seen.add(key)
  parts.push(normalized)
}

const buildLocationLabel = (location = {}) => {
  const parts = []
  const seen = new Set()
  const city = normalizeWhitespace(location.city)
  const name = normalizeWhitespace(location.name)
  const state = normalizeWhitespace(location.state)

  addUniquePart(parts, seen, city || name)

  if (state && !/^india$/i.test(state)) {
    addUniquePart(parts, seen, state)
  }

  addUniquePart(parts, seen, 'India')

  return parts.join(', ') || null
}

const buildLocation = (locations = []) => {
  const labels = []
  const seen = new Set()

  for (const location of Array.isArray(locations) ? locations : []) {
    if (!isIndiaLocation(location)) continue

    const label = buildLocationLabel(location)
    if (!label) continue

    const key = label.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    labels.push(label)
  }

  return labels.join('; ') || null
}

const extractCity = (locations = []) => {
  for (const location of Array.isArray(locations) ? locations : []) {
    if (!isIndiaLocation(location)) continue

    const city = normalizeWhitespace(location.city) || normalizeWhitespace(location.name)
    if (!city || /^india$/i.test(city) || /^remote$/i.test(city)) continue

    return city
  }

  return null
}

const normalizePostingDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

const toEmploymentType = (jobType) => (jobType === 2 || jobType === '2' ? 'Full Time' : null)

const mapJob = (job = {}, { domain } = {}) => {
  const locations = Array.isArray(job?.jobLocations) ? job.jobLocations : []
  const indiaLocations = locations.filter(isIndiaLocation)
  const jobId = normalizeWhitespace(job?.id)
  const title = normalizeWhitespace(job?.title)
  const sourceUrl = buildJobDetailUrl({ domain, jobId })
  const applyUrl = buildApplyUrl({ domain, jobId })

  if (indiaLocations.length === 0 || !jobId || !title || !sourceUrl || !applyUrl) {
    return null
  }

  return {
    title,
    company: COMPANY,
    department: normalizeWhitespace(job.departmentName),
    location: buildLocation(indiaLocations),
    city: extractCity(indiaLocations),
    country: 'India',
    jobId,
    requisitionId: normalizeWhitespace(job.jobNumber) || jobId,
    sourceUrl,
    applyUrl,
    employmentType: toEmploymentType(job.jobType),
    experienceRequired: normalizeWhitespace(job.experience),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: Array.isArray(job.skillNames)
      ? job.skillNames.map((skill) => normalizeWhitespace(skill)).filter(Boolean)
      : [],
    postingDate: normalizePostingDate(job.publishedOn),
    closingDate: null,
    jobDescription: normalizeWhitespace(job.description || job.excerpt),
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
  label: `${SOURCE}-html`,
  timeoutMs: 15000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
    Referer: KEKA_BOARD_URL,
  },
  label: `${SOURCE}-json`,
  timeoutMs: 15000,
})

export const createWingifyScraper = () => ({
  async run({ fetchText = defaultFetchText, fetchJson = defaultFetchJson, now = () => new Date().toISOString() } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (
      !hasOfficialCareersPageSignal(careersHtml)
      || extractKekaBoardUrl(careersHtml) !== KEKA_BOARD_URL
    ) {
      throw new Error('Wingify verified official careers handoff changed materially')
    }

    const kekaBoardHtml = await fetchText(KEKA_BOARD_URL)
    if (!hasKekaBoardSignal(kekaBoardHtml)) {
      throw new Error('Wingify verified Keka board shell changed materially')
    }

    const portalInfo = await fetchJson(CAREER_PORTAL_INFO_URL)
    if (!hasExpectedPortalIdentity(portalInfo)) {
      throw new Error('Wingify Keka portal no longer resolves to the exact company identity')
    }

    const jobs = extractSearchResults(await fetchJson(ACTIVE_JOBS_URL), {
      domain: KEKA_BOARD_URL,
    })

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createWingifyScraper().run(options)

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
