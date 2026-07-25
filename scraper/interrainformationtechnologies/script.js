import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'

import { INTERRA_INFORMATION_TECHNOLOGIES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = INTERRA_INFORMATION_TECHNOLOGIES_CATALOG.source
export const COMPANY = INTERRA_INFORMATION_TECHNOLOGIES_CATALOG.companyName
export const CAREERS_URL = INTERRA_INFORMATION_TECHNOLOGIES_CATALOG.companyCareerPage
export const JOBS_API_URL = INTERRA_INFORMATION_TECHNOLOGIES_CATALOG.jobsApiUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#8217;|&#39;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim()

const decodeHtml = (value) => normalizeWhitespace(value)

const extractFirst = (pattern, html = '') => decodeHtml(String(html).match(pattern)?.[1] ?? '')

const extractListItems = (sectionTitle, html = '') => {
  const match = String(html).match(new RegExp(`<h[23][^>]*>${sectionTitle}<\\/h[23]>([\\s\\S]*?)(?:<h[23][^>]*>|$)`, 'i'))
  if (!match) return []

  return [...match[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((item) => decodeHtml(item[1]))
    .filter(Boolean)
}

const parseLocation = (html = '') => {
  const value = extractFirst(/<strong>\s*Location\s*<\/strong>\s*:?\s*([^<]+)/i, html)
    || extractFirst(/\bLocation\b\s*:?\s*([^<]+)/i, html)

  if (!value) return { location: null, city: null, state: null, country: null }

  const parts = value.split(',').map((part) => part.trim()).filter(Boolean)
  return {
    location: parts.join(', '),
    city: parts[0] || null,
    state: parts[1] || null,
    country: parts[2] || null,
  }
}

const parseJobDescription = (html = '') => {
  const explicit = extractFirst(/<h[23][^>]*>\s*(?:JOB DESCRIPTION|Job Description)\s*<\/h[23]>([\s\S]*?)(?:<h[23][^>]*>|$)/i, html)
  const responsibilities = extractListItems('Responsibilities', html)
  const requirements = extractListItems('What You Will Have', html)

  return [explicit, ...responsibilities, ...requirements]
    .map((item) => normalizeWhitespace(item))
    .filter(Boolean)
    .join(' ')
    || null
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Careers at Ferfier Technologies\s*\|\s*Shape the Future with Innovation\s*<\/title>/i.test(page)
    && normalized.includes('Join Our Team and Shape the Future')
    && normalized.includes('Open Positions')
    && /\/jobs\//i.test(page)
}

export const extractJobsFromApi = (payload = []) => (Array.isArray(payload) ? payload : [])
  .map((entry) => {
    const contentHtml = String(entry?.content?.rendered ?? '')
    const locationData = parseLocation(contentHtml)
    const title = decodeHtml(entry?.title?.rendered)

    return {
      title,
      company: COMPANY,
      ...locationData,
      jobId: String(entry?.id ?? ''),
      requisitionId: String(entry?.id ?? ''),
      sourceUrl: decodeHtml(entry?.link),
      applyUrl: decodeHtml(entry?.link),
      postingDate: String(entry?.date ?? '').slice(0, 10) || null,
      jobDescription: parseJobDescription(contentHtml),
      requiredSkills: [],
    }
  })
  .filter((job) => job.title && job.sourceUrl && job.country === 'India')

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createInterraInformationTechnologiesScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, fetchJson = defaultFetchJson } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Interra Information Technologies verified careers shell no longer matches the pinned first-party surface')
    }

    const payload = await fetchJson(JOBS_API_URL)
    if (!Array.isArray(payload)) {
      throw new Error('Interra Information Technologies public jobs API no longer returns the verified array payload')
    }

    return extractJobsFromApi(payload).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createInterraInformationTechnologiesScraper().run(options)

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
