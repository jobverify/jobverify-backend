import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { VEE_HEALTHTEK_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = VEE_HEALTHTEK_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName

export const CAREER_PAGE_URLS = [
  'https://careers.veehealthtek.com/current-openings',
  'https://careers.veehealthtek.com/current-openings/other-job-openings',
]

const EXCLUDED_ENDPOINTS = new Set([
  'https://careers.veehealthtek.com/jobs/usa_jobs',
  'https://careers.veehealthtek.com/jobs/philippines_jobs',
])

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&#x27;|&#8217;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const decodeHtml = (value) => normalizeWhitespace(String(value ?? ''))

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

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
    Accept: 'application/json,text/javascript,*/*;q=0.01',
    'X-Requested-With': 'XMLHttpRequest',
  },
  label: `${SOURCE}-json`,
  timeoutMs: 15000,
})

const toAbsoluteUrl = (value) => {
  try {
    return new URL(value, CAREER_PAGE_URLS[0]).toString()
  } catch {
    return null
  }
}

const extractAnchorHref = (html = '') => {
  const href = String(html ?? '').match(/href="([^"]+)"/i)?.[1]
  return href ? toAbsoluteUrl(href) : null
}

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  const raw = String(html ?? '')

  return (normalized.includes('Vee Healthtek') || normalized.includes('IT Support') || normalized.includes('Current Openings'))
    && raw.includes('yajra-datatable')
    && /https:\/\/careers\.veehealthtek\.com\/jobs\//i.test(raw)
}

export const extractEndpointUrls = (html = '') => [...new Set(
  [...String(html ?? '').matchAll(/https:\/\/careers\.veehealthtek\.com\/jobs\/[A-Za-z_]+/g)]
    .map((match) => match[0])
    .filter((url) => !EXCLUDED_ENDPOINTS.has(url)),
)]

export const buildEndpointUrl = (baseUrl) => {
  const url = new URL(baseUrl)
  url.searchParams.set('draw', '1')
  url.searchParams.set('start', '0')
  url.searchParams.set('length', '100')
  return url.toString()
}

export const mapJob = (record = {}) => {
  const title = decodeHtml(record.title)
  const detailUrl = extractAnchorHref(record.description)
  const applyUrl = extractAnchorHref(record.action)
  const location = decodeHtml(record.location)
  const experience = decodeHtml(record.hiring_category)

  if (!title || !detailUrl || !applyUrl || !location) return null
  if (!/india|bangalore|bengaluru|chennai|hyderabad|mohali|pune|salem|trichy/i.test(location)) return null

  return {
    title,
    company: COMPANY,
    department: decodeHtml(record.domain) || null,
    location: /india/i.test(location) ? location : `${location}, India`,
    city: decodeHtml(location.split(',')[0].split('&')[0]),
    country: 'India',
    jobId: String(record.job_id ?? '').trim() || slugify(title),
    requisitionId: String(record.job_id ?? '').trim() || slugify(title),
    sourceUrl: detailUrl,
    applyUrl,
    employmentType: 'Full Time',
    experienceRequired: experience || null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: decodeHtml(record.domain),
  }
}

export const createVeeHealthtekScraper = () => ({
  async run({ fetchText = defaultFetchText, fetchJson = defaultFetchJson, now = () => new Date().toISOString() } = {}) {
    const discoveredEndpoints = new Set()

    for (const url of CAREER_PAGE_URLS) {
      const html = await fetchText(url)
      if (!hasOfficialCareersSignal(html)) {
        throw new Error('The verified Vee Healthtek careers page no longer matches the trusted first-party surface')
      }

      for (const endpoint of extractEndpointUrls(html)) {
        discoveredEndpoints.add(endpoint)
      }
    }

    if (discoveredEndpoints.size === 0) {
      throw new Error('The verified Vee Healthtek careers pages no longer expose public jobs endpoints')
    }

    const jobs = []
    for (const endpoint of discoveredEndpoints) {
      const payload = await fetchJson(buildEndpointUrl(endpoint))
      const records = Array.isArray(payload?.data) ? payload.data : []
      for (const record of records) {
        const mapped = mapJob(record)
        if (mapped) jobs.push(mapped)
      }
    }

    const deduped = [...new Map(jobs.map((job) => [job.jobId, job])).values()]
    if (deduped.length === 0) {
      throw new Error('The verified Vee Healthtek public jobs endpoints no longer return trusted India openings')
    }

    return deduped.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createVeeHealthtekScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
