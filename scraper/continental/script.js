import path from 'path'
import { fileURLToPath } from 'url'

import { fetchJsonWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREER_PAGE_URL = 'https://jobs.continental.com/en/'
export const RESULTS_API_URL = 'https://jobs.continental.com/en/api/result-list/pagetype-jobs/'
export const INDIA_LOCATION = JSON.stringify({
  title: 'Indien',
  type: 'country',
  countryCode: 'in',
})

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = String(value).replace(/\s+/g, ' ').trim()
  return normalized || null
}

const getRemoteStatus = (value) => {
  if (/hybrid/i.test(value || '')) return 'Hybrid'
  if (/remote/i.test(value || '')) return 'Remote'
  if (/on\s*site/i.test(value || '')) return 'On-site'
  return null
}

const buildDescription = (listing) => [
  listing.fieldOfWorkLabel ? `Field of work: ${normalizeWhitespace(listing.fieldOfWorkLabel)}.` : null,
  listing.jobFlexibilityLabel ? `Flexibility: ${normalizeWhitespace(listing.jobFlexibilityLabel)}.` : null,
].filter(Boolean).join(' ') || null

export const buildIndiaSearchRequest = ({ currentPage = 1, itemsPerPage = 100 } = {}) => {
  const body = new FormData()
  body.append('tx_conjobs_api[filter][location]', INDIA_LOCATION)
  body.append('tx_conjobs_api[itemsPerPage]', String(itemsPerPage))

  if (currentPage > 1) {
    body.append('tx_conjobs_api[currentPage]', String(currentPage))
  }

  return {
    url: RESULTS_API_URL,
    options: {
      method: 'POST',
      body,
    },
  }
}

export const extractSearchResults = (payload) => {
  const listings = Array.isArray(payload?.result?.list) ? payload.result.list : []

  return listings
    .filter((listing) => normalizeWhitespace(listing.countryLabel) === 'India')
    .map((listing) => {
      const city = normalizeWhitespace(listing.cityLabel)
      const jobId = normalizeWhitespace(listing.refNumber || listing.internalId)
      const sourceUrl = normalizeWhitespace(listing.absoluteUrl)

      return {
        title: normalizeWhitespace(listing.title),
        company: 'Continental',
        department: normalizeWhitespace(listing.fieldOfWorkLabel),
        location: city ? `${city}, India` : 'India',
        city,
        country: 'India',
        jobId,
        requisitionId: jobId,
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: null,
        remoteStatus: getRemoteStatus(listing.jobFlexibilityLabel),
        postingDate: normalizeWhitespace(listing.publicationDate),
        closingDate: null,
        requiredSkills: [],
        jobDescription: buildDescription(listing),
      }
    })
    .filter((job) => job.title && job.sourceUrl)
}

const defaultFetchJson = (url, options) => fetchJsonWithRetry(url, {
  ...options,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; Jobify/1.0)',
    Accept: 'application/json',
  },
  label: 'continental',
})

export const createContinentalScraper = () => ({
  async run({ fetchJson = defaultFetchJson, maxPages = null, maxJobs = null } = {}) {
    const jobs = []
    let currentPage = 1

    while (!maxPages || currentPage <= maxPages) {
      const request = buildIndiaSearchRequest({ currentPage })
      const payload = await fetchJson(request.url, request.options)
      const pageJobs = extractSearchResults(payload)
      jobs.push(...pageJobs)

      if (maxJobs && jobs.length >= maxJobs) break

      const pagination = payload?.result?.pagination
      if (!pagination?.nextPage || pagination.isLastPage) break
      currentPage = pagination.nextPage
    }

    return (maxJobs ? jobs.slice(0, maxJobs) : jobs).map((job) => ({
      ...job,
      source: 'continental',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createContinentalScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  console.log(`Total India jobs scraped: ${jobs.length}`)
  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, 'continental')
  }
}
