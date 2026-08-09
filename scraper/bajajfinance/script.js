import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { composeAbortSignals } from '../../scraper-support/utils/fetch.js'

import { BAJAJ_FINANCE_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = BAJAJ_FINANCE_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const COMPANY_PAGE_URL = PROVIDER_METADATA.companyCareerPage
export const PORTAL_ORIGIN = PROVIDER_METADATA.portalOrigin
export const JOB_LISTINGS_URL = PROVIDER_METADATA.jobListingsUrl
export const EXPECTED_TOP_LEVEL_COMPANY = 'Bajaj Finance Limited'
export const DEFAULT_PAGE_SIZE = 99
export const DEFAULT_SEARCH_BODY = {}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
export const DEFAULT_FETCH_TIMEOUT_MS = 20000

export const createFetchTimeoutSignal = (timeoutMs = DEFAULT_FETCH_TIMEOUT_MS) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined
  }

  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
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
  const withoutTier = parts.filter((part) => !/^tier\s*\d+$/i.test(part))
  const deduped = withoutTier.filter((part, index) => part !== withoutTier[index - 1])
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

export const extractTopLevelCompany = (record = {}) => firstNonEmpty(
  record.companyName,
  record.legalEntity,
  String(record.organizationUnitComplete || '').split('>')[0],
)

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

const defaultFetchPage = async (url, {
  signal,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
} = {}) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: composeAbortSignals(
      signal,
      createFetchTimeoutSignal(timeoutMs),
    ),
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
    signal: composeAbortSignals(
      options.signal,
      createFetchTimeoutSignal(options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS),
    ),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const extractPeopleStrongHandoffUrl = (html = '') => {
  const match = String(html ?? '').match(/https:\/\/bflcareers\.peoplestrong\.com\/?/i)
  if (!match) return null

  return match[0].endsWith('/') ? match[0] : `${match[0]}/`
}

export const hasOfficialBajajFinancePageSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml) || ''

  return /<title>\s*Bajaj Finance\s*[-\u2012-\u2015]\s*About Us\s*<\/title>/i.test(rawHtml)
    && normalized.includes('115.40 million customers')
    && normalized.includes('A subsidiary of Bajaj Finserv Ltd., Bajaj Finance is a deposit-taking Non-Banking Financial Company')
    && extractPeopleStrongHandoffUrl(rawHtml) === JOB_LISTINGS_URL
}

export const hasPublicPortalShell = (html = '') => {
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
      publicExperienceChecked: Boolean(
        firstNonEmpty(record.expRange, record.experience, record.experienceRange),
      ),
      minimumQualification: firstNonEmpty(record.minimumQualification, record.minQualification),
      preferredQualification: firstNonEmpty(record.preferredQualification, record.prefQualification),
      requiredSkills: flattenSkills(record.skills),
      postingDate: firstNonEmpty(record.jobPostedDate, record.postingDate, record.postedOn),
      closingDate: firstNonEmpty(record.jobClosureDate, record.closingDate, record.expiryDate),
      jobDescription: firstNonEmpty(record.jobDescription, record.description),
    }
  })
  .filter(Boolean)

export const createBajajFinanceScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchJson = defaultFetchJson,
    pageSize = DEFAULT_PAGE_SIZE,
    maxPages = Number.POSITIVE_INFINITY,
    signal,
  } = {}) {
    const companyPage = await fetchPage(COMPANY_PAGE_URL, { signal })
    if (companyPage.status !== 200 || !hasOfficialBajajFinancePageSignal(companyPage.html)) {
      throw new Error('Bajaj Finance verified official Bajaj Finance page no longer matches the known public surface')
    }

    const handoffUrl = extractPeopleStrongHandoffUrl(companyPage.html)
    if (handoffUrl !== JOB_LISTINGS_URL) {
      throw new Error('Bajaj Finance verified official company page no longer exposes the known PeopleStrong handoff')
    }

    const portalPage = await fetchPage(JOB_LISTINGS_URL, { signal })
    if (portalPage.status !== 200 || !hasPublicPortalShell(portalPage.html)) {
      throw new Error('Bajaj Finance verified public PeopleStrong portal no longer matches the known public surface')
    }

    const jobs = []

    for (let page = 0; page < maxPages; page += 1) {
      const offset = page * pageSize
      const payload = await fetchJson(buildApiUrl({ offset, limit: pageSize }), {
        method: 'POST',
        headers: buildPublicHeaders(),
        body: JSON.stringify(DEFAULT_SEARCH_BODY),
        signal,
      })

      const rawRecords = Array.isArray(payload?.response) ? payload.response : []
      const pageCompanies = new Set(rawRecords.map((record) => extractTopLevelCompany(record)).filter(Boolean))
      if (page === 0 && rawRecords.length > 0 && !pageCompanies.has(EXPECTED_TOP_LEVEL_COMPANY)) {
        return []
      }

      const pageJobs = extractSearchResults({
        ...payload,
        response: rawRecords.filter((record) => extractTopLevelCompany(record) === EXPECTED_TOP_LEVEL_COMPANY),
      })
      jobs.push(...pageJobs.map((job) => ({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: now(),
      })))

      const responseCount = rawRecords.length
      const totalRecords = Number.parseInt(String(payload?.totalRecords ?? ''), 10)

      if (responseCount === 0) break
      if (Number.isFinite(totalRecords) && offset + responseCount >= totalRecords) break
    }

    return jobs
  },
})

export const run = async (options = {}) => createBajajFinanceScraper().run(options)

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
