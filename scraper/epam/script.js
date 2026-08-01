import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { fetchJsonWithRetry } from '../../scraper-support/utils/fetch.js'
import { extractJobFilterSignals } from '../../src/utils/jobFilterSignals.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const API_URL = 'https://careers.epam.com/api/jobs/v2/search/careers-i18n'
export const CAREER_PAGE_URL = 'https://careers.epam.com/en/jobs/india'
export const COUNTRY_FACET_ID = '4060741400035606931'
export const PAGE_SIZE = 10

const DEFAULT_HEADERS = {
  Accept: 'application/json,text/plain,*/*',
  Referer: CAREER_PAGE_URL,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
  'x-anywhere-tenant': 'anywhere',
}

const decodeHtmlEntities = (value) =>
  String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const getPrimaryLocation = (record = {}) => {
  const city = normalizeWhitespace(record.city?.[0]?.name)
  const country = normalizeWhitespace(record.country?.[0]?.name)

  if (city && country) return { city, location: `${city}, ${country}` }
  if (country) return { city: null, location: country }
  if (city) return { city, location: city }
  return { city: null, location: null }
}

const getDepartment = (record = {}) => {
  const specialization = record.job_specialization
  if (Array.isArray(specialization)) {
    return normalizeWhitespace(specialization[0]) || null
  }
  return normalizeWhitespace(specialization)
}

const getDescription = (record = {}) =>
  normalizeWhitespace(record.text) || normalizeWhitespace(record.description)

const normalizeExperienceEvidence = (value) => normalizeWhitespace(value)
  ?.replace(
    /(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\s+(years?|months?)/i,
    (_, minimum, maximum, unit) => `${minimum}-${maximum} ${unit.toLowerCase()}`,
  )

const extractExperienceRequired = ({ title, jobDescription }) => (
  normalizeExperienceEvidence(
    extractJobFilterSignals({
      title,
      jobDescription,
      experienceRequired: null,
    }).experienceProfile?.evidence,
  ) || null
)

const buildAbsoluteUrl = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return new URL(normalized, CAREER_PAGE_URL).toString()
}

export const buildSearchUrl = (offset = 0) =>
  `${API_URL}?facets=country%3D${COUNTRY_FACET_ID}&from=${offset}&lang=en&size=${PAGE_SIZE}&sortBy=relevance%3Brelocation%3Dasc&websiteLocale=en-us`

export const extractTotalResults = (payload) => {
  const total = payload?.data?.total
  return Number.isFinite(total) ? total : null
}

export const extractSearchResults = (payload) =>
  (Array.isArray(payload?.data?.jobs) ? payload.data.jobs : [])
    .map((record) => {
      const title = normalizeWhitespace(record.name)
      const jobId = normalizeWhitespace(record.uid)
      const sourceUrl = buildAbsoluteUrl(record.seo?.url)
      const { city, location } = getPrimaryLocation(record)

      if (!title || !jobId || !sourceUrl || !location) return null

      return {
        title,
        company: 'EPAM',
        department: getDepartment(record),
        location,
        city,
        jobId,
        requisitionId: jobId,
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: null,
        experienceRequired: extractExperienceRequired({
          title,
          jobDescription: getDescription(record),
        }),
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: Array.isArray(record.skills)
          ? record.skills
              .map((skill) => normalizeWhitespace(skill))
              .filter(Boolean)
          : [],
        postingDate: normalizeWhitespace(record.created_at),
        closingDate: null,
        jobDescription: getDescription(record),
      }
    })
    .filter(Boolean)

const defaultFetchJson = (url) =>
  fetchJsonWithRetry(url, {
    headers: DEFAULT_HEADERS,
    attempts: config.retryAttempts,
    baseDelayMs: config.retryBaseDelayMs,
    timeoutMs: Math.max(config.jobListingTimeoutMs || 0, 20000),
    label: 'epam',
  })

export const createEpamScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchJson = options.fetchJson || defaultFetchJson
    const listings = []
    let offset = 0
    let totalResults = Number.POSITIVE_INFINITY

    while (offset < totalResults && (!maxJobs || listings.length < maxJobs)) {
      const payload = await fetchJson(buildSearchUrl(offset))
      const pageJobs = extractSearchResults(payload)
      const pageTotal = extractTotalResults(payload)

      if (Number.isFinite(pageTotal)) {
        totalResults = pageTotal
      }

      if (pageJobs.length === 0) {
        break
      }

      listings.push(...pageJobs)
      offset += PAGE_SIZE
    }

    const selectedJobs = maxJobs ? listings.slice(0, maxJobs) : listings

    return selectedJobs.map((job) => ({
      ...job,
      source: 'epam',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createEpamScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running EPAM scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'epam')
    console.log('DB result:', result)
    process.exit(0)
  }
}
