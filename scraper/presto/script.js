import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { PRESTO_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: PRESTO_CATALOG.source,
  timeoutMs: 15000,
})

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const INLINE_JOB_PATTERN = /title:\s*"([^"]+)"\s*,\s*description:\s*"([^"]+)"\s*,\s*keywords:\s*"([^"]+)"\s*,\s*link:\s*"([^"]+)"/gms

export const SOURCE = PRESTO_CATALOG.source
export const COMPANY = PRESTO_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = PRESTO_CATALOG.officialBrandName
export const VERIFIED_ON = PRESTO_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PRESTO_CATALOG.verifiedSurfaceSummary
export const PROVIDER_METADATA = PRESTO_CATALOG
export const HOMEPAGE_URL = PRESTO_CATALOG.homepageUrl
export const OFFICIAL_CAREERS_URL = PRESTO_CATALOG.companyCareerPage
export const OFFICIAL_JOBS_SCRIPT_URL = PRESTO_CATALOG.officialJobsScriptUrl

export const hasOfficialCareersPageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Careers \| Presto\s*<\/title>/i.test(page)
    && /Join Presto/i.test(normalized)
    && /Current openings/i.test(normalized)
    && /id=["']job-listings["']/i.test(page)
    && /assets\/js\/js-p2023\.js/i.test(page)
}

export const extractLinkedInJobId = (url) => {
  const value = String(url ?? '')
  const queryMatch = value.match(/[?&]pathWildcard=(\d+)/i)
  if (queryMatch) return queryMatch[1]

  const viewMatch = value.match(/\/view\/(\d+)/i)
  return viewMatch?.[1] ?? null
}

export const extractInlineJobPostings = (scriptText) => {
  const jobs = []

  for (const match of String(scriptText ?? '').matchAll(INLINE_JOB_PATTERN)) {
    jobs.push({
      title: match[1],
      description: match[2],
      keywords: match[3],
      link: match[4],
    })
  }

  return jobs
}

const mapPostingToJob = (posting, scrapedAt) => {
  const jobId = extractLinkedInJobId(posting.link) ?? slugify(posting.title)

  return {
    title: posting.title,
    company: COMPANY,
    department: null,
    location: null,
    city: null,
    jobId,
    requisitionId: jobId,
    sourceUrl: posting.link,
    applyUrl: posting.link,
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: posting.description,
    source: SOURCE,
    link: posting.link,
    scrapedAt,
  }
}

export const createPrestoScraper = ({
  now = () => new Date().toISOString(),
  maxJobs = null,
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)
    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Presto official careers page no longer matches the verified public surface')
    }

    const jobsScript = await fetchText(OFFICIAL_JOBS_SCRIPT_URL)
    const postings = extractInlineJobPostings(jobsScript)
    if (postings.length === 0) {
      throw new Error('Presto verified inline job postings array changed materially')
    }

    const scrapedAt = now()
    const jobs = postings.map((posting) => mapPostingToJob(posting, scrapedAt))

    return Number.isInteger(maxJobs) && maxJobs >= 0
      ? jobs.slice(0, maxJobs)
      : jobs
  },
})

export const run = async (options = {}) => createPrestoScraper().run(options)

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
