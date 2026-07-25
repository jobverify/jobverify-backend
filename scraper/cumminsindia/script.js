import { fetchJsonWithRetry } from '../utils/fetch.js'

export const CAREER_PAGE_URL = 'https://cummins.jobs/jobs/'
export const API_ENDPOINT = 'https://prod-search-api.jobsyn.org/api/v1/solr/search'
export const PAGE_SIZE = 25
export const REQUEST_HEADERS = {
  Accept: 'application/json',
  'X-Origin': 'cummins.jobs',
  Referer: 'https://cummins.jobs/',
  'User-Agent': 'Mozilla/5.0 (compatible; Jobify/1.0)',
}

const COMPANY = 'Cummins India'
const SOURCE = 'cumminsindia'

const slugifySegment = (value) => String(value || '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const buildJobUrl = (job) => {
  const locationSlug = slugifySegment(job.location_exact)
  const titleSlug = slugifySegment(job.title_slug)
  const guid = String(job.guid || '').trim()

  if (!locationSlug || !titleSlug || !guid) return null
  return `https://cummins.jobs/${locationSlug}/${titleSlug}/${guid}/job/`
}

const getRemoteStatus = (job) => {
  if (/remote/i.test(job.job_shift || '')) return 'Remote'
  return Array.isArray(job.on_sites) && job.on_sites.includes(0) ? 'On-site' : null
}

export const mapCumminsJob = (job) => {
  const sourceUrl = buildJobUrl(job)
  if (!sourceUrl) return null

  const location = String(job.location_exact || '').trim() || null

  return {
    title: String(job.title_exact || '').trim() || null,
    company: COMPANY,
    department: String(job.job_category || '').trim() || null,
    location,
    city: location?.split(',')[0]?.trim() || null,
    country: job.country_exact || 'India',
    jobId: job.guid || null,
    requisitionId: job.reqid || null,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: job.job_shift || null,
    experienceRequired: job.job_type || null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: job.date_new || job.date_updated || null,
    closingDate: null,
    jobDescription: job.description || null,
    remoteStatus: getRemoteStatus(job),
  }
}

const defaultFetchJson = (url, options) => fetchJsonWithRetry(url, {
  ...options,
  headers: REQUEST_HEADERS,
  label: SOURCE,
})

export const createCumminsIndiaScraper = () => ({
  async run({ fetchJson = defaultFetchJson } = {}) {
    const jobs = []
    let page = 1

    while (true) {
      const url = `${API_ENDPOINT}?page=${page}&location=ind&num_items=${PAGE_SIZE}`
      const payload = await fetchJson(url, { headers: REQUEST_HEADERS })
      const pageJobs = Array.isArray(payload?.jobs) ? payload.jobs : []

      jobs.push(...pageJobs.map(mapCumminsJob).filter(Boolean))

      if (!payload?.pagination?.has_more_pages || pageJobs.length === 0) break
      page += 1
    }

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createCumminsIndiaScraper().run()
