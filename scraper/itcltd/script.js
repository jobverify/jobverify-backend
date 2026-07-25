import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'itcltd'
export const COMPANY = 'ITC Limited'
export const HOMEPAGE_URL = 'https://itcportal.com/'
export const CAREERS_PORTAL_URL = 'https://recruitment.itcportal.com/jobs/Careers'
export const CAREERS_API_URL =
  'https://recruitment.itcportal.com/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/•/g, ' ')
    .replace(/\u00a0/g, ' ')
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

const isTruthyRemoteJob = (value) => value === true || /^(?:yes|true|1)$/i.test(String(value ?? '').trim())

const sanitizeLocationPart = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const spillTokens = [
    'Key Responsibilities',
    'Job Purpose',
    'Responsibilities',
    'Requirements',
    'Role',
  ]

  for (const token of spillTokens) {
    const index = normalized.indexOf(token)
    if (index > 0) {
      return normalizeWhitespace(normalized.slice(0, index))
    }
  }

  return normalized
}

const buildLocation = (record = {}) => {
  const city = sanitizeLocationPart(record.City)
  const state = sanitizeLocationPart(record.State)
  const country = sanitizeLocationPart(record.Country)

  const location = [city, state, country].filter(Boolean).join(', ')
    || (isTruthyRemoteJob(record.Remote_Job) ? 'Remote' : null)

  return { location, city, state, country }
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return normalized?.includes('ITC Ltd has diversified presence in FMCG, Paperboards & Packaging, Agri-business and IT')
    && /href=["'][^"']*\/careers\.html["']/i.test(page)
}

export const hasOfficialPortalSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Careers(?: at ITC)?\s*<\/title>/i.test(page)
    && normalized?.includes('Current Openings')
    && normalized?.includes('Careers at ITC')
    && normalized?.includes('View Current Openings')
    && /https:\/\/recruitment\.itcportal\.com\/jobs\/Careers/i.test(page)
    && /<input\b(?=[^>]*\bid=["']pageJson["'])[^>]*>/i.test(page)
    && /<input\b(?=[^>]*\bid=["']moduleMeta["'])[^>]*>/i.test(page)
    && /<input\b(?=[^>]*\bid=["']jobs["'])[^>]*>/i.test(page)
}

const isPublishedRecord = (record = {}) => record.Publish !== false

export const extractIndiaJobs = (payload) => (Array.isArray(payload?.data) ? payload.data : [])
  .filter((record) => isPublishedRecord(record))
  .map((record) => {
    const title = normalizeWhitespace(record.Posting_Title || record.Job_Opening_Name)
    const jobId = normalizeWhitespace(record.id)
    const sourceUrl = normalizeWhitespace(record.$url)
    const { location, city, state, country } = buildLocation(record)

    if (!title || !jobId || !sourceUrl || !location) return null

    return {
      title,
      company: COMPANY,
      department: normalizeWhitespace(record.ITC_Business) || normalizeWhitespace(record.Industry) || null,
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
      remoteStatus: isTruthyRemoteJob(record.Remote_Job) ? 'Remote' : 'On-site',
    }
  })
  .filter(Boolean)

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
    Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createItcLtdScraper = ({
  maxJobs = null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('ITC homepage no longer matches the verified official careers handoff')
    }

    const portalHtml = await fetchText(CAREERS_PORTAL_URL)
    if (!hasOfficialPortalSignal(portalHtml)) {
      throw new Error('ITC careers portal no longer matches the verified official public surface')
    }

    const payload = await fetchJson(CAREERS_API_URL)
    if (payload?.code !== 'success' || !Array.isArray(payload?.data)) {
      throw new Error('ITC public jobs API no longer returns the verified success payload')
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

export const run = async (options = {}) => createItcLtdScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
