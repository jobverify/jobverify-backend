import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ANTHEM_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = ANTHEM_CATALOG.source
export const COMPANY = ANTHEM_CATALOG.companyName
export const HOMEPAGE_URL = ANTHEM_CATALOG.homepageUrl
export const CAREERS_PAGE_URL = ANTHEM_CATALOG.companyCareerPage
export const PORTAL_ORIGIN = ANTHEM_CATALOG.portalOrigin
export const JOB_LISTINGS_URL = ANTHEM_CATALOG.jobListingsUrl
export const DEFAULT_PAGE_SIZE = 20
export const DEFAULT_SEARCH_BODY = {}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const firstNonEmpty = (...values) => {
  for (const value of values) {
    const normalized = normalizeWhitespace(value)
    if (normalized) return normalized
  }

  return null
}

const normalizeHierarchyLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (!normalized.includes('>')) return normalized

  const parts = normalized
    .split('>')
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)

  if (parts.length === 0) return null

  const country = /^india$/i.test(parts[0]) ? parts.shift() : null
  const deduped = parts.filter((part, index) => part !== parts[index - 1])
  const reversed = [...deduped].reverse()

  return [reversed.join(', '), country].filter(Boolean).join(', ')
}

const extractLocation = (record = {}) => firstNonEmpty(
  normalizeHierarchyLocation(record.locationHierarchyComplete),
  record.locationHierarchy,
  record.location,
  record.locationName,
  record.cityName,
  record.city,
)

const extractCity = (location) => normalizeWhitespace(String(location ?? '').split(',')[0]) || null

const extractCountry = (record = {}, location = null) => {
  const explicitCountry = firstNonEmpty(record.country, record.countryName)
  if (explicitCountry) return explicitCountry
  if (/\bindia\b/i.test(String(record.locationHierarchyComplete ?? ''))) return 'India'
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

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')

  return /<title>\s*Anthem - Home - Anthem\s*<\/title>/i.test(rawHtml)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/anthembio\.com\/["']/i.test(rawHtml)
    && /Anthem Biosciences Logo/i.test(rawHtml)
    && /href=["']https:\/\/anthembio\.com\/careers\/["']/i.test(rawHtml)
}

export const hasOfficialCareersPageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*Careers - Anthem\s*<\/title>/i.test(rawHtml)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/anthembio\.com\/careers\/["']/i.test(rawHtml)
    && /We are not just following the science, we are leading it\./i.test(normalized)
    && /We need YOU\./i.test(normalized)
    && /Wealth Creation Opportunity/i.test(normalized)
}

export const extractPeopleStrongHandoffUrl = (html) => {
  const match = String(html ?? '').match(/href=["'](https:\/\/anthemhrcp\.peoplestrong\.com\/)["']/i)
  return match ? match[1] : null
}

export const hasPublicPortalShell = (html) => {
  const rawHtml = String(html ?? '')

  return /<title>\s*Candidate Portal\s*<\/title>/i.test(rawHtml)
    && /<app-root\b[^>]*data-testid=["']src-index-app-root-page-1["']/i.test(rawHtml)
    && /candidate-portal/i.test(rawHtml)
    && /main-[A-Z0-9]+\.js/i.test(rawHtml)
}

export const extractSearchResults = (payload = {}) => (
  Array.isArray(payload.response) ? payload.response : []
)
  .map((record) => {
    const title = firstNonEmpty(record.jobTitle, record.title, record.designation, record.name)
    const jobCode = firstNonEmpty(record.jobCode, record.reqCode, record.requisitionId, record.jobId)
    const sourceUrl = firstNonEmpty(record.jobDetailUrl, buildJobDetailUrl(jobCode))
    const location = extractLocation(record)

    if (!title || !jobCode || !sourceUrl) return null

    return {
      title,
      company: COMPANY,
      department: firstNonEmpty(record.organizationUnit, record.department, record.departmentName),
      location,
      city: extractCity(location),
      country: extractCountry(record, location),
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
    }
  })
  .filter(Boolean)

export const createAnthemScraper = () => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchJson = defaultFetchJson,
    pageSize = DEFAULT_PAGE_SIZE,
    maxPages = Number.POSITIVE_INFINITY,
  } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Anthem verified official homepage no longer matches the known public surface')
    }

    const careersPage = await fetchPage(CAREERS_PAGE_URL)
    if (careersPage.status !== 200 || !hasOfficialCareersPageSignal(careersPage.html)) {
      throw new Error('Anthem verified official careers page no longer matches the known public surface')
    }

    const handoffUrl = extractPeopleStrongHandoffUrl(careersPage.html)
    if (handoffUrl !== JOB_LISTINGS_URL) {
      throw new Error('Anthem verified official careers page no longer exposes the known PeopleStrong handoff')
    }

    const portalPage = await fetchPage(JOB_LISTINGS_URL)
    if (portalPage.status !== 200 || !hasPublicPortalShell(portalPage.html)) {
      throw new Error('Anthem verified public PeopleStrong portal no longer matches the known public surface')
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
      jobs.push(...pageJobs.map((job) => ({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: new Date().toISOString(),
      })))

      const responseCount = Array.isArray(payload?.response) ? payload.response.length : 0
      const totalRecords = Number.parseInt(String(payload?.totalRecords ?? ''), 10)

      if (responseCount === 0) break
      if (Number.isFinite(totalRecords) && offset + responseCount >= totalRecords) break
    }

    return jobs
  },
})

export const run = async (options = {}) => createAnthemScraper().run(options)

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
