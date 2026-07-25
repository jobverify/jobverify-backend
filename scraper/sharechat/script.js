import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const API_BASE_URL = 'https://sharechat.com/api/careersList'
const JOB_BASE_URL = 'https://sharechat.mynexthire.com/employer/jobs'

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || null
}

const toIsoDate = (value) => {
  const timestamp = Number(value)
  if (!Number.isFinite(timestamp)) return null

  const parsed = new Date(timestamp)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

const toTitleCase = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  return normalized
    .split(/[\s_-]+/)
    .map((part) => {
      if (!part) return part
      return part[0].toUpperCase() + part.slice(1).toLowerCase()
    })
    .join(' ')
}

const formatEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (normalized === 'part_time' || normalized === 'part-time') return null

  const mapped = {
    contract: 'Contract',
    intern: 'Internship',
    internship: 'Internship',
    full_time: 'Full-time',
    'full-time': 'Full-time',
    fulltime: 'Full-time',
  }

  return mapped[normalized] || toTitleCase(normalized)
}

const formatExperienceRange = (minYears, maxYears) => {
  const min = Number(minYears)
  const max = Number(maxYears)
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null
  return `${min}-${max} years`
}

const formatLocation = (officeLocationNames) => {
  const location = Array.isArray(officeLocationNames)
    ? normalizeWhitespace(officeLocationNames.find(Boolean))
    : normalizeWhitespace(officeLocationNames)

  if (!location) return { location: null, city: null }
  if (/^india$/i.test(location)) return { location: 'India', city: null }
  if (/india/i.test(location)) {
    return {
      location,
      city: normalizeWhitespace(location.split(',')[0]),
    }
  }

  return {
    location: `${location}, India`,
    city: location,
  }
}

const getCareersList = (payload) => Array.isArray(payload?.data?.careersList)
  ? payload.data.careersList
  : []

export const buildSearchUrl = ({ limit = 100, offsetToken } = {}) => {
  const url = new URL(API_BASE_URL)
  url.searchParams.set('limit', String(limit))

  if (offsetToken) {
    url.searchParams.set('offsetToken', offsetToken)
  }

  return url.toString()
}

export const buildJobUrl = (requisitionId) => {
  const reqId = Number.parseInt(requisitionId, 10)
  const encodedPayload = Buffer.from(JSON.stringify({
    pageType: 'jd',
    cvSource: 'careers',
    reqId,
    requester: {
      id: '',
      code: '',
      name: '',
    },
    page: 'careers',
    bufilter: -1,
    customFields: {},
  })).toString('base64')

  return `${JOB_BASE_URL}?src=careers&p=${encodedPayload}`
}

export const extractSearchResults = (payload) => getCareersList(payload)
  .flatMap((group) => {
    const department = normalizeWhitespace(group?.orgUnitName || group?.title)
    const records = Array.isArray(group?.data) ? group.data : []

    return records.map((record) => {
      const requisitionId = normalizeWhitespace(record?.requisitionId)
      const title = normalizeWhitespace(record?.requisitionTitle || record?.designation)
      const { location, city } = formatLocation(record?.officeLocationNames)
      const jobUrl = requisitionId ? buildJobUrl(requisitionId) : null

      if (!requisitionId || !title || !jobUrl) return null

      return {
        title,
        company: 'ShareChat',
        department: normalizeWhitespace(record?.orgUnitName) || department,
        location,
        city,
        jobId: requisitionId,
        requisitionId,
        sourceUrl: jobUrl,
        applyUrl: jobUrl,
        employmentType: formatEmploymentType(record?.employmentType),
        experienceRequired: formatExperienceRange(record?.yrsOfExpMin, record?.yrsOfExpMax),
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: toIsoDate(record?.approvedDate ?? record?.createdDate),
        closingDate: null,
        jobDescription: null,
      }
    })
  })
  .filter(Boolean)

export const extractPaginationSummary = (payload) => ({
  hasNext: payload?.data?.hasNext === true,
  offsetToken: normalizeWhitespace(payload?.data?.offsetToken),
  totalJobCount: Number.isFinite(payload?.data?.count) ? payload.data.count : null,
})

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      Accept: 'application/json,text/plain,*/*',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const run = async () => {
  const jobs = []
  const seenJobIds = new Set()
  const maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null
  const maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY
  let page = 0
  let offsetToken = null

  while (page < maxPages) {
    page += 1
    const payload = await fetchJson(buildSearchUrl({ offsetToken }))
    const listings = extractSearchResults(payload)
    const summary = extractPaginationSummary(payload)

    for (const job of listings) {
      if (seenJobIds.has(job.jobId)) continue
      seenJobIds.add(job.jobId)
      jobs.push({
        ...job,
        source: 'sharechat',
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: new Date().toISOString(),
      })

      if (maxJobs && jobs.length >= maxJobs) {
        return jobs
      }
    }

    if (!summary.hasNext || !summary.offsetToken) {
      break
    }

    offsetToken = summary.offsetToken
  }

  return jobs
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running ShareChat scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)
  const cities = [...new Set(jobs.map((job) => job.city).filter(Boolean))].sort()
  console.log(`Cities found: ${cities.join(', ')}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'sharechat')
    console.log('DB result:', result)
    process.exit(0)
  }
}
