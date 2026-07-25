import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'
import { fetchJsonWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://jobs.ascendion.com/careers'
export const SEARCH_API_BASE_URL = 'https://jobs.ascendion.com/api/pcsx/search'
export const DETAIL_API_BASE_URL = 'https://jobs.ascendion.com/api/pcsx/position_details'
export const DOMAIN = 'ascendion.com'
export const LOCALE = 'en'
export const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const unique = (values) => [...new Set(values.filter(Boolean))]

const toIsoDate = (unixSeconds) => {
  const numeric = Number(unixSeconds)
  if (!Number.isFinite(numeric) || numeric <= 0) return null
  return new Date(numeric * 1000).toISOString()
}

const formatEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase()
}

const extractCities = (position, detail) => unique(
  (Array.isArray(detail?.locations) ? detail.locations : Array.isArray(position?.locations) ? position.locations : [])
    .map((location) => normalizeWhitespace(location))
    .filter((location) => /india/i.test(location))
    .map((location) => normalizeWhitespace(location.split(',')[0]))
    .filter(Boolean),
)

export const buildSearchUrl = ({
  start = 0,
  query = '',
  location = '',
  domain = DOMAIN,
  sortBy = '',
  filters = {},
  locale = LOCALE,
} = {}) => {
  const params = new URLSearchParams({
    domain,
    query,
    location,
    start: String(start),
  })

  if (sortBy) {
    params.set('sort_by', sortBy)
  }

  for (const [filterName, values] of Object.entries(filters)) {
    for (const value of Array.isArray(values) ? values : []) {
      params.append(`filter_${String(filterName).replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)}`, value)
    }
  }

  if (locale) {
    params.set('hl', locale)
  }

  return `${SEARCH_API_BASE_URL}?${params.toString()}`
}

export const buildDetailUrl = (positionId, {
  domain = DOMAIN,
  locale = LOCALE,
  queriedLocation = null,
} = {}) => {
  const params = new URLSearchParams({
    position_id: String(positionId),
    domain,
    hl: locale,
  })

  if (queriedLocation) {
    params.set('queried_location', queriedLocation)
  }

  return `${DETAIL_API_BASE_URL}?${params.toString()}`
}

const buildJobUrl = (positionId) => `https://jobs.ascendion.com/careers/job/${positionId}`

const mapPositionToJob = (position, detail = {}) => {
  const cities = extractCities(position, detail)
  const positionId = normalizeWhitespace(position?.id)
  const displayJobId = normalizeWhitespace(detail?.displayJobId || position?.displayJobId)
  const sourceUrl = buildJobUrl(positionId)

  return {
    title: normalizeWhitespace(detail?.name || position?.name),
    company: 'Ascendion',
    department: normalizeWhitespace(detail?.department || position?.department),
    location: cities.length > 0 ? `${cities.join(', ')}, India` : 'India',
    city: cities[0] || null,
    country: 'India',
    jobId: positionId,
    requisitionId: displayJobId,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: formatEmploymentType(position?.workLocationOption),
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: toIsoDate(position?.postedTs),
    closingDate: null,
    jobDescription: normalizeWhitespace(detail?.jobDescription),
  }
}

export const extractSearchResults = (payload, { detailPayloadById = {} } = {}) => {
  const positions = Array.isArray(payload?.data?.positions) ? payload.data.positions : []

  return positions
    .map((position) => mapPositionToJob(position, detailPayloadById[position.id] || {}))
    .filter((job) => /india/i.test(job.location))
}

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json, text/plain, */*',
  },
  label: 'ascendion',
})

const fetchAllPositions = async ({
  fetchJson,
  pageSize,
}) => {
  const positions = []
  let totalCount = null
  let start = 0

  while (totalCount == null || positions.length < totalCount) {
    const payload = await fetchJson(buildSearchUrl({ start }))
    const pagePositions = Array.isArray(payload?.data?.positions) ? payload.data.positions : []

    totalCount = Number(payload?.data?.count || 0)
    positions.push(...pagePositions)

    if (pagePositions.length === 0) break
    start += pageSize
  }

  return positions
}

export const createAscendionScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  pageSize = 10,
} = {}) => ({
  async run(options = {}) {
    const fetchJson = options.fetchJson || defaultFetchJson
    const positions = await fetchAllPositions({
      fetchJson,
      pageSize,
    })

    const detailPayloadById = {}
    await Promise.all(positions.map(async (position) => {
      if (!position?.id) return

      detailPayloadById[position.id] = await fetchJson(buildDetailUrl(position.id))
    }))

    const jobs = extractSearchResults({
      data: {
        positions,
      },
    }, { detailPayloadById })

    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: 'ascendion',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createAscendionScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Ascendion scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'ascendion')
    console.log('DB result:', result)
    process.exit(0)
  }
}
