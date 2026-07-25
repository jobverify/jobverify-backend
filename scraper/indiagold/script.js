import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'indiagold'
export const COMPANY = 'Indiagold'
export const VERIFIED_ON = '2026-07-16'
export const HOMEPAGE_URL = 'https://indiagold.co/'
export const CAREERS_PAGE_URL = 'https://indiagold.co/join-us'
export const CAREERS_API_URL =
  'https://indiagold.zohorecruit.in/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite&extra_fields=%5B%22State%22%2C%22Salary%22%2C%22Industry%22%5D'
export const GENERAL_APPLICATION_FORM_URL =
  'https://indiagold.zohorecruit.in/forms/38b7f90a5d50181c7e90b5fb206f7906c671dc7d5b1e459876d880446809e996'
export const PROVIDER_METADATA = {
  source: SOURCE,
  companyCareerPage: CAREERS_PAGE_URL,
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) =>
  String(value ?? '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')

const stripHtml = (value) => decodeHtmlEntities(String(value ?? '').replace(/<[^>]+>/g, ' '))

const normalizeWhitespace = (value) => {
  const normalized = stripHtml(value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
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

const isPublishedRecord = (record = {}) => record.Publish !== false
const isUnlockedRecord = (record = {}) => record.Is_Locked !== true && record.Locked !== true
const isIndiaJob = (record = {}) => /india/i.test(normalizeWhitespace(record.Country) || '')

const getLocationParts = (record = {}) =>
  [record.City, record.State, record.Country]
    .map(normalizeWhitespace)
    .filter(Boolean)

export const hasOfficialCareersPageSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*indiagold\s*-\s*join us\s*<\/title>/i.test(page)
    && /SEE ALL POSITIONS/i.test(page)
    && /careers@indiagold\.co/i.test(page)
    && /seeAllPosition|Open Opportunities/i.test(page)
}

export const extractIndiaJobs = (payload) =>
  (Array.isArray(payload?.data) ? payload.data : [])
    .filter((record) => isIndiaJob(record) && isPublishedRecord(record) && isUnlockedRecord(record))
    .map((record) => {
      const title = normalizeWhitespace(record.Posting_Title || record.Job_Opening_Name)
      const jobId = normalizeWhitespace(record.id)
      const sourceUrl = normalizeWhitespace(record.$url)
      const locationParts = getLocationParts(record)
      const location = locationParts.join(', ') || null
      const city = normalizeWhitespace(record.City)
      const state = normalizeWhitespace(record.State)
      const country = normalizeWhitespace(record.Country)

      if (!title || !jobId || !sourceUrl || !country || !location) {
        return null
      }

      return {
        title,
        company: COMPANY,
        department: normalizeWhitespace(record.Industry || record.Department),
        location,
        city,
        state,
        country,
        jobId,
        requisitionId: jobId,
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: normalizeEmploymentType(record.Job_Type),
        experienceRequired: normalizeWhitespace(record.Work_Experience || record.Experience),
        minimumQualification: normalizeWhitespace(record.Minimum_Qualification),
        preferredQualification: normalizeWhitespace(record.Preferred_Qualification),
        requiredSkills: String(record.Required_Skills || '')
          .split(',')
          .map(normalizeWhitespace)
          .filter(Boolean),
        postingDate: normalizeWhitespace(record.Date_Opened),
        closingDate: normalizeWhitespace(record.Target_Date_to_Fill),
        jobDescription: normalizeWhitespace(record.Job_Description),
        remoteStatus: record.Remote_Job ? 'Remote' : 'On-site',
      }
    })
    .filter(Boolean)

const defaultFetchText = (url) =>
  fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    label: SOURCE,
    timeoutMs: 15000,
  })

const defaultFetchJson = (url) =>
  fetchJsonWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain,*/*',
    },
    label: SOURCE,
    timeoutMs: 15000,
  })

export const createIndiagoldScraper = ({ maxJobs = null } = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    const careersPageHtml = await fetchText(CAREERS_PAGE_URL)
    if (!hasOfficialCareersPageSignal(careersPageHtml)) {
      throw new Error('Response is not the verified official Indiagold careers page')
    }

    const payload = await fetchJson(CAREERS_API_URL)
    if (payload?.code !== 'success' || !Array.isArray(payload?.data)) {
      throw new Error('Indiagold public jobs API no longer returns the verified success payload')
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

export const run = async () => createIndiagoldScraper().run()

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
