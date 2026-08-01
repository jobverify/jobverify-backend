import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { LYBRATE_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = LYBRATE_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const JOBS_PAGE_URL = PROVIDER_METADATA.jobsPageUrl
export const ABOUT_PAGE_URL = PROVIDER_METADATA.aboutPageUrl
export const JOBS_API_URL = PROVIDER_METADATA.embeddedJobsApiUrl

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const extractTitle = (html = '') => normalizeWhitespace(
  String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
)

export const hasOfficialJobsPageSignal = (html = '') => {
  const page = String(html ?? '')
  const title = extractTitle(page) || ''
  const text = (normalizeWhitespace(page) || '').toLowerCase()

  return title === 'Jobs - Lybrate'
    && text.includes('come work with us')
    && text.includes('current openings')
    && page.includes(JOBS_API_URL)
    && page.includes('https://www.lybrate.com/delhi/dentist')
    && page.includes('https://www.lybrate.com/jobs')
}

export const hasOfficialAboutPageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page) || ''

  return text.includes('Be a part of Lybrate.')
    && text.includes("We're Hiring")
    && page.includes('href="https://www.lybrate.com/jobs"')
}

export const isDeadEmbeddedJobsApiResponse = (payload) =>
  Boolean(payload)
  && !Array.isArray(payload)
  && payload.ok === false
  && normalizeWhitespace(payload.error) === 'Document not found'

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'lybrate-official',
  timeoutMs: 15000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json, text/plain, */*',
  },
  label: 'lybrate-jobs-api',
  timeoutMs: 15000,
})

export const createLybrateScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
  } = {}) {
    const jobsHtml = await fetchText(JOBS_PAGE_URL)
    if (!hasOfficialJobsPageSignal(jobsHtml)) {
      throw new Error('Lybrate verified official jobs page no longer matches the verified public surface')
    }

    const aboutHtml = await fetchText(ABOUT_PAGE_URL)
    if (!hasOfficialAboutPageSignal(aboutHtml)) {
      throw new Error('Lybrate verified official about-page hiring CTA no longer matches the verified public surface')
    }

    const apiPayload = await fetchJson(JOBS_API_URL)
    if (!isDeadEmbeddedJobsApiResponse(apiPayload)) {
      throw new Error('Lybrate embedded jobs API no longer matches the verified dead public surface')
    }

    return []
  },
})

export const run = async (options = {}) => createLybrateScraper().run(options)

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
