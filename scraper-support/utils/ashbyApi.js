import { fetchJsonWithRetry } from './fetch.js'
import { filterIndiaJobs } from './indiaLocationFilter.js'

export const DEFAULT_ASHBY_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const normalizeString = (value) => {
  if (value == null) return null
  const normalized = String(value).replace(/\s+/g, ' ').trim()
  return normalized || null
}

export const normalizeEmploymentType = (value) => {
  const normalized = normalizeString(value)
  if (!normalized) return null
  return normalized.replace(/([a-z])([A-Z])/g, '$1 $2')
}

const getAddress = (location = {}) => (
  location?.address?.postalAddress || location?.address || {}
)

export const toLocationCandidate = (location = {}) => {
  const address = getAddress(location)
  const label = normalizeString(location?.location)
  const city = normalizeString(address?.addressLocality)
  const state = normalizeString(address?.addressRegion)
  const country = normalizeString(address?.addressCountry)

  return {
    location: label || [city, state, country].filter(Boolean).join(', '),
    city,
    state,
    country,
  }
}

const hasExplicitIndiaSignal = (candidate = {}) => {
  const haystack = [
    candidate.location,
    candidate.city,
    candidate.state,
    candidate.country,
  ]
    .filter(Boolean)
    .join(' ')

  return /\bindia\b|bengaluru|bangalore|hyderabad|pune|gurugram|gurgaon|mumbai|chennai|noida|delhi/i.test(
    haystack,
  )
}

export const selectIndiaLocation = (job = {}) => {
  const candidates = [
    toLocationCandidate({ location: job.location, address: job.address }),
    ...(Array.isArray(job.secondaryLocations) ? job.secondaryLocations : []).map(
      toLocationCandidate,
    ),
  ].filter((candidate) => candidate.location)

  const indiaCandidates = filterIndiaJobs(candidates)
  return indiaCandidates.find(hasExplicitIndiaSignal) || null
}

export const extractAshbyJobs = ({
  payload = {},
  companyName,
} = {}) => (
  (Array.isArray(payload?.jobs) ? payload.jobs : [])
    .filter((job) => job?.isListed === true)
    .map((job) => {
      const title = normalizeString(job?.title)
      const jobId = normalizeString(job?.id)
      const sourceUrl = normalizeString(job?.jobUrl)
      const applyUrl = normalizeString(job?.applyUrl)
      const selectedLocation = selectIndiaLocation(job)

      if (!title || !jobId || !sourceUrl || !applyUrl || !selectedLocation) return null

      return {
        title,
        company: companyName,
        department: normalizeString(job?.department),
        location: selectedLocation.location,
        city: selectedLocation.city,
        state: selectedLocation.state,
        country: selectedLocation.country,
        jobId,
        requisitionId: jobId,
        sourceUrl,
        applyUrl,
        employmentType: normalizeEmploymentType(job?.employmentType),
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: normalizeString(job?.publishedAt),
        closingDate: null,
        jobDescription: normalizeString(job?.descriptionHtml || job?.descriptionPlain),
      }
    })
    .filter(Boolean)
)

const createDefaultFetchJson = (source) => (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': DEFAULT_ASHBY_USER_AGENT,
    Accept: 'application/json',
  },
  label: source,
  timeoutMs: 15000,
})

export const createAshbyApiScraper = ({
  source,
  companyName,
  ashbyJobBoardUrl,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchJson = createDefaultFetchJson(source),
  } = {}) {
    const payload = await fetchJson(ashbyJobBoardUrl)

    return extractAshbyJobs({
      payload,
      companyName,
    }).map((job) => ({
      ...job,
      source,
      link: job.applyUrl,
      scrapedAt: now(),
    }))
  },
})
