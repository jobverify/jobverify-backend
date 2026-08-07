import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import SATSURE_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = SATSURE_CATALOG
export const SOURCE = SATSURE_CATALOG.source
export const COMPANY = SATSURE_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = SATSURE_CATALOG.officialBrandName
export const VERIFIED_ON = SATSURE_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = SATSURE_CATALOG.verifiedSurfaceSummary
export const CAREERS_PAGE_URL = SATSURE_CATALOG.officialCareersPageUrl
export const OFFICIAL_CAREERS_HANDOFF_URL = SATSURE_CATALOG.officialCareersHandoffUrl
export const VERIFIED_SAMPLE_JOB_URL = SATSURE_CATALOG.verifiedSampleJobUrl
export const KEKA_BOARD_URL = SATSURE_CATALOG.jobsBoardUrl
export const CAREER_PORTAL_INFO_URL = SATSURE_CATALOG.careerPortalInfoUrl
export const ACTIVE_JOBS_URL = SATSURE_CATALOG.activeJobsUrl
export const EXPECTED_IDENTIFIER = '350ad025-b87c-4c10-940f-8f95377d5133'
export const EXPECTED_PORTAL_SLUG = 'default'
export const EXPECTED_PORTAL_DOMAIN = 'satsure.keka.com'
export const EXPECTED_PORTAL_NAME = 'SatSure Analytics India'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;|&#8217;|&rsquo;/gi, "'")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
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
  const match = String(block ?? '').match(new RegExp(`${key}\\s*:\\s*['"]([^'"]+)['"]`, 'i'))
  return normalizeWhitespace(match?.[1] ?? null)
}

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

export const extractOfficialKekaHandoffUrl = (html = '') => {
  const match = String(html ?? '').match(/https:\/\/satsure\.keka\.com\/careers\/?/i)
  if (!match?.[0]) return null
  return match[0].replace(/\/$/, '')
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return /<title[^>]*>\s*SatSure Careers \| Build the Future of Earth Intelligence\s*<\/title>/i.test(page)
    && normalized.includes('Think Bold To Soar High')
    && normalized.includes("Let's Solve for Earth from Space")
    && normalized.includes('View Open Positions')
    && normalized.includes('SatSure Analytics India Pvt Ltd')
    && extractOfficialKekaHandoffUrl(page) === OFFICIAL_CAREERS_HANDOFF_URL
}

export const extractEmbeddedCareersDocumentPath = (html = '') =>
  String(html ?? '').match(/\/ats\/documents\/[0-9a-f-]+\/careerportal\/[^"' )]+\.html/i)?.[0] ?? null

export const extractCareerConfig = (html = '') => {
  const configBlock = String(html ?? '').match(/window\.khConfig\s*=\s*\{([\s\S]*?)\}\s*;?/i)?.[1] ?? ''
  const domain = normalizeDomain(parseQuotedConfigValue(configBlock, 'domain'))
  const portalName = parseQuotedConfigValue(configBlock, 'portalName') || EXPECTED_PORTAL_SLUG
  const identifier = normalizeWhitespace(parseQuotedConfigValue(configBlock, 'identifier'))
    || normalizeWhitespace(String(html ?? '').match(/api\/embedjobs\/js\/([0-9a-f-]+)/i)?.[1] ?? null)

  if (!identifier || !domain) return null

  return {
    identifier,
    domain,
    portalName,
  }
}

export const buildCareerPortalInfoUrl = ({ domain, portalName = EXPECTED_PORTAL_SLUG } = {}) => {
  const normalizedDomain = normalizeDomain(domain)
  if (!normalizedDomain) return null
  return `${normalizedDomain}api/organization/${portalName}/careerportalinfo`
}

export const buildActiveJobsUrl = ({ domain, identifier, portalName = EXPECTED_PORTAL_SLUG } = {}) => {
  const normalizedDomain = normalizeDomain(domain)
  if (!normalizedDomain || !identifier) return null
  return `${normalizedDomain}api/embedjobs/${portalName}/active/${identifier}`
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

export const hasExpectedPortalIdentity = (payload = {}) => {
  const normalizedName = normalizeWhitespace(payload.name)
  const normalizedShortName = normalizeWhitespace(payload.shortName)
  const normalizedPortalDomain = String(payload.careersPortalDomain ?? '').trim().toLowerCase()

  return normalizedName === EXPECTED_PORTAL_NAME
    && normalizedShortName === EXPECTED_PORTAL_NAME
    && normalizedPortalDomain === EXPECTED_PORTAL_DOMAIN
}

const isIndiaLocation = (location = {}) => {
  if (String(location.countryCode ?? '').trim().toUpperCase() === 'IN') return true
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

const extractPrimaryCity = (locations = []) => {
  for (const location of Array.isArray(locations) ? locations : []) {
    if (!isIndiaLocation(location)) continue

    const city = normalizeWhitespace(location.city) || normalizeWhitespace(location.name)
    if (!city || /^india$/i.test(city) || /^remote$/i.test(city)) continue

    return city
  }

  return null
}

const extractPrimaryState = (locations = []) => {
  for (const location of Array.isArray(locations) ? locations : []) {
    if (!isIndiaLocation(location)) continue

    const state = normalizeWhitespace(location.state)
    if (!state || /^india$/i.test(state)) continue

    return state
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
  const locations = Array.isArray(job.jobLocations) ? job.jobLocations : []
  const indiaLocations = locations.filter(isIndiaLocation)
  const hasExplicitLocations = locations.length > 0
  const jobId = normalizeWhitespace(job.id)
  const title = normalizeWhitespace(job.title)
  const sourceUrl = buildJobDetailUrl({ domain, jobId })
  const applyUrl = buildApplyUrl({ domain, jobId })

  if ((hasExplicitLocations && indiaLocations.length === 0) || !jobId || !title || !sourceUrl || !applyUrl) {
    return null
  }

  return {
    title,
    company: COMPANY,
    department: normalizeWhitespace(job.departmentName),
    location: hasExplicitLocations ? buildLocation(indiaLocations) : null,
    city: hasExplicitLocations ? extractPrimaryCity(indiaLocations) : null,
    state: hasExplicitLocations ? extractPrimaryState(indiaLocations) : null,
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

export const createSatSureScraper = ({
  maxJobs = null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    const careersHtml = await fetchText(CAREERS_PAGE_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified SatSure careers page changed materially')
    }

    const kekaShellHtml = await fetchText(OFFICIAL_CAREERS_HANDOFF_URL)
    const embeddedDocumentPath = extractEmbeddedCareersDocumentPath(kekaShellHtml)
    if (!embeddedDocumentPath || !embeddedDocumentPath.includes(EXPECTED_IDENTIFIER)) {
      throw new Error('The verified SatSure Keka surface changed materially')
    }

    const embeddedCareersUrl = new URL(embeddedDocumentPath, OFFICIAL_CAREERS_HANDOFF_URL).toString()
    const careerConfig = extractCareerConfig(await fetchText(embeddedCareersUrl))
    if (
      !careerConfig
      || careerConfig.identifier !== EXPECTED_IDENTIFIER
      || careerConfig.portalName !== EXPECTED_PORTAL_SLUG
      || normalizeDomain(careerConfig.domain) !== normalizeDomain(KEKA_BOARD_URL)
    ) {
      throw new Error('The verified SatSure Keka surface changed materially')
    }

    const careerPortalInfoUrl = buildCareerPortalInfoUrl(careerConfig)
    const activeJobsUrl = buildActiveJobsUrl(careerConfig)
    if (!careerPortalInfoUrl || !activeJobsUrl) {
      throw new Error('Unable to build SatSure Keka endpoints')
    }

    const portalInfo = await fetchJson(careerPortalInfoUrl)
    if (!hasExpectedPortalIdentity(portalInfo)) {
      throw new Error('The verified SatSure Keka surface no longer matches the exact company identity')
    }

    const jobs = extractSearchResults(await fetchJson(activeJobsUrl), careerConfig)
    const selectedJobs = Number.isInteger(maxJobs) ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
      companyCareerPage: CAREERS_PAGE_URL,
      companyDomain: PROVIDER_METADATA.companyDomain,
      atsPlatform: PROVIDER_METADATA.atsPlatform,
    }))
  },
})

export const run = async (options = {}) => createSatSureScraper().run(options)

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
