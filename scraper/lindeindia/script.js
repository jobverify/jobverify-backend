import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const PORTAL_ORIGIN = 'https://leindiacareers.peoplestrong.com'
export const SOURCE = 'lindeindia'
export const COMPANY = 'Linde India'
export const COMPANY_DOMAIN = 'linde.in'
export const HOMEPAGE_URL = 'https://www.linde.in/'
export const JOB_LOCATIONS_URL = 'https://www.lindecareers.com/en/job-locations'
export const ENGINEERING_PORTAL_URL = 'https://leindiacareers.peoplestrong.com/home'
export const INDIA_GASES_URL =
  'https://linde.csod.com/ux/ats/careersite/25/home?c=linde&cfdd[0][id]=251&cfdd[0][options][0]=1375&cfdd[0][options][1]=1131&cfdd[0][options][2]=1132&country=in'
export const INDIA_ITSC_URL =
  'https://linde.csod.com/ux/ats/careersite/25/home?c=linde&cfdd[0][id]=251&cfdd[0][options][0]=2266&country=in'
export const DEFAULT_PAGE_SIZE = 20

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const JOBS_API_PATH = `${PORTAL_ORIGIN}/api/cp/rest/altone/cp/jobs/v1`

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;/gi, "'")
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

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return 'India'
  if (/\bindia\b/i.test(normalized)) return normalized
  return `${normalized}, India`
}

const extractCity = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return normalized.replace(/,\s*India$/i, '').split(',')[0]?.trim() || null
}

const flattenSkills = (skills = {}) => [...new Set(
  [skills.mustTohave, skills.goodtohave]
    .flatMap((group) => Array.isArray(group) ? group : [])
    .map((skill) => normalizeWhitespace(skill))
    .filter(Boolean),
)]

const isIndiaEngineeringRecord = (record = {}) => {
  const org = normalizeWhitespace(record.organizationUnitComplete)
  const location = normalizeWhitespace(record.locationHierarchyComplete)

  return /\blinde engineering india\b/i.test(org) || /\bindia\b/i.test(location)
}

export const buildApiUrl = ({ offset = 0, limit = DEFAULT_PAGE_SIZE } = {}) => (
  `${JOBS_API_PATH}?offset=${offset}&limit=${limit}`
)

export const buildJobDetailUrl = (jobCode) => (
  jobCode ? `${PORTAL_ORIGIN}/job/detail/${encodeURIComponent(jobCode)}` : null
)

export const buildPublicHeaders = () => ({
  Origin: PORTAL_ORIGIN,
  Referer: ENGINEERING_PORTAL_URL,
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
  const normalized = normalizeWhitespace(rawHtml).toLowerCase()

  return /<title>\s*linde in india \| a linde company\s*<\/title>/i.test(rawHtml)
    && normalized.includes('careers')
    && rawHtml.includes('https://www.lindecareers.com/')
    && rawHtml.includes('https://www.linde.com/')
}

export const hasOfficialJobLocationsSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml).toLowerCase()
  const decoded = rawHtml.replace(/&amp;/gi, '&')

  return normalized.includes('job location information, related details and applications')
    && normalized.includes('india')
    && normalized.includes('asia')
    && decoded.includes(INDIA_GASES_URL)
    && decoded.includes(ENGINEERING_PORTAL_URL)
    && decoded.includes(INDIA_ITSC_URL)
}

export const hasEngineeringPortalShell = (html) => {
  const rawHtml = String(html ?? '')

  return /<title>\s*Candidate Portal\s*<\/title>/i.test(rawHtml)
    && /<app-root\b[^>]*data-testid=["']src-index-app-root-page-1["']/i.test(rawHtml)
    && /candidate-portal/i.test(rawHtml)
    && /main-[A-Z0-9]+\.js/i.test(rawHtml)
}

export const extractEngineeringJobs = (payload = {}) => (
  Array.isArray(payload.response) ? payload.response : []
)
  .filter((record) => isIndiaEngineeringRecord(record))
  .map((record) => {
    const title = firstNonEmpty(record.jobTitle, record.title, record.designation, record.name)
    const jobCode = firstNonEmpty(record.jobCode, record.reqCode, record.requisitionId, record.jobId)
    const location = normalizeLocation(firstNonEmpty(
      record.locationHierarchy,
      record.location,
      record.locationName,
      record.locationHierarchyComplete,
    ))
    const sourceUrl = buildJobDetailUrl(jobCode)

    if (!title || !jobCode || !sourceUrl) return null

    return {
      title,
      company: COMPANY,
      department: firstNonEmpty(record.organizationUnit, record.department, record.departmentName),
      location,
      city: extractCity(location),
      country: 'India',
      jobId: jobCode,
      requisitionId: firstNonEmpty(record.requisitionId, jobCode) || jobCode,
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
      companyCareerPage: JOB_LOCATIONS_URL,
      companyDomain: COMPANY_DOMAIN,
      atsPlatform: 'peoplestrong',
    }
  })
  .filter(Boolean)

export const createLindeIndiaScraper = () => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchJson = defaultFetchJson,
    pageSize = DEFAULT_PAGE_SIZE,
    maxPages = Number.POSITIVE_INFINITY,
  } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Linde India verified official homepage no longer matches the known public surface')
    }

    const jobLocations = await fetchPage(JOB_LOCATIONS_URL)

    if (jobLocations.status !== 200 || !hasOfficialJobLocationsSignal(jobLocations.html)) {
      throw new Error('Linde India verified official job locations page no longer matches the known public surface')
    }

    const engineeringPortal = await fetchPage(ENGINEERING_PORTAL_URL)

    if (![200, 404].includes(engineeringPortal.status) || !hasEngineeringPortalShell(engineeringPortal.html)) {
      throw new Error('Linde India verified public engineering portal no longer matches the known public surface')
    }

    const jobs = []

    for (let page = 0; page < maxPages; page += 1) {
      const offset = page * pageSize
      const payload = await fetchJson(buildApiUrl({ offset, limit: pageSize }), {
        method: 'POST',
        headers: buildPublicHeaders(),
        body: JSON.stringify({}),
      })

      const pageJobs = extractEngineeringJobs(payload)
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

export const run = async (options = {}) => createLindeIndiaScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
