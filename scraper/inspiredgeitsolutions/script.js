import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { INSPIREDGE_IT_SOLUTIONS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = INSPIREDGE_IT_SOLUTIONS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&rsquo;/gi, "'")
  .replace(/&nbsp;/gi, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

const LOCATION_MAP = {
  hyderabad: {
    location: 'Hyderabad, Telangana, India',
    city: 'Hyderabad',
    remoteStatus: 'On-site',
  },
  remote: {
    location: 'Remote, India',
    city: null,
    remoteStatus: 'Remote',
  },
}

const normalizeLocation = (value) => {
  const raw = normalizeWhitespace(value)
  const key = raw.toLowerCase()

  if (LOCATION_MAP[key]) return LOCATION_MAP[key]

  return {
    location: raw ? `${raw}, India` : 'India',
    city: raw || null,
    remoteStatus: 'On-site',
  }
}

export const hasOfficialJobsArchiveSignal = (html = '') => {
  const page = String(html ?? '')

  return /<title>\s*Jobs Archive\s*-\s*Inspiredge IT Solutions\s*<\/title>/i.test(page)
    && /Job Archives/i.test(page)
    && /Telecom Analyst/i.test(page)
    && /Python Developer/i.test(page)
    && /Cisco IPT\s*-\s*T2/i.test(page)
    && /Apply Now/i.test(page)
}

export const extractJobs = (html = '') => {
  const jobs = []

  for (const match of String(html ?? '').matchAll(
    /<article[^>]*class=["'][^"']*job-card[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi,
  )) {
    const block = match[1]
    const title = normalizeWhitespace(block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1])
    const href = block.match(/<a[^>]+href=["']([^"']+)["'][^>]*>\s*Apply Now\s*<\/a>/i)?.[1]
    const department = normalizeWhitespace(block.match(/<p[^>]*class=["']department["'][^>]*>([\s\S]*?)<\/p>/i)?.[1]) || null
    const locationValue = normalizeWhitespace(block.match(/<p[^>]*class=["']location["'][^>]*>([\s\S]*?)<\/p>/i)?.[1])
    const posted = normalizeWhitespace(block.match(/<p[^>]*class=["']posted["'][^>]*>([\s\S]*?)<\/p>/i)?.[1]) || null
    const jobId = slugify(title)

    if (!title || !href || !locationValue || !jobId) continue

    const normalizedLocation = normalizeLocation(locationValue)
    const sourceUrl = new URL(href, CAREERS_URL).toString()

    jobs.push({
      title,
      company: COMPANY,
      department,
      location: normalizedLocation.location,
      city: normalizedLocation.city,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: posted,
      remoteStatus: normalizedLocation.remoteStatus,
    })
  }

  return jobs
}

export const createInspiredgeItSolutionsScraper = ({ maxJobs = null } = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const jobsArchiveHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialJobsArchiveSignal(jobsArchiveHtml)) {
      throw new Error(
        'The verified Inspiredge IT Solutions jobs archive no longer matches the trusted first-party page',
      )
    }

    const jobs = extractJobs(jobsArchiveHtml)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createInspiredgeItSolutionsScraper().run(options)

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
