import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREER_PAGE_URL = 'https://www.propel.app/careers/'
export const ASHBY_BOARD_URL = 'https://jobs.ashbyhq.com/propel'
export const ASHBY_JOB_BOARD_URL = 'https://api.ashbyhq.com/posting-api/job-board/propel'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeString = (value) => {
  if (value == null) return null

  const normalized = String(value).replace(/\s+/g, ' ').trim()
  return normalized || null
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeString(value)
  if (!normalized) return null

  return normalized.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ')
}

const getPostalAddress = (value = {}) => value?.address?.postalAddress || value?.address || {}

const getPrimaryAddress = (job = {}) => getPostalAddress(job)

const selectSecondaryLocation = (job = {}) => {
  const locations = Array.isArray(job?.secondaryLocations) ? job.secondaryLocations : []

  return locations.find((location) => {
    const address = getPostalAddress(location)
    return normalizeString(location?.location || location?.name)
      || normalizeString(address?.addressLocality)
      || normalizeString(address?.addressRegion)
      || normalizeString(address?.addressCountry)
  }) || null
}

const toLocationDetails = (job = {}) => {
  const primaryAddress = getPrimaryAddress(job)
  const secondaryLocation = selectSecondaryLocation(job)
  const secondaryAddress = getPostalAddress(secondaryLocation)

  return {
    location: normalizeString(job?.location),
    city: normalizeString(secondaryAddress?.addressLocality || primaryAddress?.addressLocality),
    state: normalizeString(secondaryAddress?.addressRegion || primaryAddress?.addressRegion),
    country: normalizeString(primaryAddress?.addressCountry || secondaryAddress?.addressCountry),
  }
}

export const extractAshbyJobs = (payload = {}) => (
  (Array.isArray(payload?.jobs) ? payload.jobs : [])
    .filter((job) => job?.isListed === true)
    .map((job) => {
      const title = normalizeString(job?.title)
      const jobId = normalizeString(job?.id)
      const sourceUrl = normalizeString(job?.jobUrl)
      const applyUrl = normalizeString(job?.applyUrl)
      const location = toLocationDetails(job)

      if (!title || !jobId || !sourceUrl || !applyUrl || !location.location) {
        return null
      }

      return {
        title,
        company: 'Propel',
        department: normalizeString(job?.department),
        team: normalizeString(job?.team),
        location: location.location,
        city: location.city,
        state: location.state,
        country: location.country,
        jobId,
        requisitionId: jobId,
        sourceUrl,
        applyUrl,
        employmentType: normalizeEmploymentType(job?.employmentType),
        workplaceType: normalizeString(job?.workplaceType),
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: normalizeString(job?.publishedAt),
        closingDate: null,
        jobDescription: normalizeString(job?.descriptionHtml),
      }
    })
    .filter(Boolean)
)

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
  },
  label: 'propel',
  timeoutMs: 15000,
})

export const createPropelScraper = () => ({
  async run({ fetchJson = defaultFetchJson } = {}) {
    const payload = await fetchJson(ASHBY_JOB_BOARD_URL)

    return extractAshbyJobs(payload).map((job) => ({
      ...job,
      source: 'propel',
      link: job.applyUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createPropelScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, 'propel')
}
