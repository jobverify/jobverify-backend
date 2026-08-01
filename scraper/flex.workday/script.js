import { fetchJsonWithRetry } from '../../scraper-support/utils/fetch.js'

export const CAREER_PAGE_URL = 'https://flex.com/careers'
export const BASE_URL = 'https://flextronics.wd1.myworkdayjobs.com/en-US/Careers'
export const JOBS_API_URL = 'https://flextronics.wd1.myworkdayjobs.com/wday/cxs/flextronics/Careers/jobs'
export const INDIA_COUNTRY_FACET_ID = 'c4f78be1a8f14da0ab49ce1162348a5e'

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; JobifyBot/1.0)',
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value).replace(/\s+/g, ' ').trim()
  return normalized || null
}

const extractRequisitionId = (job = {}) =>
  normalizeWhitespace(job?.bulletFields?.[0])
  || normalizeWhitespace(job?.externalPath?.match(/_(WD\d+(?:-\d+)?)$/)?.[1])

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null

  const parts = normalized.split(',').map((part) => part.trim()).filter(Boolean)
  const city = parts.length > 1 ? parts[1] : parts[0]

  if (!city || /^india$/i.test(city) || /^remote$/i.test(city)) {
    return null
  }

  return city
}

const toRemoteStatus = (location) => (
  /(^|,\s*)remote$/i.test(normalizeWhitespace(location) || '') ? 'Remote' : null
)

export const buildJobsApiRequest = (offset = 0, limit = 20) => ({
  appliedFacets: {
    Location_Country: [INDIA_COUNTRY_FACET_ID],
  },
  limit,
  offset,
  searchText: '',
})

export const buildJobUrl = (externalPath) => {
  const normalizedPath = normalizeWhitespace(externalPath)
  if (!normalizedPath) return null
  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath

  const base = BASE_URL.replace(/\/$/, '')
  const path = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`
  return `${base}${path}`
}

export const mapJobPosting = (job) => {
  const sourceUrl = normalizeWhitespace(
    job?.externalPath ? buildJobUrl(job.externalPath) : null,
  )
  const requisitionId = extractRequisitionId(job)
  const location = normalizeWhitespace(job?.locationsText)

  if (!sourceUrl || !requisitionId || !location) {
    return null
  }

  return {
    title: normalizeWhitespace(job?.title),
    company: 'Flex',
    department: null,
    location,
    city: extractCity(location),
    country: 'India',
    jobId: requisitionId,
    requisitionId,
    sourceUrl,
    applyUrl: `${sourceUrl}/apply`,
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
    remoteStatus: toRemoteStatus(location),
  }
}

const defaultFetchJson = (url, options = {}) => fetchJsonWithRetry(url, {
  ...options,
  headers: {
    ...DEFAULT_HEADERS,
    ...(options.headers || {}),
  },
  label: 'flex',
})

export const createFlexScraper = ({ pageSize = 20 } = {}) => ({
  async run({ fetchJson = defaultFetchJson } = {}) {
    const jobs = []
    let offset = 0
    let total = Number.POSITIVE_INFINITY

    while (offset < total) {
      const payload = await fetchJson(JOBS_API_URL, {
        method: 'POST',
        body: JSON.stringify(buildJobsApiRequest(offset, pageSize)),
      })
      const jobPostings = Array.isArray(payload?.jobPostings) ? payload.jobPostings : []

      total = Number.isFinite(payload?.total) ? payload.total : offset + jobPostings.length
      offset += jobPostings.length

      jobs.push(
        ...jobPostings
          .map((job) => mapJobPosting(job))
          .filter(Boolean),
      )

      if (jobPostings.length < pageSize) {
        break
      }
    }

    return jobs.map((job) => ({
      ...job,
      source: 'flex',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createFlexScraper().run()
