import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

import { ADITYA_BIRLA_CAPITAL_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = ADITYA_BIRLA_CAPITAL_CATALOG
export const SOURCE = ADITYA_BIRLA_CAPITAL_CATALOG.source
export const COMPANY_NAME = ADITYA_BIRLA_CAPITAL_CATALOG.companyName
export const CAREERS_PAGE_URL = ADITYA_BIRLA_CAPITAL_CATALOG.companyCareerPage
export const JOBS_PAGE_URL = ADITYA_BIRLA_CAPITAL_CATALOG.officialJobsPage
export const RESUME_HANDOFF_URL = ADITYA_BIRLA_CAPITAL_CATALOG.resumeHandoffUrl
export const VERIFIED_ON = ADITYA_BIRLA_CAPITAL_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = ADITYA_BIRLA_CAPITAL_CATALOG.verifiedSurfaceSummary

export const IONA_APPLY_BASE_URL = 'https://abccareers.iona.ai/job-details/referral'
export const ABG_PEOPLESTRONG_APPLY_BASE_URL = 'https://abgcareers.peoplestrong.com/job/detail'

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobverify scraper)'

const firstNonEmpty = (...values) => {
  for (const value of values) {
    const normalized = normalizeWhitespace(value)
    if (normalized) return normalized
  }

  return null
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&nbsp;/gi, ' ')

const stripHtml = (value) => normalizeWhitespace(
  decodeHtmlEntities(String(value ?? ''))
    .replace(/<(br|\/p|\/div|\/li|\/ul|\/ol|\/table|\/tr|\/td|\/h[1-6])\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const extractTitle = (html) => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1])
}

function normalizeWhitespace(value) {
  if (value == null) return null

  const normalized = decodeHtmlEntities(String(value))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const isLikelyLocationCode = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return false
  if (/^\d+$/.test(normalized)) return true
  return /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)
}

const dedupeCaseInsensitive = (values) => {
  const seen = new Set()
  const results = []

  for (const value of values) {
    const normalized = normalizeWhitespace(value)
    if (!normalized) continue

    const key = normalized.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    results.push(normalized)
  }

  return results
}

const buildLocation = (record = {}) => {
  const components = dedupeCaseInsensitive([
    record.Location1,
    record.Location2,
    record.Location3,
  ])

  if (components.length > 1 && isLikelyLocationCode(components[0])) {
    components.shift()
  }

  if (components.length === 0) {
    const fallback = firstNonEmpty(...(Array.isArray(record.Locations) ? record.Locations : []))
    return fallback ? stripHtml(fallback).replace(/\s+India$/i, ', India') : null
  }

  return components.join(', ')
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  if (/^across\b/i.test(normalized)) return null

  const components = normalized
    .split(',')
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean)

  if (components.length === 0) return null
  if (components.length > 1 && isLikelyLocationCode(components[0])) return components[1] || null
  if (/^india$/i.test(components[0])) return null
  return components[0]
}

const buildExperienceRequired = (minYears, maxYears) => {
  const min = Number.parseInt(String(minYears ?? ''), 10)
  const max = Number.parseInt(String(maxYears ?? ''), 10)

  if (Number.isFinite(min) && Number.isFinite(max)) {
    return min === max ? `${min} years` : `${min} - ${max} years`
  }

  if (Number.isFinite(min)) return `${min}+ years`
  if (Number.isFinite(max)) return `0 - ${max} years`
  return null
}

const isAbgPeopleStrongJobCode = (jobCode) => /^abg/i.test(String(jobCode ?? ''))

export const buildJobsApiUrl = ({
  page = 0,
  jobTitle = '',
  location = '',
  businessline = '',
  jobFunction = '',
  experience = '',
} = {}) => {
  const params = new URLSearchParams()
  params.append('blogAjax', '1')
  params.append('jobTitle', jobTitle)
  params.append('location', location)
  params.append('businessline', businessline)
  params.append('function', jobFunction)
  params.append('experience', experience)
  params.append('page', String(page))

  return `${JOBS_PAGE_URL}?${params.toString()}`
}

export const buildDetailUrl = (value) => {
  const input = normalizeWhitespace(value)
  if (!input) return null

  if (/^https?:\/\//i.test(input)) return input
  if (input.startsWith('/careers/')) return `https://www.adityabirlacapital.com${input}`
  if (input.startsWith('/sitecore/')) return `https://www.adityabirlacapital.com/careers${input}`

  try {
    return new URL(input, `${JOBS_PAGE_URL}/`).toString()
  } catch {
    return null
  }
}

const buildIonaApplyUrl = (jobCode) => (
  `${IONA_APPLY_BASE_URL}/${encodeURIComponent(jobCode)}?source=ABCCareers&subsource=ABCCareer-Jobs`
)

const buildPeopleStrongApplyUrl = (jobCode) => (
  `${ABG_PEOPLESTRONG_APPLY_BASE_URL}/${encodeURIComponent(jobCode)}?source=ABCCareers&subsource=ABCCareer-Jobs`
)

export const buildApplyUrl = (jobCode) => (
  isAbgPeopleStrongJobCode(jobCode)
    ? buildPeopleStrongApplyUrl(jobCode)
    : buildIonaApplyUrl(jobCode)
)

export const extractResumeHandoffUrl = (html = '') => {
  const match = String(html ?? '').match(/https:\/\/abgcareers\.peoplestrong\.com\/register/i)
  return normalizeWhitespace(match?.[0])
}

export const extractServerRenderedDetailUrls = (html = '') => {
  const urls = [...new Set(
    [...String(html ?? '').matchAll(
      /\/careers\/sitecore\/content\/abcl\/abcareers\/home\/jobs\/job-details\/[^"' ]+/gi,
    )]
      .map((match) => buildDetailUrl(match[0]))
      .filter(Boolean),
  )]

  return urls
}

export const hasOfficialCareersPageSignals = (html = '') => {
  const rawHtml = String(html ?? '')
  const title = extractTitle(rawHtml)

  return title === 'Aditya Birla Capital Careers: Explore Career Opportunities Now!'
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.adityabirlacapital\.com\/careers["']/i.test(rawHtml)
    && /href=["']\/careers\/jobs["']/i.test(rawHtml)
    && /(?:job opportunities|>\s*Jobs\s*<|open opportunities)/i.test(rawHtml)
}

export const hasOfficialJobsPageSignals = (html = '') => {
  const rawHtml = String(html ?? '')
  const title = extractTitle(rawHtml)

  return title === 'Job Search, Employment, Job Vacancies & Opportunities - Aditya Birla Capital'
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.adityabirlacapital\.com\/careers\/jobs["']/i.test(rawHtml)
    && /id=["']jobTitleEndpoint["']/i.test(rawHtml)
    && /id=["']locationEndpoint["']/i.test(rawHtml)
    && /job-hunt-card-section/i.test(rawHtml)
    && extractResumeHandoffUrl(rawHtml) === RESUME_HANDOFF_URL
    && extractServerRenderedDetailUrls(rawHtml).length > 0
}

export const hasOfficialJobDetailSignals = (html = '') => {
  const rawHtml = String(html ?? '')
  const title = extractTitle(rawHtml)

  return /\bAditya Birla Capital\b/i.test(String(title ?? ''))
    && /\bJob Description\b/i.test(rawHtml)
    && /\bApply now\b/i.test(rawHtml)
    && /join-team-description/i.test(rawHtml)
}

export const extractApplyUrlFromDetailHtml = (html = '') => {
  const match = String(html ?? '').match(/location\.href\s*=\s*'([^']+)'/i)
  return normalizeWhitespace(decodeHtmlEntities(match?.[1]))
}

export const buildPublicHeaders = () => ({
  'User-Agent': USER_AGENT,
  Accept: 'application/json,text/plain,*/*',
  Referer: JOBS_PAGE_URL,
})

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'adityabirlacapital-text',
  timeoutMs: 15000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: buildPublicHeaders(),
  label: 'adityabirlacapital-json',
  timeoutMs: 15000,
})

export const extractSearchResults = (payload = {}) => (
  Array.isArray(payload.Results) ? payload.Results : []
)
  .map((record) => {
    const jobCode = firstNonEmpty(record.JobCode, record.JobTitle)
    const title = firstNonEmpty(record.JobTitle, record.Designation)
    const sourceUrl = buildDetailUrl(record.Url)

    if (!jobCode || !title || !sourceUrl) return null

    const location = buildLocation(record)

    return {
      title,
      company: COMPANY_NAME,
      department: firstNonEmpty(record.FunctionalArea, record.Department),
      businessLine: firstNonEmpty(record.BusinessLine),
      team: firstNonEmpty(record.Department),
      location,
      city: extractCity(location),
      country: firstNonEmpty(record.Location3) || (/\bindia\b/i.test(String(location ?? '')) ? 'India' : null),
      sourceUrl,
      applyUrl: buildApplyUrl(jobCode),
      jobId: jobCode,
      requisitionId: jobCode,
      employmentType: null,
      experienceRequired: buildExperienceRequired(record.MinYearsOfExp, record.MaxYearsOfExp),
      postingDate: firstNonEmpty(record.DemandCreatedDate, record.LastApprovalDate),
      closingDate: firstNonEmpty(record.EndDate),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      jobDescription: null,
      remoteStatus: null,
    }
  })
  .filter(Boolean)

const verifyDetailApplyHandoff = async (job, fetchText) => {
  const detailHtml = await fetchText(job.sourceUrl)

  if (!hasOfficialJobDetailSignals(detailHtml)) {
    throw new Error(`Aditya Birla Capital verified job detail page drifted: ${job.sourceUrl}`)
  }

  const actualApplyUrl = extractApplyUrlFromDetailHtml(detailHtml)
  const expectedApplyUrl = buildApplyUrl(job.jobId)

  if (actualApplyUrl !== expectedApplyUrl) {
    throw new Error(`Aditya Birla Capital verified apply handoff drifted for ${job.jobId}`)
  }
}

export const createAdityaBirlaCapitalScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    maxPages = config.maxPages,
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_PAGE_URL)
    if (!hasOfficialCareersPageSignals(careersHtml)) {
      throw new Error('Aditya Birla Capital verified official careers page no longer matches the public surface')
    }

    const jobsHtml = await fetchText(JOBS_PAGE_URL)
    if (!hasOfficialJobsPageSignals(jobsHtml)) {
      throw new Error('Aditya Birla Capital verified official jobs page no longer matches the public surface')
    }

    const effectiveMaxPages = Number.isInteger(maxPages) && maxPages > 0
      ? maxPages
      : Number.POSITIVE_INFINITY
    const effectiveMaxJobs = Number.isInteger(maxJobs) && maxJobs > 0 ? maxJobs : null
    const scrapedAt = now()
    const jobs = []
    let ionaVerified = false
    let peopleStrongVerified = false

    for (let page = 0; page < effectiveMaxPages; page += 1) {
      const payload = await fetchJson(buildJobsApiUrl({ page }))
      const pageJobs = extractSearchResults(payload)

      if (pageJobs.length === 0) break

      for (const job of pageJobs) {
        if (!ionaVerified && !isAbgPeopleStrongJobCode(job.jobId)) {
          await verifyDetailApplyHandoff(job, fetchText)
          ionaVerified = true
        }

        if (!peopleStrongVerified && isAbgPeopleStrongJobCode(job.jobId)) {
          await verifyDetailApplyHandoff(job, fetchText)
          peopleStrongVerified = true
        }

        jobs.push({
          ...job,
          source: SOURCE,
          link: job.applyUrl || job.sourceUrl,
          scrapedAt,
        })

        if (effectiveMaxJobs && jobs.length >= effectiveMaxJobs) {
          return jobs.slice(0, effectiveMaxJobs)
        }
      }

      const totalPages = Number.parseInt(String(payload?.Pages ?? ''), 10)
      if (Number.isFinite(totalPages) && page + 1 >= totalPages) break
    }

    return jobs
  },
})

export const run = async (options = {}) => createAdityaBirlaCapitalScraper(options).run(options)

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
