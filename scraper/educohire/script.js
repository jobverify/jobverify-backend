import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const HOMEPAGE_URL = 'https://www.educohire.com/'
export const CAREERS_PORTAL_URL = 'https://job.educohire.com/jobs/Careers'
export const CAREERS_API_URL =
  'https://educohire.zohorecruit.com/recruit/v2/public/Job_Openings?source=CareerSite&pagename=Careers'

const COMPANY = 'EducoHire'
const SOURCE = 'educohire'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(value)
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

const normalizeLocation = (record = {}) => {
  const city = normalizeWhitespace(record.City)
  const state = normalizeWhitespace(record.State)
  const country = normalizeWhitespace(record.Country)
  const parts = [city, state, country].filter(Boolean)

  return {
    city,
    state,
    country,
    location: parts.length > 0 ? parts.join(', ') : null,
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  return /Find your dream job with EducoHire/i.test(page)
    && /Search Jobs/i.test(page)
    && /job\.educohire\.com/i.test(page)
}

export const hasOfficialPortalSignal = (html) => {
  const page = String(html ?? '')
  return /educohire\.zohorecruit\.com\/jobs\/Careers\/rss/i.test(page)
    && /create-job-alert/i.test(page)
    && /var clientSessionData/i.test(page)
}

const isIndiaJob = (record = {}) => /india/i.test(normalizeWhitespace(record.Country) || '')

export const extractIndiaJobs = (payload) => (
  Array.isArray(payload?.data) ? payload.data : []
)
  .filter((record) => isIndiaJob(record))
  .map((record) => {
    const title = normalizeWhitespace(record.Posting_Title || record.Job_Opening_Name)
    const jobId = normalizeWhitespace(record.id)
    const sourceUrl = normalizeWhitespace(record.$url)
    const department = normalizeWhitespace(record.Segment)
    const experienceRequired = normalizeWhitespace(record.Work_Experience)
    const postingDate = normalizeWhitespace(record.Date_Opened)
    const jobDescription = normalizeWhitespace(record.Job_Description)
    const { city, state, country, location } = normalizeLocation(record)

    if (!title || !jobId || !sourceUrl || !location) return null

    return {
      title,
      company: COMPANY,
      department,
      location,
      city,
      state,
      country,
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: normalizeEmploymentType(record.Job_Type),
      experienceRequired,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate,
      closingDate: null,
      jobDescription,
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

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

const defaultFetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain,*/*',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const createEducohireScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('EducoHire homepage no longer matches the verified official careers entry surface')
    }

    const portalHtml = await fetchText(CAREERS_PORTAL_URL)
    if (!hasOfficialPortalSignal(portalHtml)) {
      throw new Error('EducoHire careers portal no longer matches the verified official Zoho Recruit surface')
    }

    const payload = await fetchJson(CAREERS_API_URL)
    if (payload?.code !== 'success' || !Array.isArray(payload?.data)) {
      throw new Error('EducoHire public jobs API no longer returns the verified success payload')
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

export const run = async () => createEducohireScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running EducoHire scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, SOURCE)
    console.log('DB result:', result)
    process.exit(0)
  }
}
