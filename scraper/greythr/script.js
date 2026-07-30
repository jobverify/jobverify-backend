import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'

import { GREYTHR_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = GREYTHR_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const JOBS_URL = 'https://greytip.greythr.com/hire/jobs/'
export const JOBS_API_URL = 'https://greytip.greythr.com/hire/api/career/published_jobs/'
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  method: 'POST',
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  body: '{}',
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = String(html).replace(/\s+/g, ' ')

  return normalized.includes('Career and Job Opportunities - Greytip Software')
    && normalized.includes('Begin the journey of your success here')
    && /Come,.{0,120}grow with us/i.test(normalized)
    && normalized.includes(JOBS_URL)
}

export const extractGreytHrJobs = (payload = {}) => {
  if (!Array.isArray(payload.data)) return []

  return payload.data
    .filter((job) => job && typeof job.title === 'string' && job.title.trim() && job.apply_url)
    .map((job) => ({
      title: job.title.trim(),
      location: Array.isArray(job.locations) ? job.locations.join(', ') : '',
      country: 'India',
      sourceUrl: JOBS_API_URL,
      applyUrl: job.apply_url,
      jobType: job.job_type || null,
      minExperience: job.min_exp ?? null,
      maxExperience: job.max_exp ?? null,
      experienceUnits: job.experience_units || null,
      postedDate: job.published_on_career_page || job.created_at || null,
    }))
}

export const createGreytHrScraper = () => ({
  async run({ fetchText = defaultFetchText, fetchJson = defaultFetchJson } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified GreytHR careers surface no longer matches the trusted first-party jobs API')
    }

    return extractGreytHrJobs(await fetchJson(JOBS_API_URL))
  },
})

export const run = async (options = {}) => createGreytHrScraper().run(options)

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
