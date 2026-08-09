import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { VELANINFOSERVICES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = VELANINFOSERVICES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OVERVIEW_URL = 'https://www.velaninfo.com/careers/'
export const JOBS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

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

  return normalized.includes('Career Opportunities')
    && normalized.includes('Current Openings')
    && normalized.includes('Build Your Dream Career with Velan')
    && page.includes(JOBS_URL)
}

export const hasOfficialJobsSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('Join Our Team')
    && normalized.includes('Current Openings')
    && normalized.includes('careers@velaninfo.com')
    && normalized.includes('Posted on:')
    && normalized.includes('Apply Now')
}

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

export const extractJobs = (html = '') => {
  const jobs = []
  const pattern = /<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<ul>([\s\S]*?)<\/ul>[\s\S]*?<p class=["']cpst["']>\s*Posted on:\s*([^<]+)<\/p>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>[\s\S]*?Apply Now[\s\S]*?<\/a>/gi

  for (const match of String(html ?? '').matchAll(pattern)) {
    const rawHeading = match[1]
    const heading = normalizeWhitespace(rawHeading)
    const metaItems = [...String(match[2] ?? '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
      .map((item) => normalizeWhitespace(item[1]))
      .filter((item) => item && item !== '|')
    const postedOn = normalizeWhitespace(match[3])
    const applyUrl = new URL(match[4], JOBS_URL).toString()
    const title = normalizeWhitespace(heading.replace(/\s*\(JOB ID:[\s\S]*$/i, ''))
    const jobId = rawHeading.match(/\(JOB ID:\s*([^)]+)\)/i)?.[1]?.trim() || slugify(title)
    const experienceRequired = metaItems
      .find((item) => /^Experience:/i.test(item))
      ?.replace(/^Experience:\s*/i, '')
      ?.trim() || null
    const city = metaItems
      .find((item) => /^Location:/i.test(item))
      ?.replace(/^Location:\s*/i, '')
      ?.trim() || null
    const description = metaItems[0] || null

    if (!title || !city) continue

    jobs.push({
      title,
      company: COMPANY,
      department: null,
      location: `${city}, India`,
      city,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: JOBS_URL,
      applyUrl,
      employmentType: 'Full-time',
      experienceRequired,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: postedOn || null,
      closingDate: null,
      jobDescription: description,
    })
  }

  return jobs
}

export const createVelanInfoServicesScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow = now } = {}) {
    const careersHtml = await fetchText(OVERVIEW_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Velan Info Services verified careers page no longer links to the trusted current openings surface')
    }

    const html = await fetchText(JOBS_URL)
    if (!hasOfficialJobsSignal(html)) {
      throw new Error('Velan Info Services verified first-party current openings page changed materially')
    }

    const jobs = extractJobs(html)
    if (jobs.length === 0) {
      throw new Error('Velan Info Services verified current openings page no longer exposes trusted jobs')
    }

    const scrapedAt = overrideNow()
    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt,
    }))
  },
})

export const run = async (options = {}) => createVelanInfoServicesScraper(options).run(options)

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
