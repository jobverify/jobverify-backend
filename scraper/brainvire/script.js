import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCity } from '../utils/cityNormalizer.js'
import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREERS_URL = 'https://www.brainvire.com/careers/'
export const COMPANY = 'Brainvire'
export const SOURCE = 'brainvire'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  const normalized = String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const parseLocation = (value) => {
  const location = normalizeWhitespace(value)
  if (!location) return null
  return /india/i.test(location) ? location : `${location}, India`
}

const extractCity = (location) =>
  normalizeCity(normalizeWhitespace(location)?.split(',')[0] || null)

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.brainvire\.com\/careers\/["']/i.test(page)
    && normalized.includes('Current Openings')
    && normalized.includes('Upload Resume')
    && normalized.includes('Find Jobs')
}

export const extractPublicListings = (html) => [...String(html ?? '').matchAll(
  /<li class="opportunity-table-item">[\s\S]*?<p class="(?:\s*h6\s+)?item-title">([\s\S]*?)<\/p>[\s\S]*?<p class="role-detail">([\s\S]*?)<\/p>[\s\S]*?<p class="role-detail">([\s\S]*?)<\/p>[\s\S]*?<p class="role-detail">Number of Openings:\s*(?:<!-- -->)?\s*([\d]+)<\/p>[\s\S]*?aria-label="apply-btn"[\s\S]*?<\/li>/gi,
)]
  .map((match) => {
    const [, rawTitle, rawExperience, rawLocation, rawOpenings] = match
    const title = normalizeWhitespace(rawTitle)
    const experienceRequired = normalizeWhitespace(rawExperience)
    const location = parseLocation(rawLocation)
    const jobId = slugify(title)

    if (!title || !location || !jobId) return null

    const sourceUrl = `${CAREERS_URL}#${jobId}`

    return {
      title,
      company: COMPANY,
      department: null,
      location,
      city: extractCity(location),
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: null,
      experienceRequired,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: `Number of openings: ${normalizeWhitespace(rawOpenings)}`,
      remoteStatus: 'On-site',
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

export const createBrainvireScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Brainvire careers page no longer matches the verified official first-party careers surface')
    }

    const jobs = extractPublicListings(careersHtml)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createBrainvireScraper().run(options)

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
