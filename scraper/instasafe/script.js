import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

import { INSTASAFE_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = INSTASAFE_CATALOG.source
export const COMPANY = INSTASAFE_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = INSTASAFE_CATALOG.officialBrandName
export const VERIFIED_ON = INSTASAFE_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = INSTASAFE_CATALOG.verifiedSurfaceSummary
export const PROVIDER_METADATA = INSTASAFE_CATALOG
export const HOMEPAGE_URL = INSTASAFE_CATALOG.homepageUrl
export const CAREERS_PAGE_URL = INSTASAFE_CATALOG.careersPageUrl
export const CAREERS_PORTAL_URL = INSTASAFE_CATALOG.careersPortalUrl
export const CAREERS_API_URL = INSTASAFE_CATALOG.careersApiUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (/intern/.test(normalized)) return 'Internship'
  if (/contract|consultant/.test(normalized)) return 'Contract'
  if (/part.?time/.test(normalized)) return 'Part-time'
  if (/full.?time/.test(normalized)) return 'Full-time'
  return normalizeWhitespace(value)
}

const hasInputWithId = (html, id) =>
  new RegExp(`<input\\b(?=[^>]*\\bid=["']${id}["'])[^>]*>`, 'i').test(String(html ?? ''))

const isIndiaJob = (record = {}) => /india/i.test(normalizeWhitespace(record.Country) || '')

const getLocation = (record = {}) => [record.City, record.State, record.Country]
  .map(normalizeWhitespace)
  .filter(Boolean)
  .join(', ') || null

export const hasOfficialCareersPageSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Instasafe Careers \| Instasafe Jobs\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/instasafe\.com\/careers\/["']/i.test(page)
    && /Grow with InstaSafe/i.test(page)
    && /Our Openings/i.test(page)
    && /rec_job_listing_div/i.test(page)
}

export const hasOfficialPortalSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Jobs at Instasafe Technologies Pvt Ltd\s*<\/title>/i.test(page)
    && /meta property=["']og:url["'] content=["']https:\/\/instasafe\.zohorecruit\.com\/jobs\/Careers["']/i.test(page)
    && hasInputWithId(page, 'pageJson')
    && hasInputWithId(page, 'moduleMeta')
    && hasInputWithId(page, 'jobs')
}

export const extractIndiaJobs = (payload) => (Array.isArray(payload?.data) ? payload.data : [])
  .filter((record) => isIndiaJob(record))
  .map((record) => {
    const title = normalizeWhitespace(record.Posting_Title || record.Job_Opening_Name)
    const city = normalizeWhitespace(record.City)
    const state = normalizeWhitespace(record.State)
    const country = normalizeWhitespace(record.Country)
    const jobId = normalizeWhitespace(record.id)
    const sourceUrl = normalizeWhitespace(record.$url)
    const location = getLocation(record)

    if (!title || !country || !jobId || !sourceUrl || !location) return null

    return {
      title,
      company: COMPANY,
      department: null,
      location,
      city,
      state,
      country,
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: normalizeEmploymentType(record.Job_Type),
      experienceRequired: normalizeWhitespace(record.Work_Experience),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: normalizeWhitespace(record.Date_Opened),
      closingDate: null,
      jobDescription: normalizeWhitespace(record.Job_Description),
      remoteStatus: record.Remote_Job ? 'Remote' : 'On-site',
    }
  })
  .filter(Boolean)

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.text()
}

const defaultFetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain,*/*',
    },
  })

  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.json()
}

export const createInstaSafeScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
  } = {}) {
    const careersPageHtml = await fetchText(CAREERS_PAGE_URL)
    if (!hasOfficialCareersPageSignal(careersPageHtml)) {
      throw new Error('Response is not the verified official InstaSafe careers page')
    }

    const portalHtml = await fetchText(CAREERS_PORTAL_URL)
    if (!hasOfficialPortalSignal(portalHtml)) {
      throw new Error('Response is not the verified official InstaSafe careers portal')
    }

    const payload = await fetchJson(CAREERS_API_URL)
    if (payload?.code !== 'success' || !Array.isArray(payload?.data)) {
      throw new Error('InstaSafe public jobs API no longer returns the verified success payload')
    }

    const jobs = extractIndiaJobs(payload)
    const selectedJobs = Number.isInteger(maxJobs) ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createInstaSafeScraper().run(options)

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
