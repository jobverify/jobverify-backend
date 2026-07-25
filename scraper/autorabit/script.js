import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://www.autorabit.com/company/careers/'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const toIsoDate = (value) => {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

const inferRemoteStatus = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase() || ''
  if (normalized.includes('hybrid')) return 'Hybrid'
  if (normalized.includes('remote')) return 'Remote'
  return 'On-site'
}

const readJobLocation = (posting = {}) => normalizeWhitespace(
  posting?.jobLocation?.address?.addressLocality,
)

const readJobCountry = (posting = {}) => normalizeWhitespace(
  posting?.jobLocation?.address?.addressCountry,
)

const isIndiaJob = (posting = {}) => /india/i.test(readJobCountry(posting) || '')

const extractJobId = (url) => {
  try {
    const segments = new URL(url).pathname.split('/').filter(Boolean)
    const applyIndex = segments.indexOf('apply')
    return applyIndex >= 0 ? segments[applyIndex + 1] || null : null
  } catch {
    return null
  }
}

const extractJsonLdPostings = (html) => {
  const postings = []

  for (const match of String(html ?? '').matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1])
      const items = Array.isArray(parsed) ? parsed : [parsed]

      for (const item of items) {
        if (item?.['@type'] === 'JobPosting') {
          postings.push(item)
        }
      }
    } catch {
      // Ignore unrelated structured data blocks.
    }
  }

  return postings
}

export const buildSearchUrl = () => CAREER_PAGE_URL

export const extractSearchResults = (html) => extractJsonLdPostings(html)
  .filter(isIndiaJob)
  .map((posting) => {
    const applyUrl = normalizeWhitespace(posting?.url)
    const city = readJobLocation(posting)
    const jobId = extractJobId(applyUrl)

    return {
      title: normalizeWhitespace(posting?.title),
      company: normalizeWhitespace(posting?.hiringOrganization?.name) || 'AutoRABIT',
      department: null,
      location: city ? `${city}, India` : 'India',
      city,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: applyUrl,
      applyUrl,
      employmentType: normalizeWhitespace(posting?.employmentType),
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: toIsoDate(posting?.datePosted),
      closingDate: null,
      jobDescription: normalizeWhitespace(posting?.description),
      remoteStatus: inferRemoteStatus(city),
    }
  })
  .filter((job) => job.title && job.jobId && job.applyUrl)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'autorabit',
  timeoutMs: 15000,
})

export const createAutoRABITScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const html = await fetchText(buildSearchUrl())
    const jobs = extractSearchResults(html)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: 'autorabit',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createAutoRABITScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running AutoRABIT scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'autorabit')
    console.log('DB result:', result)
    process.exit(0)
  }
}
