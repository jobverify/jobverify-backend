import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getValidIndiaCityForJob } from '../../src/utils/publicJobLocationScope.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'federalbank'
export const COMPANY = 'Federal Bank'
export const CAREER_PAGE_URL = 'https://www.federal.bank.in/careers'
export const CAREERS_PORTAL_URL = 'https://federalbankcareers.zappyhire.com/'
export const DASHBOARD_API_URL = 'https://fed.portal.zappyhire.com/api/job_portal/dashboard/'
export const COMPANY_DOMAIN = 'federal.bank.in'
export const ATS_PLATFORM = 'zappyhire-job-portal'

const USER_AGENT = 'Mozilla/5.0 (compatible; JobverifyCareerScraper/1.0)'

const CAREERS_TITLE_PATTERN = /<title>\s*Careers at Federal Bank\b[^<]*<\/title>/i
const CAREERS_WELCOME_PATTERN = /Career\s*-\s*Welcome/i
const EXPLORE_OPPORTUNITIES_LINK_PATTERN = /href=["']https:\/\/federalbankcareers\.zappyhire\.com\/?["'][^>]*>\s*Explore Opportunities\s*</i

const MONTH_NAMES = new Map([
  ['january', 0],
  ['february', 1],
  ['march', 2],
  ['april', 3],
  ['may', 4],
  ['june', 5],
  ['july', 6],
  ['august', 7],
  ['september', 8],
  ['october', 9],
  ['november', 10],
  ['december', 11],
])

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const createTimeoutSignal = (timeoutMs) => {
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

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: createTimeoutSignal(15000),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const defaultFetchJson = async (url, requestInit = {}) => {
  const response = await fetch(url, {
    method: 'POST',
    ...requestInit,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain,*/*',
      'content-type': 'application/json',
      Origin: 'https://federalbankcareers.zappyhire.com',
      ...(requestInit.headers || {}),
    },
    signal: createTimeoutSignal(15000),
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

const toIsoDate = (year, monthIndex, day) => {
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || !Number.isInteger(day)) {
    return null
  }

  return new Date(Date.UTC(year, monthIndex, day)).toISOString()
}

const parseDotDate = (value) => {
  const match = normalizeWhitespace(value).match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!match) return null

  const [, dayString, monthString, yearString] = match
  return toIsoDate(
    Number.parseInt(yearString, 10),
    Number.parseInt(monthString, 10) - 1,
    Number.parseInt(dayString, 10),
  )
}

const parseHumanDate = (value) => {
  const match = normalizeWhitespace(value).match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/i)
  if (!match) return null

  const [, dayString, monthName, yearString] = match
  const monthIndex = MONTH_NAMES.get(monthName.toLowerCase())
  if (!Number.isInteger(monthIndex)) return null

  return toIsoDate(
    Number.parseInt(yearString, 10),
    monthIndex,
    Number.parseInt(dayString, 10),
  )
}

const parsePublishedDate = (value) => parseDotDate(value)

const parseClosingDate = (value) => parseDotDate(value) || parseHumanDate(value)

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized || /as per notification/i.test(normalized)) {
    return 'India'
  }

  return normalized
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value).toLowerCase()
  if (!normalized) return null
  if (normalized === 'full time' || normalized === 'full-time') return 'Full-time'
  if (normalized.includes('apprentice')) return 'Apprenticeship'
  return normalizeWhitespace(value)
}

const buildJobDescription = (record = {}) => {
  const fragments = []
  const description = normalizeWhitespace(record.description)

  if (description) {
    fragments.push(description)
  }

  const freeTextEntries = Array.isArray(record.job_portal_free_text)
    ? record.job_portal_free_text
      .map((entry) => {
        const label = normalizeWhitespace(entry?.label)
        const value = normalizeWhitespace(entry?.value)
        if (!label || !value) return null
        return `${label}: ${value}`
      })
      .filter(Boolean)
    : []

  fragments.push(...freeTextEntries)
  return fragments.join('\n') || null
}

export const hasOfficialCareersSurface = (html) => {
  const page = String(html ?? '')

  return CAREERS_TITLE_PATTERN.test(page)
    && CAREERS_WELCOME_PATTERN.test(page)
    && EXPLORE_OPPORTUNITIES_LINK_PATTERN.test(page)
}

export const hasRadwareChallengeSignal = (html) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return normalized.includes('radware page')
    && normalized.includes('verifying your browser')
}

export const hasCareersPortalShellSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()

  return /<title>\s*Talent Connect\s*<\/title>/i.test(page)
    && (normalized.includes('app-root') || /main-[a-z0-9]+\.js/i.test(page))
}

export const hasDashboardPayloadShape = (payload = {}) =>
  payload?.status === 1
  && Array.isArray(payload?.results?.open_jobs)

const isClosedPosting = (record = {}) => record?.is_registration_closed === true

export const normalizeDashboardJob = (record = {}, scrapedAt) => {
  if (isClosedPosting(record)) {
    return null
  }

  const title = normalizeWhitespace(record.title || record.designation)
  const applyUrl = normalizeWhitespace(record.external_job_link || record.job_url)
  if (!title || !applyUrl) {
    return null
  }

  const location = normalizeLocation(record.deployment_location)

  return {
    title,
    company: COMPANY,
    department: null,
    location,
    city: getValidIndiaCityForJob({
      location,
      country: 'India',
    }),
    country: 'India',
    jobId: `${SOURCE}-${record.id}`,
    requisitionId: String(record.id),
    sourceUrl: applyUrl,
    applyUrl,
    employmentType: normalizeEmploymentType(record.engagement_type),
    workplaceType: null,
    experienceRequired: normalizeWhitespace(record.experience_field) || null,
    minimumQualification: normalizeWhitespace(record.qualification) || null,
    preferredQualification: null,
    requiredSkills: Array.isArray(record.skills)
      ? record.skills.map((skill) => normalizeWhitespace(skill)).filter(Boolean)
      : [],
    postingDate: parsePublishedDate(record.job_portal_published_datetime),
    closingDate: parseClosingDate(record.registration_closing_datetime),
    jobDescription: buildJobDescription(record),
    source: SOURCE,
    companyDomain: COMPANY_DOMAIN,
    atsPlatform: ATS_PLATFORM,
    companyCareerPage: CAREER_PAGE_URL,
    link: applyUrl,
    scrapedAt,
  }
}

export const createFederalBankScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchJson = defaultFetchJson,
    now: overrideNow,
  } = {}) {
    const careersPage = await fetchPage(CAREER_PAGE_URL)

    if (
      careersPage.status !== 200
      || (!hasOfficialCareersSurface(careersPage.html) && !hasRadwareChallengeSignal(careersPage.html))
    ) {
      throw new Error('Federal Bank official careers surface changed; refusing to assume no public listings')
    }

    const portalShell = await fetchPage(CAREERS_PORTAL_URL)
    if (portalShell.status !== 200 || !hasCareersPortalShellSignal(portalShell.html)) {
      throw new Error('Federal Bank public careers portal changed materially')
    }

    const dashboardPayload = await fetchJson(DASHBOARD_API_URL, {
      method: 'POST',
      body: '{}',
    })
    if (!hasDashboardPayloadShape(dashboardPayload)) {
      throw new Error('Federal Bank public dashboard payload changed materially')
    }

    const scrapedAt = (overrideNow || now)()
    const dashboardJobs = dashboardPayload.results.open_jobs
    const normalizedJobs = dashboardJobs
      .map((record) => normalizeDashboardJob(record, scrapedAt))
      .filter(Boolean)

    if (dashboardJobs.some((record) => !isClosedPosting(record)) && normalizedJobs.length === 0) {
      throw new Error('Federal Bank public dashboard changed materially: current openings no longer normalize')
    }

    return normalizedJobs
  },
})

export const run = async (options = {}) => createFederalBankScraper(options).run(options)

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
