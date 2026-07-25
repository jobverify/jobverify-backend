import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { CADSYS_CATALOG as PROVIDER_METADATA } from './catalog.js'

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
  const normalized = normalizeWhitespace(html)
  return normalized.includes('Careers')
    && normalized.includes('next generation work platform')
    && normalized.includes('Senior Data Scientist')
    && normalized.includes('Software Engineer, Backend')
    && normalized.includes('Software Engineer, Frontend')
    && normalized.includes('Remote / Hybrid')
  }

export const extractJobs = (html = '') => {
  const jobs = []
  const seen = new Set()
  const rolePattern = /<a[^>]+href=["']([^"']+)["'][^>]*>\s*([^<]+?)\s*<span>\s*(Remote\s*\/\s*Hybrid)\s*<\/span>\s*<\/a>/gi

  for (const match of html.matchAll(rolePattern)) {
    const title = normalizeWhitespace(match[2])
    const location = normalizeWhitespace(match[3])
    const detailUrl = new URL(match[1], CAREERS_URL).toString()
    const jobId = slugify(title)

    if (!title || seen.has(jobId)) continue
    seen.add(jobId)

    jobs.push({
      title,
      company: COMPANY,
      department: null,
      location,
      city: null,
      country: null,
      jobId,
      requisitionId: jobId,
      sourceUrl: detailUrl,
      applyUrl: detailUrl,
      employmentType: null,
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

export const createCadsysScraper = ({ maxJobs = Number.POSITIVE_INFINITY } = {}) => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Cadsys verified first-party careers page changed materially')
    }

    const jobs = extractJobs(careersHtml)
    if (!jobs.length) {
      throw new Error('Cadsys verified first-party careers page changed materially')
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

export const run = async (options = {}) => createCadsysScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
