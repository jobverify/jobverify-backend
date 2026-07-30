import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry } from '../utils/fetch.js'

export const SOURCE = 'tripcom'
export const COMPANY = 'Trip.com'
export const CAREERS_URL = 'https://careers.trip.com/'
export const JOBS_API_URL = 'https://careers.trip.com/api/oversea/getOverseaJobAd'
export const PAGE_SIZE = 100
export const COUNTRY_CODE = 'IND'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const buildRequestBody = (page) => JSON.stringify({
  condition: {
    keyword: '',
    jobId: [],
    kind: [],
    country: [COUNTRY_CODE],
    city: [],
    bucode: [],
    jobFamilyGroupCode: [],
    jobFamilyCode: [],
  },
  pager: { index: String(page), size: String(PAGE_SIZE) },
  head: { language: 'en-US' },
})

const stripHtml = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;|&#8217;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim()

const normalizeDate = (value) => String(value ?? '').trim().slice(0, 10) || null

export const buildJobsRequestBody = buildRequestBody

export const extractJobsFromPayload = (payload = {}) => {
  if (payload?.retCode !== '201' || !Array.isArray(payload?.retValue?.recruitJobAdList)) {
    throw new Error('Trip.com official jobs API response contract changed')
  }

  return payload.retValue.recruitJobAdList.map((job) => {
    const location = String(job.cityName || job.city || '').trim()
    const sourceUrl = `${CAREERS_URL}#/job-detail?fromId=${encodeURIComponent(job.fromId || '')}&atsApiType=${encodeURIComponent(job.atsApiType || 'Moka_Overseas')}`

    return {
      title: stripHtml(job.jobTitle),
      company: COMPANY,
      department: job.jobFamilyGroupName || null,
      team: job.buName || null,
      location,
      city: location || null,
      country: 'India',
      jobId: String(job.id || job.jobId || ''),
      requisitionId: String(job.fromId || ''),
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: job.kindName?.trim() || job.kind || null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: normalizeDate(job.publishDate),
      closingDate: null,
      jobDescription: stripHtml(job.requirements),
    }
  }).filter((job) => job.title && job.location && job.jobId)
}

const defaultFetchJson = (url, options = {}) => fetchJsonWithRetry(url, {
  ...options,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (compatible; Jobify scraper)',
    ...(options.headers || {}),
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createTripcomScraper = () => ({
  async run({ fetchJson = defaultFetchJson, now = () => new Date().toISOString() } = {}) {
    const jobs = []
    let page = 1
    let total = 0

    do {
      const payload = await fetchJson(JOBS_API_URL, {
        method: 'POST',
        body: buildRequestBody(page),
      })
      const pageJobs = extractJobsFromPayload(payload)
      jobs.push(...pageJobs)
      total = Number(payload.retValue.total) || jobs.length
      page += 1

      if (pageJobs.length === 0) break
    } while (jobs.length < total)

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      companyCareerPage: CAREERS_URL,
      companyDomain: 'trip.com',
      atsPlatform: 'first-party-careers-api',
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createTripcomScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const jobs = await run()
  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
