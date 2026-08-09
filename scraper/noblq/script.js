import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const HOMEPAGE_URL = 'https://www.noblq.com/'
export const ABOUT_US_URL = 'https://www.noblq.com/about-us'
export const CAREERS_PORTAL_URL = 'https://talent.noblq.com/jobs/Careers'
export const CAREERS_API_URL =
  'https://talent.noblq.com/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite'

const COMPANY = 'NoblQ'
const SOURCE = 'noblq'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
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
  const location = [city, state, country].filter(Boolean).join(', ') || null

  return { location, city, state, country }
}

const hasInputWithId = (html, id) => new RegExp(
  `<input\\b(?=[^>]*\\bid=["']${id}["'])[^>]*>`,
  'i',
).test(String(html ?? ''))

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Noblq\s+Global Digital Solutions Partner\s*<\/title>/i.test(page)
    && /reachout@noblq\.com/i.test(page)
    && /\+1\s*972\s*401\s*3771/i.test(page)
    && /href=["'](?:https:\/\/www\.noblq\.com)?\/about-us["']/i.test(page)
    && /href=["'](?:https:\/\/www\.noblq\.com)?\/contact-us["']/i.test(page)
}

export const hasOfficialAboutUsSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*About Noblq\s+Driven by Purpose,\s+Built to Solve\s*<\/title>/i.test(page)
    && /Culture and Careers/i.test(page)
    && /CAREERS FOR CURIOUS PROBLEM SOLVERS/i.test(page)
    && /Explore Opportunities/i.test(page)
    && /https:\/\/talent\.noblq\.com\/jobs\/Careers/i.test(page)
}

export const hasOfficialPortalSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Jobs at NoblQ\s*<\/title>/i.test(page)
    && /Everyone at NoblQ is free to explore and work the way you want\. Come join us!/i.test(page)
    && /meta property=["']og:url["'] content=["']https:\/\/talent\.noblq\.com\/jobs\/Careers["']/i.test(page)
    && /meta property=["']og:site_name["'] content=["']NoblQ["']/i.test(page)
    && hasInputWithId(page, 'pageJson')
    && hasInputWithId(page, 'moduleMeta')
    && hasInputWithId(page, 'jobs')
}

const isIndiaJob = (record = {}) => /india/i.test(normalizeWhitespace(record.Country) || '')
const isPublishedRecord = (record = {}) => record.Publish !== false

export const extractIndiaJobs = (payload) => (
  Array.isArray(payload?.data) ? payload.data : []
)
  .filter((record) => isPublishedRecord(record) && isIndiaJob(record))
  .map((record) => {
    const title = normalizeWhitespace(record.Posting_Title || record.Job_Opening_Name)
    const jobId = normalizeWhitespace(record.id)
    const sourceUrl = normalizeWhitespace(record.$url)
    const { location, city, state, country } = normalizeLocation(record)

    if (!title || !jobId || !sourceUrl || !location || !country) return null

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
      experienceRequired: null,
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

export const createNoblQScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Response is not the verified official NoblQ homepage')
    }

    const aboutUsHtml = await fetchText(ABOUT_US_URL)
    if (!hasOfficialAboutUsSignal(aboutUsHtml)) {
      throw new Error('Response is not the verified official NoblQ about-us careers handoff')
    }

    const portalHtml = await fetchText(CAREERS_PORTAL_URL)
    if (!hasOfficialPortalSignal(portalHtml)) {
      throw new Error('Response is not the verified official NoblQ careers portal')
    }

    const payload = await fetchJson(CAREERS_API_URL)
    if (payload?.code !== 'success' || !Array.isArray(payload?.data)) {
      throw new Error('NoblQ public jobs API no longer returns the verified success payload')
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

export const run = async () => createNoblQScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running NoblQ scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
