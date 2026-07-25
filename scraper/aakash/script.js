import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://hrconnect.hono.ai/react/career/jobs'
export const JOBS_API_URL = 'https://hrconnect.hono.ai/nodejs/getRFRListOnCandidatePortal'

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const normalizeDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const isoDate = /^(\d{4}-\d{2}-\d{2})T/.exec(normalized)
  if (isoDate) return isoDate[1]

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return normalized

  const year = parsed.getUTCFullYear()
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
  const day = String(parsed.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const experienceTokenToYears = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const match = /^(\d+)-(\d+)$/.exec(normalized)
  if (!match) return null

  const years = Number.parseInt(match[1], 10)
  const months = Number.parseInt(match[2], 10)
  if (!Number.isFinite(years) || !Number.isFinite(months)) return null

  return years + (months / 12)
}

const formatYears = (value) => {
  if (!Number.isFinite(value)) return null
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)))
}

const normalizeExperience = (minimum, maximum) => {
  const minYears = experienceTokenToYears(minimum)
  const maxYears = experienceTokenToYears(maximum)

  if (minYears == null && maxYears == null) return null
  if (minYears != null && maxYears != null) return `${formatYears(minYears)}-${formatYears(maxYears)} years`
  if (minYears != null) return `${formatYears(minYears)}+ years`
  return `${formatYears(maxYears)} years`
}

const parseDraftDescription = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    const parsed = JSON.parse(value)
    const blocks = Array.isArray(parsed?.blocks) ? parsed.blocks : []
    const text = blocks
      .map((block) => normalizeWhitespace(block?.text))
      .filter(Boolean)
      .join(' ')
    return text || null
  } catch {
    return normalized
  }
}

const collectSkills = (job = {}) => {
  const skills = [
    ...(Array.isArray(job.skills_List) ? job.skills_List.map((item) => item?.Name) : []),
    ...(Array.isArray(job.other_skills) ? job.other_skills : []),
  ]

  return [...new Set(skills.map((skill) => normalizeWhitespace(skill)).filter(Boolean))]
}

const collectQualifications = (job = {}) => {
  const qualifications = Array.isArray(job.qualification)
    ? job.qualification.map((item) => normalizeWhitespace(item?.Qual_Name)).filter(Boolean)
    : []

  return qualifications.length > 0 ? qualifications.join(', ') : null
}

export const buildJobDetailUrl = (rfrId) =>
  `${CAREER_PAGE_URL}/${normalizeWhitespace(rfrId) || ''}`

export const extractJobs = (payload) => (payload?.data || [])
  .map((job) => {
    const jobId = normalizeWhitespace(job?.rfr_id)
    const sourceUrl = jobId ? buildJobDetailUrl(jobId) : null
    const designation = normalizeWhitespace(job?.dsgmast_designation_details?.DSG_NAME)
    const employmentType = designation && designation.toLowerCase() !== 'na' ? designation : null

    return {
      title: normalizeWhitespace(job?.roleDetails?.ROLE_NAME),
      company: 'Aakash',
      department: normalizeWhitespace(job?.functmast_details?.FUNCT_NAME),
      location: normalizeWhitespace(job?.worklocmast_details?.WLOC_NAME || job?.locmast_details?.LOC_NAME),
      city: normalizeWhitespace(job?.worklocmast_details?.WLOC_NAME || job?.locmast_details?.LOC_NAME),
      jobId,
      requisitionId: normalizeWhitespace(job?.id),
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType,
      experienceRequired: normalizeExperience(job?.minimum_experience, job?.maximum_experience),
      minimumQualification: collectQualifications(job),
      preferredQualification: null,
      requiredSkills: collectSkills(job),
      postingDate: normalizeDate(job?.published_date),
      closingDate: null,
      jobDescription: parseDraftDescription(job?.job_description),
    }
  })
  .filter((job) => job.title && job.jobId && job.sourceUrl)

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const run = async () => {
  const payload = await fetchJson(JOBS_API_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      domainurl: 'hrconnect.hono.ai',
    },
  })

  const jobs = extractJobs(payload).map((job) => ({
    ...job,
    company: 'Aakash',
    source: 'aakash',
    link: job.applyUrl || job.sourceUrl,
    scrapedAt: new Date().toISOString(),
  }))

  if (Number.isInteger(config.maxJobs) && config.maxJobs >= 0) {
    return jobs.slice(0, config.maxJobs)
  }

  return jobs
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Aakash scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'aakash')
    console.log('DB result:', result)
    process.exit(0)
  }
}
