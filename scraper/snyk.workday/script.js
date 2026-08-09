import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import SNYK_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const SOURCE = SNYK_CATALOG.source
export const COMPANY = SNYK_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = SNYK_CATALOG.officialBrandName
export const VERIFIED_ON = SNYK_CATALOG.verifiedOn
export const PROVIDER_METADATA = SNYK_CATALOG
export const CAREERS_URL = SNYK_CATALOG.officialCareersLandingUrl
export const JOBS_PAGE_URL = SNYK_CATALOG.companyCareerPage
export const FIRST_PARTY_JOBS_API_URL = SNYK_CATALOG.firstPartyJobsApiUrl
export const WORKDAY_TENANT_URL = SNYK_CATALOG.workdayTenantUrl

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&#038;|&amp;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
    Referer: JOBS_PAGE_URL,
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasVerifiedCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)?.toLowerCase() || ''

  return /<title[^>]*>\s*Careers\s*\|\s*Snyk\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/snyk\.io\/careers\/["']/i.test(page)
    && normalized.includes('join us on our mission')
    && /href=["']\/careers\/all-jobs\/["']/i.test(page)
}

export const hasVerifiedJobsPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)?.toLowerCase() || ''

  return /<title[^>]*>\s*Open jobs\s*\|\s*Snyk\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/snyk\.io\/careers\/all-jobs\/["']/i.test(page)
    && normalized.includes('find your next role @snyk')
    && /id=["']all-jobs["']/i.test(page)
}

const toArray = (value) => {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') return [value]
  return []
}

export const extractLocationNames = (job = {}) =>
  toArray(job.locations)
    .map((location) => normalizeWhitespace(location?.['@_Descriptor']))
    .filter(Boolean)

const getDepartment = (job = {}) =>
  normalizeWhitespace(job?.Job_Requisition_group?.department?.['@_Descriptor']) || 'Other'

const hasVerifiedWorkdayUrl = (value) => {
  try {
    const url = new URL(value)
    const expected = new URL(WORKDAY_TENANT_URL)
    return url.origin === expected.origin
      && url.pathname.startsWith(`${expected.pathname}/job/`)
  } catch {
    return false
  }
}

export const extractIndiaJobsFromPayload = (payload) => {
  const jobs = Array.isArray(payload?.data) ? payload.data : null
  if (!payload?.success || !jobs) {
    throw new Error('Snyk jobs API response no longer matches the expected payload')
  }

  return jobs
    .filter((job) => extractLocationNames(job).some((location) => /\bindia\b/i.test(location)))
    .map((job) => ({
      title: normalizeWhitespace(job.title),
      company: COMPANY,
      location: extractLocationNames(job).join('; '),
      country: 'India',
      link: job.url,
      applyUrl: job.url,
      sourceUrl: job.url,
      source: SOURCE,
      jobId: normalizeWhitespace(job.jobRequisitionId),
      requisitionId: normalizeWhitespace(job.jobRequisitionId),
      department: getDepartment(job),
      postingDate: null,
      requiredSkills: [],
    }))
}

export const createSnykScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasVerifiedCareersPageSignal(careersHtml)) {
      throw new Error('Verified Snyk careers landing page changed materially')
    }

    const jobsPageHtml = await fetchText(JOBS_PAGE_URL)
    if (!hasVerifiedJobsPageSignal(jobsPageHtml)) {
      throw new Error('Verified Snyk jobs page changed materially')
    }

    const payload = await fetchJson(FIRST_PARTY_JOBS_API_URL)
    const jobs = Array.isArray(payload?.data) ? payload.data : null
    if (!payload?.success || !jobs) {
      throw new Error('Snyk jobs API response no longer matches the expected payload')
    }

    if (jobs.length === 0) {
      throw new Error('Verified Snyk jobs API changed materially')
    }

    if (!jobs.every((job) => hasVerifiedWorkdayUrl(job?.url))) {
      throw new Error('Verified Snyk Workday detail URL contract changed materially')
    }

    return extractIndiaJobsFromPayload(payload)
  },
})

export const run = async (options = {}) => createSnykScraper(options).run(options)

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
