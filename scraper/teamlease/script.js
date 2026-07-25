import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_URL = 'https://group.teamlease.com/jobs/'
export const CAREERS_API_URL = 'https://group.teamlease.com/wp-json/wp/v2/awsm_job_openings'
export const PAGE_SIZE = 100

const COMPANY = 'Teamlease'
const SOURCE = 'teamlease'
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

const stripTags = (value) => normalizeText(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/section|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

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

export const buildSearchUrl = (page, pageSize = PAGE_SIZE) => {
  const url = new URL(CAREERS_API_URL)
  url.searchParams.set('_fields', 'id,link,title,content,class_list')
  url.searchParams.set('per_page', String(pageSize))
  url.searchParams.set('page', String(page))
  return url.toString()
}

export const extractSearchResults = (records) => (Array.isArray(records) ? records : [])
  .map((record) => {
    const classList = Array.isArray(record?.class_list) ? record.class_list : []
    const title = normalizeText(record?.title?.rendered)
    const jobId = record?.id == null ? null : String(record.id)
    const sourceUrl = normalizeText(record?.link)
    const city = classSlugToLabel(getClassSlug(classList, 'job-location-'))
    const department = classSlugToLabel(getClassSlug(classList, 'job-category-'))
    const employmentType = classSlugToLabel(getClassSlug(classList, 'job-type-'))

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
      remoteStatus: 'On-site',
    }
  })
  .filter((job) => job.title && job.jobId && job.sourceUrl && job.location)

const extractListItems = (html) => [...String(html ?? '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

export const extractJobDetail = (html, listing = {}) => {
  const title = stripTags(String(html ?? '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]) || listing.title || null
  const department = normalizeText(String(html ?? '').match(/Job Category:\s*([^<\n]+)/i)?.[1]) || listing.department || null
  const employmentType = normalizeText(String(html ?? '').match(/Job Type:\s*([^<\n]+)/i)?.[1]) || listing.employmentType || null
  const city = normalizeText(String(html ?? '').match(/Job Location:\s*([^<\n]+)/i)?.[1]) || listing.city || null
  const requiredSkills = extractListItems(
    String(html ?? '').match(/<section[^>]*id=['"]jobDescription['"][^>]*>([\s\S]*?)<\/section>/i)?.[1] || html,
  )
  const formAction = normalizeText(String(html ?? '').match(/<form[^>]+action=['"]([^'"]+)['"][^>]*>/i)?.[1])
  const description = stripTags(
    String(html ?? '').match(/<section[^>]*id=['"]jobDescription['"][^>]*>([\s\S]*?)<\/section>/i)?.[1],
  ) || listing.jobDescription || null

  return {
    ...listing,
    title,
    company: COMPANY,
    department,
    location: toLocationLabel(city) || listing.location || null,
    city: city || listing.city || null,
    country: city ? 'India' : (listing.country || 'India'),
    applyUrl: formAction || listing.applyUrl || listing.sourceUrl || null,
    employmentType,
    requiredSkills,
    jobDescription: description,
    remoteStatus: 'On-site',
  }
}

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

export const createTeamleaseScraper = ({
  pageSize = PAGE_SIZE,
} = {}) => ({
  async run({
    fetchJson = defaultFetchJson,
    fetchText = defaultFetchText,
    maxJobs = null,
    now = () => new Date().toISOString(),
  } = {}) {
    const jobs = []

    for (let page = 1; ; page += 1) {
      const pageRecords = await fetchJson(buildSearchUrl(page, pageSize))
      const listings = extractSearchResults(pageRecords)

      for (const listing of listings) {
        const detailHtml = await fetchText(listing.sourceUrl)
        const detail = extractJobDetail(detailHtml, listing)

        jobs.push({
          ...detail,
          source: SOURCE,
          link: detail.applyUrl || detail.sourceUrl,
          scrapedAt: now(),
        })

        if (maxJobs && jobs.length >= maxJobs) {
          return jobs
        }
      }

      if (!Array.isArray(pageRecords) || pageRecords.length < pageSize) break
    }

    return jobs
  },
})

export const run = async (options = {}) => createTeamleaseScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Teamlease scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
