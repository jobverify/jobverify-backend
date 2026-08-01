import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const SEARCH_BASE_URL = 'https://intapgateway.infosysapps.com/careersci/search/intapjbsrch'
const PUBLIC_CAREERS_BASE_URL = 'https://career.infosys.com'
const DEFAULT_SOURCE_IDS = '1,21'

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || null
}

const toTitleCase = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return normalized
    .toLowerCase()
    .split(' ')
    .map((part) => part ? part[0].toUpperCase() + part.slice(1) : part)
    .join(' ')
}

const splitSkills = (value) => String(value ?? '')
  .split(',')
  .map((item) => normalizeWhitespace(item.split('->').pop()))
  .filter(Boolean)

const unique = (values) => [...new Set(values.filter(Boolean))]

const joinDescriptionParts = (...parts) => normalizeWhitespace(
  parts
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)
    .join(' '),
)

const normalizeQualification = (value) => {
  const entries = String(value ?? '')
    .split(',')
    .map((item) => normalizeWhitespace(item))
    .filter(Boolean)
  return entries.length > 0 ? entries.join(', ') : null
}

export const buildSearchApiUrl = (sourceIds = DEFAULT_SOURCE_IDS, searchText = 'ALL') => {
  const url = new URL(`${SEARCH_BASE_URL}/getCareerSearchJobs`)
  url.searchParams.set('sourceId', sourceIds)
  url.searchParams.set('searchText', searchText)
  return url.toString()
}

export const buildDetailApiUrl = (referenceCode) => {
  const url = new URL(`${SEARCH_BASE_URL}/getJobDesc`)
  url.searchParams.set('referenceCode', referenceCode)
  return url.toString()
}

export const buildDetailUrl = (referenceCode) => {
  const url = new URL('/jobdesc', PUBLIC_CAREERS_BASE_URL)
  url.searchParams.set('jobReferenceCode', referenceCode)
  return url.toString()
}

export const buildApplyUrl = (referenceCode, sourceId = 1) => {
  const url = new URL('/jobapply', PUBLIC_CAREERS_BASE_URL)
  url.searchParams.set('jobReferenceCode', referenceCode)
  url.searchParams.set('sourceId', String(sourceId))
  return url.toString()
}

export const formatExperienceRange = (minExperienceLevel, maxExperienceLevel) => {
  if (!Number.isFinite(minExperienceLevel) || !Number.isFinite(maxExperienceLevel)) {
    return null
  }
  return `${minExperienceLevel} - ${maxExperienceLevel} years`
}

const toSharedJobShape = (record = {}, includeClosingDate = true) => {
  const referenceCode = normalizeWhitespace(record.referenceCode)
  const sourceId = Number.isFinite(record.sourceId) ? record.sourceId : Number.parseInt(record.sourceId, 10)
  const city = toTitleCase(record.city || record.location)
  const minExperienceLevel = Number.parseInt(record.minExperienceLevel, 10)
  const maxExperienceLevel = Number.parseInt(record.maxExperienceLevel, 10)
  const requiredSkills = unique(splitSkills(record.preferredSkills))

  return {
    title: normalizeWhitespace(record.postingTitle),
    company: normalizeWhitespace(record.organizationName || record.company) || 'Infosys Limited',
    department: normalizeWhitespace(record.functionalArea || record.unit),
    location: city ? `${city}, India` : null,
    city,
    jobId: normalizeWhitespace(record.postingId),
    requisitionId: normalizeWhitespace(record.requisitionId),
    referenceCode,
    sourceId,
    sourceUrl: referenceCode ? buildDetailUrl(referenceCode) : null,
    applyUrl: referenceCode ? buildApplyUrl(referenceCode, sourceId || 1) : null,
    employmentType: 'Full-time',
    experienceRequired: formatExperienceRange(minExperienceLevel, maxExperienceLevel),
    minimumQualification: normalizeQualification(record.educationalRequirement),
    preferredQualification: null,
    requiredSkills,
    postingDate: normalizeWhitespace(record.createdOn),
    closingDate: includeClosingDate ? normalizeWhitespace(record.expiryDate) : null,
    jobDescription: joinDescriptionParts(
      record.rolesResponsibilities,
      record.technicalRequirement || record.techRequirement,
      record.additionalResponsibility || record.addResponsibility,
      record.postingDescription || record.postingDesc,
    ),
  }
}

export const extractSearchResults = (payload) => {
  if (!Array.isArray(payload)) return []

  return payload
    .filter((record) => normalizeWhitespace(record.country)?.toLowerCase() === 'india')
    .map((record) => toSharedJobShape(record, true))
}

export const extractJobDetail = (payload) => toSharedJobShape(payload, false)

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
  const searchPayload = await fetchJson(buildSearchApiUrl())
  const jobs = extractSearchResults(searchPayload)
  const maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null
  const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

  return selectedJobs.map((job) => ({
    ...job,
    company: job.company || 'Infosys Limited',
    source: 'infosys',
    link: job.applyUrl || job.sourceUrl,
    scrapedAt: new Date().toISOString(),
  }))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Infosys scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)
  const cities = [...new Set(jobs.map((job) => job.city).filter(Boolean))].sort()
  console.log(`Cities found: ${cities.join(', ')}`)
  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'infosys')
    console.log('DB result:', result)
    process.exit(0)
  }
}
