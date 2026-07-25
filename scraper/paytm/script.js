import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry } from '../utils/fetch.js'

import PAYTM_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = PAYTM_CATALOG.source
export const COMPANY = PAYTM_CATALOG.companyName
export const HOMEPAGE_URL = PAYTM_CATALOG.homepageUrl
export const CAREERS_URL = PAYTM_CATALOG.companyCareerPage
export const LEVER_BOARD_URL = PAYTM_CATALOG.officialLeverBoardUrl
export const LEVER_API_URL = PAYTM_CATALOG.leverApiUrl

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

const extractCity = (location) => normalizeWhitespace(location)?.split(/\s*[,/]\s*/)[0] || null

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

const isIndiaJob = (job) => {
  const country = normalizeWhitespace(job?.country)?.toUpperCase()
  const locations = [
    job?.categories?.location,
    ...(Array.isArray(job?.categories?.allLocations) ? job.categories.allLocations : []),
  ]
    .map((location) => normalizeWhitespace(location))
    .filter(Boolean)

  return country === 'IN'
    || locations.some((location) => /(^|[\s,-])india\b/i.test(location))
}

export const hasOfficialCareersSignal = (html) => {
  const rawHtml = String(html ?? '')
  const text = normalizeText(rawHtml)

  return /<title>\s*Online recharge \| Easy mobile recharge/i.test(rawHtml)
    && text.includes('career at paytm')
    && text.includes('join us and become a part of india')
    && text.includes('view all roles')
    && /jobs\.lever\.co\/paytm/i.test(rawHtml)
}

export const extractLeverBoardUrl = (html) => {
  const match = String(html ?? '').match(/href=["'](https:\/\/jobs\.lever\.co\/paytm\/?)["']/i)
  return match?.[1] ? match[1].replace(/\/$/, '') : null
}

export const hasOfficialLeverBoardSignal = (html) => {
  const rawHtml = String(html ?? '')
  const text = normalizeText(rawHtml)

  return /paytm/i.test(rawHtml)
    && text.includes('location type')
    && text.includes('location')
    && text.includes('team')
    && text.includes('work type')
    && text.includes('jobs powered by lever')
}

export const extractLeverJobs = (leverJobs = []) => {
  if (!Array.isArray(leverJobs)) {
    throw new Error('Paytm Lever postings payload no longer returns an array')
  }

  return leverJobs
    .filter(isIndiaJob)
    .map((job) => {
      const title = normalizeWhitespace(job?.text)
      const location = normalizeWhitespace(job?.categories?.location)
      const sourceUrl = normalizeWhitespace(job?.hostedUrl)
      const id = normalizeWhitespace(job?.id)

      if (!title || !location || !sourceUrl || !id) {
        throw new Error('Paytm Lever postings payload no longer exposes the verified India job fields')
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

export const createPaytmScraper = ({
  fetchPage = defaultFetchPage,
  fetchJson = defaultFetchJson,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run() {
    const careersPage = await fetchPage(CAREERS_URL)
    if (careersPage.status !== 200 || !sameUrl(careersPage.url, CAREERS_URL) || !hasOfficialCareersSignal(careersPage.html)) {
      throw new Error('Paytm verified official careers page changed materially')
    }

    const leverBoardUrl = extractLeverBoardUrl(careersPage.html)
    if (!sameUrl(leverBoardUrl, LEVER_BOARD_URL)) {
      throw new Error('Paytm verified official careers page no longer links to the verified public Lever board')
    }

    const leverBoardPage = await fetchPage(LEVER_BOARD_URL)
    if (
      leverBoardPage.status !== 200
      || !sameUrl(leverBoardPage.url, LEVER_BOARD_URL)
      || !hasOfficialLeverBoardSignal(leverBoardPage.html)
    ) {
      throw new Error('Paytm verified public Lever board changed materially')
    }

    const scrapedAt = now()

    return extractLeverJobs(await fetchJson(LEVER_API_URL)).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt,
      companyCareerPage: CAREERS_URL,
      companyDomain: PAYTM_CATALOG.companyDomain,
      atsPlatform: PAYTM_CATALOG.atsPlatform,
    }))
  },
})

export const run = async (options = {}) => createPaytmScraper(options).run()

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
