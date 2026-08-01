import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { CLASSPLUS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = CLASSPLUS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const API_URL = 'https://crm.classplus.co/ts/jobs/get-job-list?'
export const DETAIL_URL = 'https://classplusapp.com/careers/job-description?jobId='

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

const toText = (value) => {
  const normalized = normalizeWhitespace(value)
  return normalized || null
}

export const extractJobs = (payload = {}) => {
  const jobs = payload?.data?.Jobs
  if (!Array.isArray(jobs)) return []

  return jobs
    .filter((job) => job && job.department !== 'VIDU')
    .map((job) => {
      const jobId = toText(job.jobId)
      const title = toText(job.title)
      const location = toText(job.locationCity)
      const detailUrl = jobId ? `${DETAIL_URL}${encodeURIComponent(jobId)}` : null

      if (!jobId || !title || !location || !detailUrl) return null

      return {
        title,
        company: COMPANY,
        department: toText(job.department),
        location,
        city: location,
        country: 'India',
        jobId,
        requisitionId: jobId,
        sourceUrl: detailUrl,
        applyUrl: detailUrl,
        employmentType: toText(job.employeeType),
        experienceRequired: toText(job.experienceRequired),
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: toText(job.postingDate),
        closingDate: null,
        jobDescription: toText(job.jobDescription || job.description),
        remoteStatus: /remote/i.test(`${job.employeeType ?? ''} ${location}`)
          ? 'Remote'
          : 'On-site',
      }
    })
    .filter(Boolean)
}

const defaultFetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Referer: CAREERS_URL,
      'User-Agent': 'Mozilla/5.0 (compatible; JobifyCareerScraper/1.0)',
    },
  })

  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.json()
}

export const createClassplusScraper = () => ({
  async run({ fetchJson = defaultFetchJson } = {}) {
    const jobs = extractJobs(await fetchJson(API_URL))

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createClassplusScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
