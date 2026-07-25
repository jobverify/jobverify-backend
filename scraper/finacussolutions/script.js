import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { FINACUS_SOLUTIONS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = FINACUS_SOLUTIONS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const CAREERS_PAGE_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  const normalized = String(value ?? '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;|&#x27;|&rsquo;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

export const hasOfficialCareersPageSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const text = normalizeWhitespace(rawHtml) || ''

  return text.includes('Current Openings')
    && text.includes('Apply Now')
    && text.includes('Finacus Solutions Private Limited')
    && extractOpeningCards(rawHtml).length > 0
}

const extractOpeningCards = (html = '') => [...String(html ?? '').matchAll(
  /<a\b[^>]*data-id="([^"]+)"[^>]*data-career-position="([^"]+)"[^>]*>/gi,
)]
  .map((match) => ({
    jobId: normalizeWhitespace(match[1]),
    title: normalizeWhitespace(match[2]),
  }))
  .filter((card) => card.jobId && card.title)

export const extractSearchResults = (html = '') => {
  const seenJobIds = new Set()

  return extractOpeningCards(html)
    .filter((card) => {
      if (seenJobIds.has(card.jobId)) return false
      seenJobIds.add(card.jobId)
      return true
    })
    .map((card) => ({
      title: card.title,
      company: COMPANY,
      department: null,
      location: 'India',
      city: null,
      state: null,
      country: 'India',
      jobId: card.jobId,
      requisitionId: card.jobId,
      sourceUrl: CAREERS_PAGE_URL,
      applyUrl: CAREERS_PAGE_URL,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: null,
    }))
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createFinacusSolutionsScraper = ({
  maxJobs = null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const careersHtml = await fetchText(CAREERS_PAGE_URL)

    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Finacus Solutions verified official careers page no longer matches the trusted first-party surface')
    }

    const jobs = extractSearchResults(careersHtml)
    if (jobs.length === 0) {
      throw new Error('Finacus Solutions verified careers page no longer exposes the expected first-party role cards')
    }

    const selectedJobs = Number.isFinite(maxJobs) ? jobs.slice(0, maxJobs) : jobs
    const scrapedAt = (overrideNow || now)()

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt,
    }))
  },
})

export const run = async (options = {}) => createFinacusSolutionsScraper(options).run(options)

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
