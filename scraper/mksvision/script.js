import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'mksvision'
export const COMPANY = 'MKS Vision'
export const HOMEPAGE_URL = 'https://mksvision.com/'
export const CAREER_PAGE_URL = 'https://mksvision.com/career'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const removeHtmlComments = (value) => String(value ?? '').replace(/<!--[\s\S]*?-->/g, '')

const stripTags = (value) => normalizeWhitespace(value)

const absoluteUrl = (value, baseUrl = CAREER_PAGE_URL) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, baseUrl).toString()
  } catch {
    return null
  }
}

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return /<title>\s*MKS Vision\s*<\/title>/i.test(page)
    && /A Preferred Technology Partner/i.test(normalized)
    && /Connecting Insights, Ideas & Innovation/i.test(normalized)
    && /href=["'](?:https?:\/\/mksvision\.com)?\/?career["']/i.test(page)
}

export const hasOfficialCareerSignal = (html) => {
  const page = removeHtmlComments(String(html ?? ''))
  const jobs = [...page.matchAll(/<div class=["']row career-list["']>([\s\S]*?)<\/div>\s*(?=<div class=["']row career-list["']|<\/section>|<\/article>)/gi)]

  return /<title>\s*MKS Vision\s*<\/title>/i.test(page)
    && /<h1[^>]*>\s*Career\s*<\/h1>/i.test(page)
    && /We are Hiring/i.test(page)
    && /class=["']modelApply["']/i.test(page)
    && jobs.length > 0
}

const extractJobRows = (html) => {
  const page = removeHtmlComments(String(html ?? ''))
  const rows = [...page.matchAll(/<div class=["']row career-list["']>([\s\S]*?)<\/div>\s*(?=<div class=["']row career-list["']|<\/section>|<\/article>)/gi)]

  return rows.map((match, index) => {
    const rowHtml = match[1]
    const title = stripTags(rowHtml.match(/class=["']col-md-6 job-titile["'][^>]*>([\s\S]*?)<\/div>/i)?.[1])
    const experienceRequired = stripTags(rowHtml.match(/class=["']col-md-3 job-exp["'][^>]*>([\s\S]*?)<\/div>/i)?.[1])
    const applyUrl = absoluteUrl(rowHtml.match(/<a[^>]+href=["']([^"']+)["'][^>]*>\s*Apply\s*<\/a>/i)?.[1])

    if (!title || !experienceRequired || !applyUrl) return null

    const jobSlug = slugify(`${title}-${index + 1}`)
    const jobId = `${SOURCE}-${jobSlug}`

    return {
      title,
      company: COMPANY,
      department: null,
      location: null,
      city: null,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: `${CAREER_PAGE_URL}#${jobId}`,
      applyUrl,
      employmentType: null,
      experienceRequired,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    }
  }).filter(Boolean)
}

export const extractPublicListings = (html) => {
  if (!hasOfficialCareerSignal(html)) {
    throw new Error('MKS Vision official careers page no longer matches the verified public surface')
  }

  return extractJobRows(html)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createMksVisionScraper = ({ maxJobs = null } = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('MKS Vision official homepage no longer matches the verified first-party surface')
    }

    const careersHtml = await fetchText(CAREER_PAGE_URL)
    const jobs = extractPublicListings(careersHtml)
    const selectedJobs = Number.isInteger(maxJobs) ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createMksVisionScraper().run()

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
