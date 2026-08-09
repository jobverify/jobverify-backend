import path from 'node:path'
import { fileURLToPath } from 'node:url'

import COUPA_SOFTWARE_INC_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = COUPA_SOFTWARE_INC_CATALOG.source
export const COMPANY = COUPA_SOFTWARE_INC_CATALOG.companyName
export const JOBS_PAGE_URL = COUPA_SOFTWARE_INC_CATALOG.jobsPageUrl
export const VERIFIED_ON = COUPA_SOFTWARE_INC_CATALOG.verifiedOn

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobverify scraper)'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(String(value ?? '').replace(/<[^>]+>/g, ' '))

const normalizeUrl = (value) => {
  try {
    const url = new URL(String(value), JOBS_PAGE_URL)
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

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

const buildJobId = (title, sourceUrl) => {
  const titleMatch = String(title ?? '').match(/-\s*(\d+)\s*$/)
  if (titleMatch) return titleMatch[1]

  const urlMatch = String(sourceUrl ?? '').match(/(\d+)(?:\/)?$/)
  return urlMatch?.[1] ?? null
}

export const hasOfficialJobsPageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /<title>\s*(?:Shape your career at Coupa|Jobs)\s*-\s*Explore opportunities to make an impact\.\s*\|\s*Coupa Careers\s*<\/title>/i.test(page)
    && text.includes('Shape your career at Coupa')
    && (
      /Displaying\s+\d+\s+to\s+\d+\s+of\s+\d+\s+matching\s+jobs/i.test(text)
      || /class=["'][^"']*js-card-job[^"']*["']/i.test(page)
    )
}

const extractLegacyIndiaJobsFromPage = (html = '') => Array.from(
  String(html ?? '').matchAll(
    /<article\b[^>]*>[\s\S]*?<h2>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h2>[\s\S]*?<li>([\s\S]*?)<\/li>[\s\S]*?<li>([\s\S]*?)<\/li>(?:[\s\S]*?<li>([\s\S]*?)<\/li>)?/gi,
  ),
  (match) => {
    const sourceUrl = normalizeUrl(match[1])
    const title = stripTags(match[2])
    const location = stripTags(match[3])
    const department = stripTags(match[4])
    const employmentType = stripTags(match[5])
    const jobId = buildJobId(title, sourceUrl)

    return {
      title,
      location,
      department,
      employmentType,
      sourceUrl,
      jobId,
    }
  },
).filter((job) => job.title && /,\s*India$/i.test(job.location || '') && job.sourceUrl && job.jobId)

const extractCardGridIndiaJobsFromPage = (html = '') => Array.from(
  String(html ?? '').matchAll(
    /<div\b[^>]*class=["'][^"']*js-card-job[^"']*["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*aria-label=["'][^"']*View job:\s*([^"']+)["'][^>]*>\s*<\/a>[\s\S]*?<ul[^>]*class=["'][^"']*job-meta[^"']*["'][^>]*>([\s\S]*?)<\/ul>/gi,
  ),
  (match) => {
    const sourceUrl = normalizeUrl(match[1])
    const title = stripTags(match[2])
    const metaItems = [...String(match[3] ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
      .map((item) => stripTags(item[1]))
      .filter(Boolean)
    const [location = null, department = null, employmentType = null] = metaItems
    const jobId = buildJobId(title, sourceUrl)

    return {
      title,
      location,
      department,
      employmentType,
      sourceUrl,
      jobId,
    }
  },
).filter((job) => job.title && /,\s*India$/i.test(job.location || '') && job.sourceUrl && job.jobId)

export const extractIndiaJobsFromPage = (html = '') => {
  const jobs = extractLegacyIndiaJobsFromPage(html)
  if (jobs.length > 0) return jobs

  return extractCardGridIndiaJobsFromPage(html)
}

export const extractPaginationUrls = (html = '') => {
  const urls = new Set()

  for (const match of String(html ?? '').matchAll(/<a[^>]+href=["']([^"']*page=\d+[^"']*)["'][^>]*>/gi)) {
    const normalized = normalizeUrl(match[1])
    if (normalized && normalized !== JOBS_PAGE_URL) {
      urls.add(normalized)
    }
  }

  return [...urls]
}

const extractCity = (location) => normalizeWhitespace(String(location ?? '').replace(/,\s*India$/i, ''))

const normalizeJob = (job, scrapedAt) => ({
  title: job.title,
  company: COMPANY,
  department: job.department,
  location: job.location,
  city: extractCity(job.location),
  country: 'India',
  jobId: job.jobId,
  requisitionId: job.jobId,
  sourceUrl: job.sourceUrl,
  applyUrl: job.sourceUrl,
  employmentType: job.employmentType,
  experienceRequired: null,
  minimumQualification: null,
  preferredQualification: null,
  requiredSkills: [],
  postingDate: null,
  closingDate: null,
  jobDescription: null,
  remoteStatus: job.employmentType === 'Remote' ? 'Remote' : job.employmentType || null,
  source: SOURCE,
  link: job.sourceUrl,
  scrapedAt,
  companyCareerPage: JOBS_PAGE_URL,
  companyDomain: COUPA_SOFTWARE_INC_CATALOG.companyDomain,
  atsPlatform: COUPA_SOFTWARE_INC_CATALOG.atsPlatform,
})

export const createCoupaSoftwareIncScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const firstPage = await fetchText(JOBS_PAGE_URL)
    if (!hasOfficialJobsPageSignal(firstPage)) {
      throw new Error('The verified Coupa jobs page no longer matches the trusted first-party surface')
    }

    const visited = new Set([JOBS_PAGE_URL])
    const queue = extractPaginationUrls(firstPage)
    const jobs = extractIndiaJobsFromPage(firstPage)

    while (queue.length > 0) {
      const nextUrl = queue.shift()
      if (!nextUrl || visited.has(nextUrl)) continue
      visited.add(nextUrl)
      const html = await fetchText(nextUrl)
      for (const job of extractIndiaJobsFromPage(html)) {
        if (!jobs.some((existing) => existing.jobId === job.jobId)) {
          jobs.push(job)
        }
      }
    }

    return jobs.map((job) => normalizeJob(job, now()))
  },
})

export const run = async (options = {}) => createCoupaSoftwareIncScraper(options).run(options)

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
