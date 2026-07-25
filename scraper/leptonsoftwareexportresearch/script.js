import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'

import LEPTON_SOFTWARE_EXPORT_RESEARCH_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = LEPTON_SOFTWARE_EXPORT_RESEARCH_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const JOBS_API_URL = PROVIDER_METADATA.jobsApiUrl

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&#x27;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

export const hasOfficialLeptonCareersSignals = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page) || ''

  return /<title[^>]*>\s*Careers at Lepton Software/i.test(page)
    && text.includes('For job-related queries email us at')
    && /https:\/\/leptonsoftware\.keka\.com\/careers\/api\/jobs\/default\/active/i.test(page)
}

const isIndiaLocation = (location = {}) =>
  String(location.countryCode ?? '').toUpperCase() === 'IN'
  || /\bindia\b/i.test(String(location.countryName ?? ''))

const buildJobUrl = (jobId) => `https://leptonsoftware.keka.com/careers/jobdetails/${jobId}`

export const extractJobs = (payload = []) =>
  (Array.isArray(payload) ? payload : [])
    .map((job) => {
      const jobId = normalizeWhitespace(job.id)
      const title = normalizeWhitespace(job.title)
      const location = Array.isArray(job.jobLocations)
        ? job.jobLocations.find(isIndiaLocation) || job.jobLocations[0]
        : null
      if (!jobId || !title || !location) return null

      const city = normalizeWhitespace(location.city || location.name)
      const state = normalizeWhitespace(location.state)
      const country = normalizeWhitespace(location.countryName) || 'India'
      const sourceUrl = buildJobUrl(jobId)

      return {
        title,
        company: COMPANY,
        department: normalizeWhitespace(job.departmentName),
        location: [city, state, country].filter(Boolean).join(', '),
        city,
        country,
        jobId,
        requisitionId: normalizeWhitespace(job.jobNumber),
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: normalizeWhitespace(job.jobType) === '2' || job.jobType === 2 ? 'Full Time' : null,
        experienceRequired: normalizeWhitespace(job.experience),
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: Array.isArray(job.skillNames)
          ? job.skillNames.map((skill) => normalizeWhitespace(skill)).filter(Boolean)
          : [],
        postingDate: normalizeWhitespace(job.publishedOn)?.slice(0, 10) || null,
        closingDate: null,
        jobDescription: normalizeWhitespace(job.description || job.excerpt),
      }
    })
    .filter(Boolean)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: `${SOURCE}-html`,
  timeoutMs: 15000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
  },
  label: `${SOURCE}-json`,
  timeoutMs: 20000,
})

export const createLeptonSoftwareExportResearchScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialLeptonCareersSignals(careersHtml)) {
      throw new Error('Lepton verified first-party careers page no longer matches the pinned Keka jobs surface')
    }

    const jobs = extractJobs(await fetchJson(JOBS_API_URL))

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createLeptonSoftwareExportResearchScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
