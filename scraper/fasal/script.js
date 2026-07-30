import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const COMPANY_NAME = 'Fasal'
export const SOURCE = 'fasal'
export const OFFICIAL_CAREERS_URL = 'https://www.fasal.co/life-at-fasal'
export const CAREERS_PORTAL_URL = 'https://jobs.fasal.co/jobs/Careers'
export const CAREERS_API_URL =
  'https://jobs.fasal.co/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite'

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => {
  const normalized = String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

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

export const hasOfficialCareersPageSignal = (html = '') => {
  const page = String(html ?? '')

  return /join us in bringing a new era to indian agriculture/i.test(page)
    && /href=["']https:\/\/jobs\.fasal\.co\/jobs\/Careers["']/i.test(page)
    && /view vacancies/i.test(page)
}

const hasInputWithId = (html, id) => new RegExp(
  `<input\\b(?=[^>]*\\bid=["']${id}["'])[^>]*>`,
  'i',
).test(String(html ?? ''))

export const hasOfficialPortalSignal = (html = '') => {
  const page = String(html ?? '')

  return /<title>\s*Jobs at PeoplePlus\s*<\/title>/i.test(page)
    && /meta property=["']og:url["'] content=["']https:\/\/jobs\.fasal\.co\/jobs\/Careers["']/i.test(page)
    && /meta property=["']og:site_name["'] content=["']Wolkus Technology Solutions Private Limited["']/i.test(page)
    && hasInputWithId(page, 'pageJson')
    && hasInputWithId(page, 'moduleMeta')
    && hasInputWithId(page, 'jobs')
}

export const extractIndiaJobs = (payload) => {
  if (payload?.code !== 'success' || !Array.isArray(payload?.data)) {
    throw new Error('Fasal public jobs API no longer returns the verified success payload')
  }

  return payload.data
    .filter((record) => /india/i.test(normalizeWhitespace(record.Country) || ''))
    .map((record) => {
      const title = normalizeWhitespace(record.Posting_Title || record.Job_Opening_Name)
      const city = normalizeWhitespace(record.City)
      const state = normalizeWhitespace(record.State)
      const country = normalizeWhitespace(record.Country)
      const jobId = normalizeWhitespace(record.id)
      const sourceUrl = normalizeWhitespace(record.$url)
      const location = [city, state, country].filter(Boolean).join(', ') || null

      if (!title || !country || !jobId || !sourceUrl || !location) return null

      return {
        title,
        company: COMPANY_NAME,
        department: normalizeWhitespace(record.Department || record.Industry),
        location,
        city,
        state,
        country,
        jobId,
        requisitionId: jobId,
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: normalizeWhitespace(record.Job_Type),
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
}

export const createFasalScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    const officialCareersHtml = await fetchText(OFFICIAL_CAREERS_URL)
    if (!hasOfficialCareersPageSignal(officialCareersHtml)) {
      throw new Error('Response is not the verified official Fasal careers page')
    }

    const portalHtml = await fetchText(CAREERS_PORTAL_URL)
    if (!hasOfficialPortalSignal(portalHtml)) {
      throw new Error('Response is not the verified official Fasal careers portal')
    }

    const payload = await fetchJson(CAREERS_API_URL)
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

export const run = async (options = {}) => createFasalScraper().run(options)

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
