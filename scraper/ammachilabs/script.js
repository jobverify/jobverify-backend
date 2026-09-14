import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { fetchJsonWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const JOBS_API_URL = 'https://ammachilabs.org/wp-json/wp/v2/jobs?per_page=100&page=1'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const toIsoDate = (value, { assumeUtc = false } = {}) => {
  if (!value) return null

  const normalizedValue = assumeUtc && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(String(value))
    ? `${value}Z`
    : value

  const date = new Date(normalizedValue)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

const inferEmploymentType = (value) => {
  const code = Array.isArray(value) ? value[0] : value
  switch (String(code || '').toUpperCase()) {
    case 'FULL_TIME':
      return 'Full-time'
    case 'PART_TIME':
      return null
    case 'CONTRACTOR':
      return 'Contract'
    case 'TEMPORARY':
      return 'Temporary'
    case 'INTERN':
    case 'INTERNSHIP':
      return 'Internship'
    default:
      return normalizeWhitespace(code)
  }
}

const inferLocationFromTitle = (title) => {
  const normalizedTitle = normalizeWhitespace(title)
  if (!normalizedTitle) return null

  const match = normalizedTitle.match(/\bin\s+(.+\b(?:district|city),\s*[A-Za-z][A-Za-z ]+)$/i)
  return normalizeWhitespace(match?.[1])
}

const ensureIndiaLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (/india/i.test(normalized)) return normalized
  return `${normalized}, India`
}

const inferRemoteStatus = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase() || ''
  if (!normalized) return null
  if (normalized.includes('hybrid')) return 'Hybrid'
  if (normalized.includes('remote')) return 'Remote'
  return 'On-site'
}

const appendSection = (parts, title, value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return

  if (title) {
    parts.push(`${title} ${normalized}`)
    return
  }

  parts.push(normalized)
}

export const buildSearchUrl = () => JOBS_API_URL

export const extractSearchResults = (records = []) =>
  records.map((record) => {
    const title = normalizeWhitespace(record?.position_title)
      || normalizeWhitespace(record?.title?.rendered)
    const rawLocation = normalizeWhitespace(record?.position_job_location)
      || inferLocationFromTitle(title)
    const location = ensureIndiaLocation(rawLocation)
    const remoteStatus = inferRemoteStatus(location)
    const city = remoteStatus === 'Remote'
      ? null
      : normalizeWhitespace(rawLocation)?.split(',')[0]?.trim() || null

    const jobDescriptionParts = []
    appendSection(jobDescriptionParts, '', record?.position_description)
    appendSection(jobDescriptionParts, 'Responsibilities', record?.position_responsibilities)
    appendSection(jobDescriptionParts, 'Qualifications', record?.position_qualifications)

    return {
      title,
      company: 'Ammachi Labs',
      department: null,
      location,
      city,
      country: 'India',
      jobId: String(record?.id ?? ''),
      requisitionId: String(record?.id ?? ''),
      sourceUrl: normalizeWhitespace(record?.link),
      applyUrl: normalizeWhitespace(record?.link),
      employmentType: inferEmploymentType(record?.position_employment_type),
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: record?.date_gmt
        ? toIsoDate(record.date_gmt, { assumeUtc: true })
        : toIsoDate(record?.date),
      closingDate: null,
      jobDescription: normalizeWhitespace(jobDescriptionParts.join(' ')),
      remoteStatus,
    }
  }).filter((job) => job.title && job.jobId && job.sourceUrl)

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
  },
  label: 'ammachilabs',
  timeoutMs: 15000,
})

export const createAmmachiLabsScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchJson = options.fetchJson || defaultFetchJson
    const records = await fetchJson(buildSearchUrl())
    const jobs = extractSearchResults(records)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: 'ammachilabs',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createAmmachiLabsScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Ammachi Labs scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'ammachilabs')
    console.log('DB result:', result)
    process.exit(0)
  }
}
