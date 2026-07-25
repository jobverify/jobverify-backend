import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_URL = 'https://www.simplilearn.com/careers'
export const JOB_OPENINGS_URL = 'https://www.simplilearn.com/job-openings'
export const CAREERS_API_URL = 'https://www.simplilearn.com/wp-json/wp/v2/awsm_job_openings'
export const PAGE_SIZE = 100

const COMPANY = 'Simplilearn'
const SOURCE = 'simplilearn'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeText = (value) => {
  const normalized = decodeHtml(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const titleCase = (value) => normalizeText(value)
  ?.split(/\s+/)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
  .join(' ') || null

const classSlugToLabel = (slug) => titleCase(String(slug ?? '').replace(/-/g, ' '))

const getClassSlug = (classList, prefix) => {
  const match = (Array.isArray(classList) ? classList : [])
    .find((className) => String(className).startsWith(prefix))

  return match ? String(match).slice(prefix.length) : null
}

const toLocationLabel = (city) => (city ? `${city}, India` : null)

const toRemoteStatus = (employmentType, city) => {
  const combined = `${employmentType || ''} ${city || ''}`.toLowerCase()
  if (combined.includes('remote')) return 'Remote'
  if (combined.includes('hybrid')) return 'Hybrid'
  return 'On-site'
}

export const hasOfficialCareersSignal = (html) =>
  /simplilearn/i.test(html || '')
  && /careers/i.test(html || '')
  && /href=['"][^'"]*\/job-openings[^'"]*['"]/i.test(html || '')

export const hasOfficialJobOpeningsSignal = (html) =>
  /simplilearn/i.test(html || '')
  && /job openings/i.test(html || '')

const assertVerifiedFeed = (records) => {
  if (!Array.isArray(records)) {
    throw new Error('Simplilearn feed no longer matches the verified WP Job Openings feed')
  }

  return records
}

export const buildSearchUrl = (page, pageSize = PAGE_SIZE) => {
  const url = new URL(CAREERS_API_URL)
  url.searchParams.set('_fields', 'id,link,title,content,class_list')
  url.searchParams.set('per_page', String(pageSize))
  url.searchParams.set('page', String(page))
  return url.toString()
}

export const extractSearchResults = (records) => assertVerifiedFeed(records)
  .map((record) => {
    const classList = Array.isArray(record?.class_list) ? record.class_list : []
    const title = normalizeText(record?.title?.rendered)
    const jobId = record?.id == null ? null : String(record.id)
    const sourceUrl = normalizeText(record?.link)
    const city = classSlugToLabel(getClassSlug(classList, 'job-location-'))
    const department = classSlugToLabel(getClassSlug(classList, 'job-category-'))
    const employmentType = classSlugToLabel(getClassSlug(classList, 'job-type-'))
    const remoteStatus = toRemoteStatus(employmentType, city)

    return {
      title,
      company: COMPANY,
      department,
      location: toLocationLabel(city),
      city,
      country: city ? 'India' : null,
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: normalizeText(record?.content?.rendered),
      remoteStatus,
    }
  })
  .filter((job) => job.title && job.jobId && job.sourceUrl)

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
  },
  label: SOURCE,
  timeoutMs: 30000,
})

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 30000,
})

export const createSimplilearnScraper = ({
  pageSize = PAGE_SIZE,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Simplilearn careers page no longer matches the verified official careers surface')
    }

    const jobOpeningsHtml = await fetchText(JOB_OPENINGS_URL)
    if (!hasOfficialJobOpeningsSignal(jobOpeningsHtml)) {
      throw new Error('Simplilearn job openings page no longer matches the verified official job openings surface')
    }

    const jobs = []

    for (let page = 1; ; page += 1) {
      const pageRecords = assertVerifiedFeed(await fetchJson(buildSearchUrl(page, pageSize)))

      jobs.push(...extractSearchResults(pageRecords).map((job) => ({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: now(),
      })))

      if (pageRecords.length < pageSize) break
    }

    return jobs
  },
})

export const run = async (options = {}) => createSimplilearnScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Simplilearn scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, SOURCE)
    console.log('DB result:', result)
    process.exit(0)
  }
}
