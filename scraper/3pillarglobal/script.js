import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import THREE_PILLAR_GLOBAL_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = THREE_PILLAR_GLOBAL_CATALOG.source
export const COMPANY = THREE_PILLAR_GLOBAL_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = THREE_PILLAR_GLOBAL_CATALOG.officialBrandName
export const CAREERS_URL = THREE_PILLAR_GLOBAL_CATALOG.companyCareerPage
export const LEVER_BOARD_URL = THREE_PILLAR_GLOBAL_CATALOG.officialLeverBoardUrl
export const LEVER_API_URL = THREE_PILLAR_GLOBAL_CATALOG.leverApiUrl
export const VERIFIED_ON = THREE_PILLAR_GLOBAL_CATALOG.verifiedOn
export const COMPANY_DOMAIN = THREE_PILLAR_GLOBAL_CATALOG.companyDomain
export const PROVIDER_METADATA = THREE_PILLAR_GLOBAL_CATALOG

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobverify scraper)'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&#x27;|&#8217;/gi, "'")
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeLocation = (value) => normalizeWhitespace(value).replace(/\s*,\s*/g, ', ')

const normalizeCountry = (value) => {
  const location = normalizeLocation(value)
  if (/india/i.test(location)) return 'India'
  if (/canada/i.test(location)) return 'Canada'
  if (/romania/i.test(location)) return 'Romania'
  if (/mexico/i.test(location)) return 'Mexico'
  if (/usa|united states/i.test(location)) return 'United States'
  return location.split(',').pop()?.trim() || null
}

const inferCity = (value) => {
  const location = normalizeLocation(value)
  if (!location || /remote/i.test(location)) return null
  return location.split(',')[0]?.trim() || null
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml',
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

export const hasOfficialThreePillarCareersSignal = (html) =>
  /3Pillar Career Opportunities/i.test(String(html))

export const hasOfficialThreePillarLeverBoardSignal = (html) =>
  /Job openings at 3Pillar/i.test(String(html))

export const extractLeverJobs = (jobs = []) =>
  (Array.isArray(jobs) ? jobs : [])
    .map((job) => {
      const title = normalizeWhitespace(job?.text)
      const location = normalizeLocation(job?.categories?.location)
      const sourceUrl = normalizeWhitespace(job?.hostedUrl)
      const applyUrl = normalizeWhitespace(job?.applyUrl) || sourceUrl

      if (!title || !location || !sourceUrl) return null

      return {
        title,
        company: COMPANY,
        department: normalizeWhitespace(job?.categories?.team || job?.categories?.department) || null,
        location,
        city: inferCity(location),
        country: normalizeCountry(location),
        jobId: normalizeWhitespace(job?.id),
        requisitionId: normalizeWhitespace(job?.id),
        sourceUrl,
        applyUrl,
        employmentType: normalizeWhitespace(job?.categories?.commitment) || null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: Number.isFinite(job?.createdAt) ? new Date(job.createdAt).toISOString() : null,
        closingDate: null,
        jobDescription: normalizeWhitespace(
          job?.descriptionPlain
            || job?.descriptionBodyPlain
            || job?.lists?.find((item) => item?.text)?.text,
        ),
        remoteStatus: /remote/i.test(location) ? 'Remote' : null,
      }
    })
    .filter(Boolean)

export const createThreePillarGlobalScraper = ({
  now = () => new Date().toISOString(),
  maxJobs = Number.POSITIVE_INFINITY,
} = {}) => ({
  async run({ fetchText = defaultFetchText, fetchJson = defaultFetchJson } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialThreePillarCareersSignal(careersHtml)) {
      throw new Error('3Pillar Global verified official careers surface changed')
    }

    const boardHtml = await fetchText(LEVER_BOARD_URL)
    if (!hasOfficialThreePillarLeverBoardSignal(boardHtml)) {
      throw new Error('3Pillar Global official Lever board changed')
    }

    const payload = await fetchJson(LEVER_API_URL)
    const jobs = extractLeverJobs(payload)
    if (jobs.length === 0) {
      throw new Error('3Pillar Global Lever postings payload no longer yields jobs')
    }

    return jobs.slice(0, maxJobs).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: now(),
      companyCareerPage: CAREERS_URL,
      companyDomain: COMPANY_DOMAIN,
      atsPlatform: 'lever',
    }))
  },
})

export const run = async (options = {}) => createThreePillarGlobalScraper().run(options)

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
