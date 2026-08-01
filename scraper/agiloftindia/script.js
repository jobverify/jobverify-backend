import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry } from '../../scraper-support/utils/fetch.js'
import AGILOFT_INDIA_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = AGILOFT_INDIA_CATALOG.source
export const COMPANY = AGILOFT_INDIA_CATALOG.companyName
export const CAREERS_ENTRY_URL = AGILOFT_INDIA_CATALOG.companyCareerPage
export const CAREERS_URL = AGILOFT_INDIA_CATALOG.companyCareerPage
export const ACCEPTED_CAREERS_URLS = [
  'https://www.agiloft.com/careers',
  'https://www.agiloft.com/careers/',
  'https://www.agiloft.com/about-us/careers',
  'https://www.agiloft.com/about-us/careers/',
]
export const LEVER_BOARD_URL = AGILOFT_INDIA_CATALOG.officialLeverBoardUrl
export const LEVER_API_URL = AGILOFT_INDIA_CATALOG.leverApiUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const DEFAULT_JSON_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'application/json',
}

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeText = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&'),
)?.toLowerCase() || ''

const normalizeComparableUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return String(value ?? '').replace(/\/$/, '')
  }
}

const sameUrl = (left, right) => normalizeComparableUrl(left) === normalizeComparableUrl(right)

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined
  }

  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: createTimeoutSignal(15000),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: DEFAULT_JSON_HEADERS,
  label: SOURCE,
})

const isAcceptedCareersUrl = (value) =>
  ACCEPTED_CAREERS_URLS.some((candidate) => sameUrl(value, candidate))

const extractCity = (location) => normalizeWhitespace(location)?.split(/\s+-\s+|,/)[0] || null

const toRemoteStatus = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (normalized === 'remote') return 'Remote'
  if (normalized === 'hybrid') return 'Hybrid'
  if (normalized === 'onsite' || normalized === 'on-site') return 'On-site'
  return null
}

const toIsoDateTime = (value) => {
  const timestamp = Number(value)
  if (!Number.isFinite(timestamp)) return null

  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const isIndiaJob = (job) => [
  job?.categories?.location,
  ...(Array.isArray(job?.categories?.allLocations) ? job.categories.allLocations : []),
].some((location) => /(^|[\s,-])india\b/i.test(normalizeWhitespace(location) || ''))

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = normalizeText(page)
  const hasLegacyCareersCopy = text.includes('why work at agiloft')
    && text.includes('find your seat')
    && text.includes('agiloft inc. all rights reserved')
    && /jobs\.lever\.co\/agiloft/i.test(page)
  const hasCurrentCareersCopy = text.includes('level up with us')
    && text.includes('agiloft careers')
    && (text.includes('financial career growth') || /financial-career-growth/i.test(page))
    && text.includes('agiloft inc')

  return hasLegacyCareersCopy || hasCurrentCareersCopy
}

export const extractLeverBoardUrl = (html) => {
  const match = String(html ?? '').match(/href=["'](https:\/\/jobs\.lever\.co\/agiloft\/?)["']/i)
  return match?.[1] ? match[1].replace(/\/$/, '') : null
}

export const hasOfficialLeverBoardSignal = (html) => {
  const page = String(html ?? '')
  const text = normalizeText(html)
  const hasLocationFilters = text.includes('location type')
    && text.includes('location')
    && text.includes('canada')
    && text.includes('united kingdom')
    && text.includes('united states')
  const hasTeamAndWorkFilters = text.includes('team') && text.includes('work type')
  const hasLeverPostingLinks = /https:\/\/jobs\.lever\.co\/agiloft\/[a-z0-9-]+/i.test(page)

  return text.includes('agiloft')
    && hasLocationFilters
    && hasTeamAndWorkFilters
    && hasLeverPostingLinks
}

export const extractLeverJobs = (leverJobs = []) => {
  if (!Array.isArray(leverJobs)) {
    throw new Error('Agiloft Lever postings payload no longer returns an array')
  }

  return leverJobs
    .filter(isIndiaJob)
    .map((job) => {
      const title = normalizeWhitespace(job?.text)
      const location = normalizeWhitespace(job?.categories?.location)
      const sourceUrl = normalizeWhitespace(job?.hostedUrl)
      const id = normalizeWhitespace(job?.id)

      if (!title || !location || !sourceUrl || !id) {
        throw new Error('Agiloft Lever postings payload no longer exposes the verified India job fields')
      }

      return {
        title,
        company: COMPANY,
        department: normalizeWhitespace(job?.categories?.team || job?.categories?.department),
        location,
        city: extractCity(location),
        country: 'India',
        jobId: id,
        requisitionId: id,
        sourceUrl,
        applyUrl: normalizeWhitespace(job?.applyUrl) || sourceUrl,
        employmentType: normalizeWhitespace(job?.categories?.commitment),
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: toIsoDateTime(job?.createdAt),
        closingDate: null,
        jobDescription: normalizeWhitespace(job?.descriptionPlain),
        remoteStatus: toRemoteStatus(job?.workplaceType),
      }
    })
}

export const createAgiloftIndiaScraper = ({
  now: defaultNow = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchJson = defaultFetchJson,
    now = defaultNow,
  } = {}) {
    const careersPage = await fetchPage(CAREERS_ENTRY_URL)

    if (
      careersPage.status !== 200
      || !isAcceptedCareersUrl(careersPage.url)
      || !hasOfficialCareersSignal(careersPage.html)
    ) {
      throw new Error('Agiloft verified official careers surface changed materially')
    }

    const leverBoardUrl = extractLeverBoardUrl(careersPage.html)
    if (leverBoardUrl && !sameUrl(leverBoardUrl, LEVER_BOARD_URL)) {
      throw new Error('Agiloft verified official careers surface no longer links to the verified public Lever board')
    }

    const leverBoardPage = await fetchPage(LEVER_BOARD_URL)
    if (
      leverBoardPage.status !== 200
      || !sameUrl(leverBoardPage.url, LEVER_BOARD_URL)
      || !hasOfficialLeverBoardSignal(leverBoardPage.html)
    ) {
      throw new Error('Agiloft verified public Lever board changed materially')
    }

    const scrapedAt = now()

    return extractLeverJobs(await fetchJson(LEVER_API_URL)).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt,
      companyCareerPage: CAREERS_URL,
      companyDomain: AGILOFT_INDIA_CATALOG.companyDomain,
      atsPlatform: AGILOFT_INDIA_CATALOG.atsPlatform,
    }))
  },
})

export const run = async (options = {}) => createAgiloftIndiaScraper().run(options)

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
