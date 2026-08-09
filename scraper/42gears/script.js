import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { FORTY_TWO_GEARS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = FORTY_TWO_GEARS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const INDIA_LOCATION_PATTERN = /\b(?:india|bengaluru|bangalore|mumbai|rajkot)\b/i

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u2013/g, '–')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const toAbsoluteUrl = (value) => {
  try {
    const url = new URL(value, CAREERS_URL)
    if (url.hostname !== 'www.42gears.com') return null
    return url.toString()
  } catch {
    return null
  }
}

const getParagraphs = (block) => [...String(block ?? '').matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
  .map((match) => normalizeWhitespace(match[1]))
  .filter(Boolean)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title[^>]*>\s*Careers\s*-\s*42Gears Mobility Systems\s*<\/title>/i.test(page)
    && normalized.includes("Let's do something interesting - together.")
    && normalized.includes('Current Openings')
  }

export const extractJobs = (html = '') => {
  const jobs = []

  for (const match of String(html ?? '').matchAll(/<article[^>]*class=["'][^"']*job-card[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi)) {
    const block = match[1]
    const title = normalizeWhitespace(block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1])
    const url = toAbsoluteUrl(block.match(/<a[^>]*href=["']([^"']+)["']/i)?.[1])
    const paragraphs = getParagraphs(block)
    const employmentType = paragraphs[0] || null
    const location = paragraphs[1] || null
    const jobDescription = paragraphs[2] || null
    const experienceRequired = normalizeWhitespace(
      jobDescription?.match(
        /Relevant Experience:\s*(.*?)(?:\s+(?:Responsibilities?|Roles and Responsibilities|Core Responsibilities)\b|$)/i,
      )?.[1],
    ) || null

    if (!title || !url || !location || !INDIA_LOCATION_PATTERN.test(location)) continue

    jobs.push({
      title,
      company: COMPANY,
      department: null,
      location,
      city: normalizeWhitespace(location.split(',')[0]),
      country: 'India',
      jobId: slugify(title),
      requisitionId: slugify(title),
      sourceUrl: url,
      applyUrl: url,
      employmentType,
      experienceRequired,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription,
      remoteStatus: 'On-site',
    })
  }

  return jobs
}

export const create42GearsScraper = ({ maxJobs = null } = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified 42Gears Mobility Systems careers surface no longer matches the trusted first-party page')
    }

    const jobs = extractJobs(careersHtml)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => create42GearsScraper().run(options)

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
