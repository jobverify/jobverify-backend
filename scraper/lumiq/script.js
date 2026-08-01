import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

import { LUMIQ_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_PAGE_URL = PROVIDER_METADATA.companyCareerPage
export const CAREERS_PORTAL_URL = PROVIDER_METADATA.officialZohoBoardUrl
export const CAREERS_API_URL = PROVIDER_METADATA.jobsApiUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  const normalized = String(value ?? '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
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

const hasInputWithId = (html, id) => new RegExp(
  `<input\\b(?=[^>]*\\bid=["']${id}["'])[^>]*>`,
  'i',
).test(String(html ?? ''))

export const hasOfficialCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''
  const title = normalizeWhitespace(page.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1])

  return (
    title === 'Lumiq | Succeed in Data Transformation'
    || /https:\/\/lumiq\.zohorecruit\.in\/jobs\/Careers/i.test(page)
  )
    && /See All Open Positions/i.test(normalized)
    && /Apply For All Open Positions/i.test(normalized)
}

const hasBlockedCareersPageSignal = (html = '') => /banned permanently|access denied/i.test(String(html ?? ''))

export const hasOfficialPortalSignal = (html = '') => {
  const page = String(html ?? '')

  return /https:\/\/lumiq\.zohorecruit\.in\/jobs\/Careers/i.test(page)
    && hasInputWithId(page, 'pageJson')
    && hasInputWithId(page, 'moduleMeta')
    && hasInputWithId(page, 'jobs')
}

const isIndiaJob = (record = {}) => /india/i.test(normalizeWhitespace(record.Country) || '')

const buildApplyUrl = (sourceUrl) =>
  sourceUrl?.includes('$apply=true') ? sourceUrl : `${sourceUrl}&$apply=true`

const getLocation = (record = {}) => [record.City, record.State, record.Country]
  .map(normalizeWhitespace)
  .filter(Boolean)
  .join(', ') || null

export const extractIndiaJobs = (payload) => (Array.isArray(payload?.data) ? payload.data : [])
  .filter(isIndiaJob)
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
      applyUrl: buildApplyUrl(sourceUrl),
      employmentType: normalizeEmploymentType(record.Job_Type),
      experienceRequired: normalizeWhitespace(record.Work_Experience),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: String(record.Required_Skills || '')
        .split(',')
        .map(normalizeWhitespace)
        .filter(Boolean),
      postingDate: normalizeWhitespace(record.Date_Opened),
      closingDate: null,
      jobDescription: normalizeWhitespace(record.Job_Description),
      remoteStatus: 'On-site',
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

export const createLumiqScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    let careersHtml = null
    let careersPageBlocked = false
    try {
      careersHtml = await fetchText(CAREERS_PAGE_URL)
    } catch (error) {
      if (!/HTTP 403\b/i.test(String(error?.message || ''))) {
        throw error
      }
      careersPageBlocked = true
    }

    if (
      careersHtml
      && !hasOfficialCareersPageSignal(careersHtml)
      && !hasBlockedCareersPageSignal(careersHtml)
    ) {
      throw new Error('Response is not the verified official Lumiq careers page')
    }

    const portalHtml = await fetchText(CAREERS_PORTAL_URL)
    if (!hasOfficialPortalSignal(portalHtml)) {
      throw new Error('Response is not the verified official Lumiq careers portal')
    }

    if (!careersHtml && !careersPageBlocked) {
      throw new Error('Response is not the verified official Lumiq careers page')
    }

    const payload = await fetchJson(CAREERS_API_URL)
    if (payload?.code !== 'success' || !Array.isArray(payload?.data)) {
      throw new Error('Lumiq public jobs API no longer returns the verified success payload')
    }

    const jobs = extractIndiaJobs(payload)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async () => createLumiqScraper().run()

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
