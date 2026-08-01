import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { MINTIFI_CATALOG } from './catalog.js'
import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = MINTIFI_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const KEKA_CAREER_PAGE_URL = PROVIDER_METADATA.kekaCareerPageUrl
export const CAREER_PORTAL_INFO_URL = PROVIDER_METADATA.kekaCareerPortalInfoUrl
export const ACTIVE_JOBS_URL = PROVIDER_METADATA.kekaActiveJobsUrl
export const EXPECTED_IDENTIFIER = PROVIDER_METADATA.expectedKekaIdentifier
export const EXPECTED_KEKA_DOMAIN = PROVIDER_METADATA.expectedKekaDomain
export const EXPECTED_PORTAL_NAME = PROVIDER_METADATA.expectedPortalName

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
  const match = String(block ?? '').match(new RegExp(`${key}\\s*:\\s*['"]([^'"]+)['"]`, 'i'))
  return normalizeWhitespace(match?.[1] ?? null)
}

const extractIdentifierFromScript = (html) =>
  String(html ?? '').match(/careers\/api\/embedjobs\/js\/([0-9a-f-]+)/i)?.[1] ?? null

export const hasVerifiedCareersPageSignal = (html) =>
  /Mintifi\s*-\s*Careers/i.test(String(html ?? ''))
  && /Browse all jobs/i.test(String(html ?? ''))
  && /mintifi\.keka\.com\/careers/i.test(String(html ?? ''))
  && /careers\/api\/embedjobs\/js\/[0-9a-f-]+/i.test(String(html ?? ''))

export const extractCareerConfig = (html) => {
  const value = String(html ?? '')
  const configBlock = value.match(/(?:window\.\w+\s*=)?\s*\{([\s\S]*?)\}\s*<\/script>/i)?.[1] ?? value
  const domain = normalizeDomain(parseQuotedConfigValue(configBlock, 'domain'))
  const identifier = parseQuotedConfigValue(configBlock, 'identifier') || extractIdentifierFromScript(value)

  if (!domain || !identifier) return null

  return {
    identifier,
    domain,
    portalName: 'default',
  }
}

export const buildCareerPortalInfoUrl = ({ domain, portalName = 'default' } = {}) => {
  const normalizedDomain = normalizeDomain(domain)
  if (!normalizedDomain) return null
  return `${normalizedDomain}api/organization/${portalName}/careerportalinfo`
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

const buildApplyUrl = ({ domain, jobId } = {}) => {
  const normalizedDomain = normalizeDomain(domain)
  if (!normalizedDomain || !jobId) return null
  return `${normalizedDomain}applyjob/${jobId}`
}

export const hasExpectedPortalIdentity = (payload) => {
  const normalizedName = normalizeWhitespace(payload?.name)
  const normalizedShortName = normalizeWhitespace(payload?.shortName)
  const normalizedPortalDomain = normalizeWhitespace(payload?.careersPortalDomain)

  return normalizedName === EXPECTED_PORTAL_NAME
    && normalizedShortName === EXPECTED_PORTAL_NAME
    && normalizedPortalDomain === new URL(EXPECTED_KEKA_DOMAIN).hostname
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
  const location = locations.find(isIndiaLocation) || locations[0] || null
  const jobId = normalizeWhitespace(job?.id)
  const title = normalizeWhitespace(job?.title)

  if (!jobId || !title) return null

  const city = normalizeWhitespace(location?.city) || normalizeWhitespace(location?.name) || null
  const locationLabel = [
    city,
    normalizeWhitespace(location?.state),
    'India',
  ].filter((part, index, values) => part && values.indexOf(part) === index).join(', ') || 'India'
  const sourceUrl = buildJobDetailUrl({ domain, jobId })
  const applyUrl = buildApplyUrl({ domain, jobId })

  if (!sourceUrl || !applyUrl) return null

  return {
    title,
    company: COMPANY,
    department: normalizeWhitespace(job?.departmentName),
    location: locationLabel,
    city,
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl,
    applyUrl,
    employmentType: toEmploymentType(job?.jobType),
    experienceRequired: normalizeWhitespace(job?.experience),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: Array.isArray(job?.skillNames)
      ? job.skillNames.map((skill) => normalizeWhitespace(skill)).filter(Boolean)
      : [],
    postingDate: normalizePostingDate(job?.publishedOn),
    closingDate: null,
    jobDescription: normalizeWhitespace(job?.description),
  }
}

export const extractSearchResults = (payload, { domain } = {}) =>
  (Array.isArray(payload) ? payload : [])
    .map((job) => mapJob(job, { domain }))
    .filter(Boolean)

const defaultFetchPage = async (url) => ({
  status: 200,
  url,
  html: await fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    label: 'mintifi-html',
    timeoutMs: 15000,
  }),
})

const defaultFetchJson = async (url) => ({
  status: 200,
  url,
  json: await fetchJsonWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain,*/*',
    },
    label: 'mintifi-json',
    timeoutMs: 15000,
  }),
})

export const createMintifiScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchJson = defaultFetchJson,
  } = {}) {
    const careersPage = await fetchPage(CAREERS_URL)
    if (!hasVerifiedCareersPageSignal(careersPage?.html)) {
      throw new Error('Mintifi first-party careers page no longer exposes the verified Keka jobs embed')
    }

    const careerConfig = extractCareerConfig(careersPage?.html)
    if (!careerConfig) {
      throw new Error('Mintifi careers page no longer exposes the verified Keka configuration')
    }

    if (
      careerConfig.identifier !== EXPECTED_IDENTIFIER
      || careerConfig.domain !== EXPECTED_KEKA_DOMAIN
      || careerConfig.portalName !== 'default'
    ) {
      throw new Error('Mintifi verified Keka job surface changed materially')
    }

    const careerPortalInfo = await fetchJson(CAREER_PORTAL_INFO_URL)
    if (!hasExpectedPortalIdentity(careerPortalInfo?.json)) {
      throw new Error('Mintifi exact company identity no longer matches the verified public Keka portal')
    }

    const activeJobsUrl = buildActiveJobsUrl(careerConfig)
    const activeJobs = await fetchJson(activeJobsUrl)
    if (!Array.isArray(activeJobs?.json)) {
      throw new Error('Mintifi active jobs payload no longer matches the verified Keka feed')
    }

    const jobs = extractSearchResults(activeJobs.json, careerConfig)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async () => createMintifiScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
