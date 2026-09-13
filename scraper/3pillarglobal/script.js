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

const defaultFetchText = (url, { signal } = {}) => fetchTextWithRetry(url, {
  signal,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchJson = (url, { signal } = {}) => fetchJsonWithRetry(url, {
  signal,
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

      if (!title || !location || !sourceUrl || !normalizeWhitespace(job?.id)) return null

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

const extractBoardPostingIds = (html) => {
  const board = new URL(LEVER_BOARD_URL)
  const prefix = board.pathname.replace(/\/+$/, '') + '/'
  const ids = new Set()
  for (const match of String(html).matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)) {
    try {
      const url = new URL(normalizeWhitespace(match[1]), LEVER_BOARD_URL)
      if (url.origin !== board.origin || !url.pathname.startsWith(prefix)) continue
      const parts = url.pathname.slice(prefix.length).split('/').filter(Boolean)
      if (parts.length === 1 || parts.length === 2 && parts[1] === 'apply') ids.add(parts[0])
    } catch { /* Ignore unrelated invalid navigation links. */ }
  }
  return ids
}

export const createThreePillarGlobalScraper = ({
  now = () => new Date().toISOString(),
  maxJobs = Number.POSITIVE_INFINITY,
} = {}) => ({
  async run({ signal, fetchText = defaultFetchText, fetchJson = defaultFetchJson } = {}) {
    if (maxJobs !== Infinity && (!Number.isInteger(maxJobs) || maxJobs <= 0)) {
      throw new Error('3Pillar maxJobs must be a positive integer or Infinity')
    }
    const request = async (fetcher, url, options = {}) => {
      signal?.throwIfAborted()
      try { return await fetcher(url, { ...options, signal }) }
      finally { signal?.throwIfAborted() }
    }
    const careersHtml = await request(fetchText, CAREERS_URL)
    if (!hasOfficialThreePillarCareersSignal(careersHtml)) {
      throw new Error('3Pillar Global verified official careers surface changed')
    }

    const boardHtml = await request(fetchText, LEVER_BOARD_URL)
    if (!hasOfficialThreePillarLeverBoardSignal(boardHtml)) {
      throw new Error('3Pillar Global official Lever board changed')
    }

    const payload = await request(fetchJson, LEVER_API_URL)
    if (!Array.isArray(payload)) throw new Error('3Pillar Global Lever postings payload is not an array')
    const jobs = extractLeverJobs(payload)
    if (jobs.length !== payload.length || new Set(jobs.map((job) => job.jobId)).size !== jobs.length) {
      throw new Error('3Pillar Global incomplete Lever postings payload')
    }

    const boardIds = extractBoardPostingIds(boardHtml)
    const apiIds = new Set(jobs.map(job => job.jobId))
    if (boardIds.size && (boardIds.size !== apiIds.size || [...boardIds].some(id => !apiIds.has(id)))) {
      throw new Error('3Pillar Global incomplete Lever inventory: board and API job IDs disagree')
    }

    return jobs.slice(0, maxJobs).map((job) => ({
      ...job,
      ...(jobs.length > maxJobs ? { sourceListingComplete: false } : {}),
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
