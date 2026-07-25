import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { IZMO_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&#x27;/gi, "'")
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

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return normalized.includes('Careers at izmocars')
    && normalized.includes('Build the Future of Automotive Tech.')
    && normalized.includes('Current Openings.')
    && normalized.includes('Associate Graphic Designer (UK Process)')
    && normalized.includes('Bangalore, India (BTM 2nd Stage)')
}

export const extractJobs = (html = '') => {
  const jobs = []
  const articlePattern = /<article\b[^>]*>([\s\S]*?)<\/article>/gi

  for (const match of html.matchAll(articlePattern)) {
    const cardHtml = match[1]
    const title = normalizeWhitespace(cardHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1])
    const department = normalizeWhitespace(cardHtml.match(/<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/i)?.[1]) || null
    const location = normalizeWhitespace(cardHtml.match(/<p[^>]*>(Bangalore,\s*India\s*\(BTM 2nd Stage\))<\/p>/i)?.[1])
    const employmentLabel = normalizeWhitespace(cardHtml.match(/<p[^>]*>(Full Time)\s*\((?:On-Site|Onsite)\)<\/p>/i)?.[1])
    const detailHref = cardHtml.match(/<a[^>]+href=["']([^"']+)["'][^>]*>\s*View Details\s*<\/a>/i)?.[1]

    if (!title || !location || !detailHref) continue

    const detailUrl = new URL(detailHref, CAREERS_URL).toString()
    const jobId = slugify(title)

    jobs.push({
      title,
      company: COMPANY,
      department,
      location,
      city: 'Bangalore',
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: detailUrl,
      applyUrl: detailUrl,
      employmentType: employmentLabel || null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    })
  }

  return jobs
}

export const createIzmoScraper = ({ maxJobs = Number.POSITIVE_INFINITY } = {}) => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Izmo verified first-party careers page changed materially')
    }

    const jobs = extractJobs(careersHtml)
    if (!jobs.length) {
      throw new Error('Izmo verified first-party careers page changed materially')
    }

    return jobs.slice(0, maxJobs).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
      companyCareerPage: CAREERS_URL,
      companyDomain: PROVIDER_METADATA.companyDomain,
      atsPlatform: PROVIDER_METADATA.atsPlatform,
    }))
  },
})

export const run = async (options = {}) => createIzmoScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
