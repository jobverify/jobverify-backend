import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREER_PAGE_URL = 'https://www.gocomet.com/company/careers'
export const EMBED_CONFIG_URL = 'https://gocomet.keka.com/careers/api/embedjobs/js/f83ffa9c-65f8-451a-b4ad-ead39efd7867'
export const ACTIVE_JOBS_URL = 'https://gocomet.keka.com/careers/api/embedjobs/default/active/f83ffa9c-65f8-451a-b4ad-ead39efd7867'
export const DEPARTMENTS_URL = 'https://gocomet.keka.com/careers/api/embedjobs/departments/f83ffa9c-65f8-451a-b4ad-ead39efd7867'
export const KEKA_DOMAIN = 'https://gocomet.keka.com/careers/'

export const PROVIDER_METADATA = {
  source: 'gocomet',
  companyName: 'GoComet',
  companyCareerPage: CAREER_PAGE_URL,
  companyDomain: 'gocomet.com',
  adapter: 'script',
  atsPlatform: 'keka-embed-api',
  modulePath: '../gocomet/script.js',
  dryRunFile: 'gocomet/jobs.json',
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

const unwrapList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.result)) return payload.result
  return []
}

const departmentMap = (payload) => new Map(
  unwrapList(payload)
    .map((department) => [
      String(department?.id ?? department?.value ?? ''),
      normalizeWhitespace(department?.name ?? department?.text),
    ])
    .filter(([id, name]) => id && name),
)

const isIndiaLocation = (location = {}) => {
  const countryCode = String(location.countryCode ?? location.country?.code ?? '').toUpperCase()
  const countryName = normalizeWhitespace(location.countryName ?? location.country?.name)
  return countryCode === 'IN' || countryName?.toLowerCase() === 'india'
}

const locationLabel = (location) => {
  const city = normalizeWhitespace(location.city)
  const name = normalizeWhitespace(location.name)
  const base = name || city || 'India'
  return /india/i.test(base) ? base : `${base}, India`
}

const mapJob = (job, departments) => {
  const indiaLocation = (Array.isArray(job?.jobLocations) ? job.jobLocations : []).find(isIndiaLocation)
  const jobId = normalizeWhitespace(job?.id)
  if (!indiaLocation || !jobId) return null

  const sourceUrl = `${KEKA_DOMAIN}jobdetails/${jobId}`
  const applyUrl = `${KEKA_DOMAIN}applyjob/${jobId}`

  return {
    title: normalizeWhitespace(job.title),
    company: 'GoComet',
    department: departments.get(String(job.departmentId ?? job.department?.id ?? '')) || normalizeWhitespace(job.departmentName),
    location: locationLabel(indiaLocation),
    city: normalizeWhitespace(indiaLocation.city),
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl,
    applyUrl,
    employmentType: job.jobType === 2 || job.jobType === '2' ? 'Full Time' : null,
    experienceRequired: normalizeWhitespace(job.experience),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: Array.isArray(job.skillNames)
      ? job.skillNames.map(normalizeWhitespace).filter(Boolean)
      : [],
    postingDate: normalizeDate(job.publishedOn),
    closingDate: null,
    jobDescription: normalizeWhitespace(job.description),
    remoteStatus: /remote/i.test(locationLabel(indiaLocation)) ? 'Remote' : 'On-site',
    compensation: normalizeWhitespace(job.salaryRangeFormat),
  }
}

export const extractSearchResults = (jobs, departments = []) => {
  const departmentsById = departments instanceof Map ? departments : departmentMap(departments)
  return unwrapList(jobs).map((job) => mapJob(job, departmentsById)).filter(Boolean)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/javascript,*/*;q=0.8' },
  label: 'gocomet-html',
  timeoutMs: 15000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: { 'User-Agent': USER_AGENT, Accept: 'application/json,text/plain,*/*' },
  label: 'gocomet-json',
  timeoutMs: 15000,
})

export const createGoCometScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const fetchJson = options.fetchJson || defaultFetchJson
    const nowValue = options.now || now

    await fetchText(CAREER_PAGE_URL)
    await fetchText(EMBED_CONFIG_URL)
    const [activeJobs, departments] = await Promise.all([
      fetchJson(ACTIVE_JOBS_URL),
      fetchJson(DEPARTMENTS_URL),
    ])

    return extractSearchResults(activeJobs, departments).map((job) => ({
      ...job,
      source: 'gocomet',
      link: job.applyUrl,
      scrapedAt: nowValue(),
    }))
  },
})

export const run = async (options = {}) => createGoCometScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running GoComet scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'gocomet')
    console.log('DB result:', result)
    process.exit(0)
  }
}
