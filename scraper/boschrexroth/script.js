import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'
import { fetchJsonWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://jobs.bosch.com/en/?pages=1&country=in'
export const BOSCH_REXROTH_LEGAL_ENTITY_ID = 'f75eb0fd-4109-4fcb-98d4-f826c920d1b9'

const JOBS_API_BASE_URL = 'https://bosch-i3-caas-api.e-spirit.cloud'
const JOBS_API_TENANT = 'bosch-i3-prod'
const JOBS_API_PROJECT = 'bosch-de'
const JOBS_API_COLLECTION = 'jobs'
const JOBS_API_KEY = '2b760fb7-49ef-4e83-b4ba-9c3a8d185e5e'
const JOB_AD_LINK_PREFIX = 'https://jobs.bosch.com/en/job/'
const DEFAULT_PAGE_SIZE = 25
const DEFAULT_SEARCH_TERM = 'Rexroth'
const DEFAULT_SORT = { releasedDate: -1 }

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const toTitleCase = (value) => normalizeWhitespace(value)
  ?.split(/\s+/)
  .map((part) => (
    /^[A-Z0-9()./-]+$/.test(part)
      ? part
      : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
  ))
  .join(' ') || null

const buildAggregationBaseUrl = () => (
  `${JOBS_API_BASE_URL}/${JOBS_API_TENANT}/${JOBS_API_PROJECT}.${JOBS_API_COLLECTION}.content/_aggrs/get_jobs`
)

const buildContentBaseUrl = () => (
  `${JOBS_API_BASE_URL}/${JOBS_API_TENANT}/${JOBS_API_PROJECT}.${JOBS_API_COLLECTION}.content/`
)

export const buildSearchUrl = ({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  searchTerm = DEFAULT_SEARCH_TERM,
  legalEntityId = BOSCH_REXROTH_LEGAL_ENTITY_ID,
} = {}) => {
  const avars = encodeURIComponent(JSON.stringify({
    country: ['in'],
    legal_entity: [legalEntityId],
    search_term: searchTerm,
    sort: DEFAULT_SORT,
  }))

  return `${buildAggregationBaseUrl()}?pagesize=${pageSize}&page=${page}&avars=${avars}`
}

export const buildDetailUrl = (refNumber) => (
  `${buildContentBaseUrl()}?np&rep=pj&filter=${encodeURIComponent(JSON.stringify({ refNumber }))}`
)

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    Authorization: `Bearer ${JOBS_API_KEY}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    Accept: 'application/json',
  },
  label: 'boschrexroth',
})

export const extractSearchResultSet = (payload) => (
  payload?._embedded?.['rh:result']?.[0] || {
    meta: [],
    data: [],
  }
)

const filterBoschRexrothListings = (listings) => listings.filter((listing) => (
  listing?.legal_entity?.valueId === BOSCH_REXROTH_LEGAL_ENTITY_ID
  && String(listing?.location?.country || '').toLowerCase() === 'in'
))

const buildJobUrl = (listing) => (
  `${JOB_AD_LINK_PREFIX}${listing?.jobUrl || listing?.refNumber || ''}`
)

const extractExperience = (detail) => {
  const additionalInformation = stripTags(
    detail?.jobAd?.sections?.additionalInformation?.text,
  )
  const match = additionalInformation?.match(/Experience\s*:\s*([^|]+)/i)
  return normalizeWhitespace(match?.[1]) || null
}

const buildDescription = (detail) => {
  const sections = detail?.jobAd?.sections || {}

  return normalizeWhitespace([
    stripTags(sections.companyDescription?.text),
    stripTags(sections.jobDescription?.text),
    stripTags(sections.qualifications?.text),
    stripTags(sections.additionalInformation?.text),
  ].filter(Boolean).join(' '))
}

const mapListingToJob = (listing, detail) => {
  const city = toTitleCase(listing?.location?.city || listing?.working_location?.valueLabel)
  const workLocation = normalizeWhitespace(listing?.location?.workLocation)
  const location = normalizeWhitespace(
    workLocation
      ? `${workLocation}, India`
      : city
        ? `${city}, India`
        : 'India'
  )
  const jobUrl = buildJobUrl(listing)

  return {
    title: normalizeWhitespace(listing?.name),
    company: 'Bosch Rexroth',
    department: normalizeWhitespace(listing?.function?.label) || null,
    location,
    city,
    country: 'India',
    jobId: normalizeWhitespace(listing?.refNumber),
    requisitionId: normalizeWhitespace(listing?.refNumber),
    sourceUrl: jobUrl,
    applyUrl: jobUrl,
    employmentType: normalizeWhitespace(listing?.type_of_contract?.valueLabel) || null,
    experienceRequired: extractExperience(detail),
    minimumQualification: stripTags(detail?.jobAd?.sections?.qualifications?.text),
    preferredQualification: null,
    requiredSkills: [],
    postingDate: normalizeWhitespace(detail?.releasedDate || listing?.releasedDate),
    closingDate: null,
    jobDescription: buildDescription(detail),
  }
}

export const extractSearchResults = ({
  listingPayload,
  detailPayloadByRef = {},
}) => {
  const resultSet = extractSearchResultSet(listingPayload)
  const listings = filterBoschRexrothListings(resultSet.data || [])

  return listings.map((listing) => {
    const detail = Array.isArray(detailPayloadByRef[listing.refNumber])
      ? detailPayloadByRef[listing.refNumber][0]
      : detailPayloadByRef[listing.refNumber]

    return mapListingToJob(listing, detail || {})
  })
}

export const createBoschRexrothScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  pageSize = DEFAULT_PAGE_SIZE,
} = {}) => ({
  async run(options = {}) {
    const fetchJson = options.fetchJson || defaultFetchJson
    const allListings = []

    for (let page = 1; ; page += 1) {
      const listingPayload = await fetchJson(buildSearchUrl({ page, pageSize }))
      const resultSet = extractSearchResultSet(listingPayload)
      const listings = filterBoschRexrothListings(resultSet.data || [])

      allListings.push(...listings)

      const totalCount = Number(resultSet.meta?.[0]?.count || 0)
      const reachedLimit = maxJobs && allListings.length >= maxJobs
      const reachedLastPage = listings.length < pageSize
        || (totalCount > 0 && allListings.length >= totalCount)

      if (reachedLimit || reachedLastPage) {
        break
      }
    }

    const selectedListings = maxJobs ? allListings.slice(0, maxJobs) : allListings
    const detailPayloadByRef = {}

    await Promise.all(selectedListings.map(async (listing) => {
      detailPayloadByRef[listing.refNumber] = await fetchJson(
        buildDetailUrl(listing.refNumber),
      )
    }))

    return extractSearchResults({
      listingPayload: {
        _embedded: {
          'rh:result': [
            {
              meta: [{ count: selectedListings.length }],
              data: selectedListings,
            },
          ],
        },
      },
      detailPayloadByRef,
    }).map((job) => ({
      ...job,
      source: 'boschrexroth',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createBoschRexrothScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Bosch Rexroth scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'boschrexroth')
    console.log('DB result:', result)
    process.exit(0)
  }
}
