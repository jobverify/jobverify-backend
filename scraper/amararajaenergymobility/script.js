import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const CAREERS_ORIGIN = 'https://amararajacareers.peoplestrong.com'
export const JOBS_API_URL = `${CAREERS_ORIGIN}/api/cp/rest/altone/cp/jobs/v1?offset=0&limit=45`
const JOBS_API_PATH = `${CAREERS_ORIGIN}/api/cp/rest/altone/cp/jobs/v1`
const PAGE_SIZE = 45
const COMPANY_NAME = 'Amara Raja Energy & Mobility Ltd'
const SOURCE = 'amararajaenergymobility'

const normalize = (value) => {
  if (value == null) return null
  const result = String(value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
  return result || null
}

const extractCity = (location) => normalize(location)?.split(',')[0]?.trim() || null

const isAmaraRajaEnergyMobility = (record) =>
  /amara raja energy\s*&?\s*mobility/i.test(
    `${record?.organizationUnitComplete || ''} ${record?.organizationUnit || ''}`,
  )

const flattenSkills = (skills) => [...new Set(
  ['mustTohave', 'goodtohave']
    .flatMap((key) => Array.isArray(skills?.[key]) ? skills[key] : [])
    .map(normalize)
    .filter(Boolean),
)]

export const extractSearchResults = (payload = {}) =>
  (Array.isArray(payload.response) ? payload.response : [])
    .filter(isAmaraRajaEnergyMobility)
    .map((record) => {
      const title = normalize(record.jobTitle)
      const jobId = normalize(record.jobCode || record.requisitionId)
      const sourceUrl = normalize(record.jobDetailUrl) || (jobId ? `${CAREERS_ORIGIN}/job/detail/${jobId}` : null)
      const location = normalize(record.locationHierarchy)

      if (!title || !jobId || !sourceUrl) return null

      return {
        title,
        company: COMPANY_NAME,
        department: normalize(record.organizationUnit),
        location,
        city: extractCity(location),
        jobId,
        requisitionId: normalize(record.requisitionId) || jobId,
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: normalize(record.employmentTenureType),
        experienceRequired: normalize(record.expRange),
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: flattenSkills(record.skills),
        postingDate: normalize(record.jobPostedDate),
        closingDate: normalize(record.jobClosureDate),
        jobDescription: null,
      }
    })
    .filter(Boolean)

const defaultFetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body,
  })

  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.json()
}

export const run = async ({
  fetchJson = defaultFetchJson,
  maxPages = Number.POSITIVE_INFINITY,
  maxJobs = null,
} = {}) => {
  const jobs = []

  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * PAGE_SIZE
    const url = `${JOBS_API_PATH}?offset=${offset}&limit=${PAGE_SIZE}`
    const payload = await fetchJson(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Origin: CAREERS_ORIGIN,
        Referer: `${CAREERS_ORIGIN}/home`,
      },
      body: JSON.stringify({ offset, limit: PAGE_SIZE }),
    })

    const pageJobs = extractSearchResults(payload)
    for (const job of pageJobs) {
      jobs.push({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: new Date().toISOString(),
      })
      if (Number.isInteger(maxJobs) && jobs.length >= maxJobs) return jobs.slice(0, maxJobs)
    }

    const totalRecords = Number.parseInt(String(payload.totalRecords ?? ''), 10)
    const recordsOnPage = Array.isArray(payload.response) ? payload.response.length : 0
    if (recordsOnPage < PAGE_SIZE || (Number.isFinite(totalRecords) && offset + recordsOnPage >= totalRecords)) break
  }

  return jobs
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(path.dirname(fileURLToPath(import.meta.url)), 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    console.log('DB result:', await saveToDB(jobs, SOURCE))
  }
}
