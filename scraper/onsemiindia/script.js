import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'onsemiindia'
export const COMPANY_NAME = 'onsemi India'
export const CORPORATE_CAREERS_URL = 'https://www.onsemi.com/careers'
export const CANDIDATE_EXPERIENCE_URL =
  'https://hctz.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/jobs'
export const LISTING_API_BASE_URL =
  'https://hctz.fa.us2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions'
export const PUBLIC_JOBS_BASE_URL =
  'https://hctz.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/job/'
export const SITE_NUMBER = 'CX_1001'
export const DEFAULT_LIMIT = 24

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = String(value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
  return normalized || null
}

const isIndiaLocation = (value) => /(?:^|,)\s*india\s*$/i.test(String(value || ''))

const getRequisitionList = (payload) => {
  if (Array.isArray(payload?.items)) {
    return payload.items.flatMap((item) => (
      Array.isArray(item?.requisitionList) ? item.requisitionList : []
    ))
  }
  return Array.isArray(payload?.requisitionList) ? payload.requisitionList : []
}

const getLocation = (record = {}) => {
  if (normalizeWhitespace(record.PrimaryLocationCountry)?.toUpperCase() === 'IN') {
    return normalizeWhitespace(record.PrimaryLocation)
  }
  return record.secondaryLocations?.find((location) => (
    location?.CountryCode === 'IN' || isIndiaLocation(location?.Name)
  ))?.Name || null
}

export const buildSearchUrl = ({ page = 0, limit = DEFAULT_LIMIT } = {}) => {
  const normalizedLimit = Number(limit) || DEFAULT_LIMIT
  const offset = Math.max(0, Number(page) || 0) * normalizedLimit
  return `${LISTING_API_BASE_URL}?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=${SITE_NUMBER},limit=${normalizedLimit},offset=${offset},location=India`
}

export const buildJobDetailUrl = (jobId) => `${PUBLIC_JOBS_BASE_URL}${jobId}`

export const extractSearchResults = (payload) => getRequisitionList(payload)
  .filter((record) => {
    const location = getLocation(record)
    return normalizeWhitespace(record.PrimaryLocationCountry)?.toUpperCase() === 'IN'
      || isIndiaLocation(location)
  })
  .map((record) => {
    const jobId = normalizeWhitespace(record.Id)
    const location = normalizeWhitespace(getLocation(record))
    const detailUrl = jobId ? buildJobDetailUrl(jobId) : null
    return {
      title: normalizeWhitespace(record.Title),
      company: COMPANY_NAME,
      location,
      city: location?.split(',')[0]?.trim() || null,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: detailUrl,
      applyUrl: detailUrl,
      department: normalizeWhitespace(record.Organization || record.Department || record.JobFunction),
      employmentType: normalizeWhitespace(record.JobSchedule || record.JobType || record.WorkerType),
      postingDate: normalizeWhitespace(record.ExternalPostedStartDate || record.PostedDate),
      jobDescription: normalizeWhitespace(record.ShortDescriptionStr),
    }
  })
  .filter((job) => job.title && job.jobId && job.sourceUrl)

const defaultFetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36',
      Accept: 'application/json,text/plain,*/*',
    },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.json()
}

export const createOnsemiIndiaScraper = ({
  maxPages = Number.POSITIVE_INFINITY,
  fetchJson = defaultFetchJson,
} = {}) => ({
  async run() {
    const jobs = []
    const seenIds = new Set()

    for (let page = 0; page < maxPages; page += 1) {
      const payload = await fetchJson(buildSearchUrl({ page }))
      const pageJobs = extractSearchResults(payload).filter((job) => {
        if (seenIds.has(job.jobId)) return false
        seenIds.add(job.jobId)
        return true
      })
      jobs.push(...pageJobs)

      const summary = payload?.items?.[0] || {}
      const limit = Number(summary.Limit) || DEFAULT_LIMIT
      const total = Number(summary.TotalJobsCount)
      if (pageJobs.length < limit || (Number.isFinite(total) && (page + 1) * limit >= total)) break
    }

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createOnsemiIndiaScraper(options).run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()
  if (process.argv.includes('--dry-run')) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
