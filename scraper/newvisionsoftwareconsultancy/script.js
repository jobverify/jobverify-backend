import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { NEW_VISION_SOFTWARE_CONSULTANCY_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = NEW_VISION_SOFTWARE_CONSULTANCY_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const CAREERS_PAGE_URL = PROVIDER_METADATA.companyCareerPage
export const PORTAL_ORIGIN = PROVIDER_METADATA.portalOrigin
export const JOB_LISTINGS_URL = PROVIDER_METADATA.jobListingsUrl
export const DEFAULT_PAGE_SIZE = 20
export const DEFAULT_SEARCH_BODY = {}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const firstNonEmpty = (...values) => {
  for (const value of values) {
    const normalized = normalizeWhitespace(value)
    if (normalized) return normalized
  }

  return null
}

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const dedupeParts = (parts = []) => parts.filter(
  (part, index) => index === 0 || part.toLowerCase() !== parts[index - 1].toLowerCase(),
)

const isRemoteStatusPart = (value) => /^(remote|hybrid|on-?site|work from home)$/i.test(
  normalizeWhitespace(value) || '',
)

const isOfficeDescriptor = (value) => /\boffice\b/i.test(String(value ?? ''))

const extractStructuredLocation = (value) => {
  const parts = dedupeParts(
    String(value ?? '')
      .split('>')
      .map((part) => normalizeWhitespace(part))
      .filter(Boolean),
  )

  if (parts.length === 0) {
    return {
      location: null,
      city: null,
      state: null,
      country: null,
      remoteStatus: null,
    }
  }

  const remoteStatus = firstNonEmpty(parts.find((part) => isRemoteStatusPart(part)))
  const indiaIndex = parts.findIndex((part) => /^india$/i.test(part))
  const relevantParts = dedupeParts(
    (indiaIndex >= 0 ? parts.slice(indiaIndex + 1) : parts)
      .filter((part) => !isRemoteStatusPart(part))
      .filter((part) => !isOfficeDescriptor(part)),
  )

  const country = indiaIndex >= 0 ? 'India' : null
  const city = relevantParts[0] || null
  let state = relevantParts.length > 1 ? relevantParts[relevantParts.length - 1] : null

  if (state && city && state.toLowerCase() === city.toLowerCase()) {
    state = null
  }

  const location = [city, state, country].filter(Boolean).join(', ') || null

  return {
    location,
    city,
    state,
    country,
    remoteStatus,
  }
}

const extractCountry = (record = {}, location = null) => {
  const explicitCountry = firstNonEmpty(record.country, record.countryName)
  if (explicitCountry) return explicitCountry
  if (/\bindia\b/i.test(String(record.locationHierarchyComplete ?? ''))) return 'India'
  if (/\bindia\b/i.test(String(record.locationHierarchy ?? ''))) return 'India'
  if (/\bindia\b/i.test(String(location ?? ''))) return 'India'
  return null
}

const flattenSkills = (skills = {}) => {
  if (Array.isArray(skills)) {
    return [...new Set(skills.map((skill) => normalizeWhitespace(skill)).filter(Boolean))]
  }

  return [...new Set(
    [skills.mustTohave, skills.goodtohave]
      .flatMap((group) => Array.isArray(group) ? group : [])
      .map((skill) => normalizeWhitespace(skill))
      .filter(Boolean),
  )]
}

export const buildApiUrl = ({ offset = 0, limit = DEFAULT_PAGE_SIZE } = {}) => (
  `${PORTAL_ORIGIN}/api/cp/rest/altone/cp/jobs/v1?offset=${offset}&limit=${limit}`
)

export const buildJobDetailUrl = (jobCode) => (
  jobCode ? `${PORTAL_ORIGIN}/job/detail/${encodeURIComponent(jobCode)}` : null
)

export const buildPublicHeaders = () => ({
  Origin: PORTAL_ORIGIN,
  Referer: JOB_LISTINGS_URL,
  'User-Agent': USER_AGENT,
  Accept: 'application/json,text/plain,*/*',
  'Content-Type': 'application/json',
})

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const defaultFetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const extractPeopleStrongHandoffUrl = (html = '') => {
  const match = String(html ?? '').match(
    new RegExp(`${escapeRegExp(PORTAL_ORIGIN)}\\/?`, 'i'),
  )

  if (!match) return null
  return match[0].endsWith('/') ? match[0] : `${match[0]}/`
}

export const hasOfficialCareersPageSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml) || ''

  return normalized.includes('People-first culture, AI-first careers.')
    && normalized.includes('See Open Roles')
    && normalized.includes('Explore Career')
    && normalized.includes('career@newvision-software.com')
    && extractPeopleStrongHandoffUrl(rawHtml) === JOB_LISTINGS_URL
}

export const hasPublicPortalShell = (html = '') => {
  const rawHtml = String(html ?? '')

  return /<title>\s*Candidate Portal\s*<\/title>/i.test(rawHtml)
    && /<app-root\b[^>]*data-testid=["']src-index-app-root-page-1["']/i.test(rawHtml)
    && /candidate-portal/i.test(rawHtml)
    && /main-[A-Z0-9]+\.js/i.test(rawHtml)
}

const extractLocationDetails = (record = {}) => {
  const structured = extractStructuredLocation(
    firstNonEmpty(record.locationHierarchyComplete, record.locationHierarchy),
  )
  const fallbackLocation = firstNonEmpty(record.locationName, record.location)
  const location = structured.location || fallbackLocation

  return {
    location,
    city: structured.city || firstNonEmpty(String(fallbackLocation ?? '').split(',')[0]),
    state: structured.state,
    country: structured.country || extractCountry(record, location),
    remoteStatus: structured.remoteStatus,
  }
}

export const extractSearchResults = (payload = {}) => (
  Array.isArray(payload.response) ? payload.response : []
)
  .map((record) => {
    const title = firstNonEmpty(record.jobTitle, record.title, record.designation, record.name)
    const jobCode = firstNonEmpty(record.jobCode, record.reqCode, record.requisitionId, record.jobId)
    const sourceUrl = firstNonEmpty(record.jobDetailUrl, buildJobDetailUrl(jobCode))
    const locationDetails = extractLocationDetails(record)

    if (!title || !jobCode || !sourceUrl) return null

    return {
      title,
      company: COMPANY,
      department: firstNonEmpty(record.organizationUnit, record.department, record.departmentName),
      location: locationDetails.location,
      city: locationDetails.city,
      state: locationDetails.state,
      country: locationDetails.country,
      jobId: firstNonEmpty(record.jobCode, record.jobId, record.requisitionId),
      requisitionId: firstNonEmpty(record.requisitionId, record.jobCode, record.jobId),
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: firstNonEmpty(
        record.employmentTenureType,
        record.employmentType,
        record.jobType,
      ),
      experienceRequired: firstNonEmpty(record.expRange, record.experience, record.experienceRange),
      minimumQualification: firstNonEmpty(record.minimumQualification, record.minQualification),
      preferredQualification: firstNonEmpty(record.preferredQualification, record.prefQualification),
      requiredSkills: flattenSkills(record.skills),
      postingDate: firstNonEmpty(record.jobPostedDate, record.postingDate, record.postedOn),
      closingDate: firstNonEmpty(record.jobClosureDate, record.closingDate, record.expiryDate),
      jobDescription: firstNonEmpty(record.jobDescription, record.description),
      remoteStatus: locationDetails.remoteStatus,
    }
  })
  .filter(Boolean)

export const createNewVisionSoftwareConsultancyScraper = () => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchJson = defaultFetchJson,
    pageSize = DEFAULT_PAGE_SIZE,
    maxPages = Number.POSITIVE_INFINITY,
    maxJobs = null,
    now = () => new Date().toISOString(),
  } = {}) {
    const careersPage = await fetchPage(CAREERS_PAGE_URL)
    if (careersPage.status !== 200 || !hasOfficialCareersPageSignal(careersPage.html)) {
      throw new Error('NewVision Software & Consultancy verified official careers page no longer matches the known public surface')
    }

    const handoffUrl = extractPeopleStrongHandoffUrl(careersPage.html)
    if (handoffUrl !== JOB_LISTINGS_URL) {
      throw new Error('NewVision Software & Consultancy verified careers page no longer exposes the known PeopleStrong handoff')
    }

    const portalPage = await fetchPage(JOB_LISTINGS_URL)
    if (portalPage.status !== 200 || !hasPublicPortalShell(portalPage.html)) {
      throw new Error('NewVision Software & Consultancy verified public PeopleStrong portal no longer matches the known public surface')
    }

    const jobs = []

    for (let page = 0; page < maxPages; page += 1) {
      const offset = page * pageSize
      const payload = await fetchJson(buildApiUrl({ offset, limit: pageSize }), {
        method: 'POST',
        headers: buildPublicHeaders(),
        body: JSON.stringify(DEFAULT_SEARCH_BODY),
      })

      const pageJobs = extractSearchResults(payload)
      const scrapedAt = now()
      jobs.push(...pageJobs.map((job) => ({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt,
      })))

      if (Number.isFinite(maxJobs) && jobs.length >= maxJobs) {
        return jobs.slice(0, maxJobs)
      }

      const responseCount = Array.isArray(payload?.response) ? payload.response.length : 0
      const totalRecords = Number.parseInt(String(payload?.totalRecords ?? ''), 10)

      if (responseCount === 0) break
      if (Number.isFinite(totalRecords) && offset + responseCount >= totalRecords) break
    }

    return jobs
  },
})

export const run = async (options = {}) => createNewVisionSoftwareConsultancyScraper().run(options)

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
