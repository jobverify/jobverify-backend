import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

import { PLIVO_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = PLIVO_CATALOG.source
export const COMPANY = PLIVO_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = PLIVO_CATALOG.officialBrandName
export const HOMEPAGE_URL = PLIVO_CATALOG.homepageUrl
export const CAREERS_URL = PLIVO_CATALOG.companyCareerPage
export const LEVER_BOARD_URL = PLIVO_CATALOG.officialLeverBoardUrl
export const LEVER_API_URL = 'https://api.lever.co/v0/postings/plivo?mode=json'
export const VERIFIED_ON = PLIVO_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PLIVO_CATALOG.verifiedSurfaceSummary
export const PROVIDER_METADATA = PLIVO_CATALOG

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
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s*,\s*/g, ', ')
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

const extractTitle = (html = '') =>
  normalizeWhitespace(String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1])

const toIsoDateTime = (value) => {
  const timestamp = Number(value)
  if (!Number.isFinite(timestamp)) return null

  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const toRemoteStatus = (workplaceType, location) => {
  const normalizedType = normalizeWhitespace(workplaceType)?.toLowerCase()
  if (normalizedType === 'remote') return 'Remote'
  if (normalizedType === 'hybrid') return 'Hybrid'
  if (normalizedType === 'onsite' || normalizedType === 'on-site') return 'On-site'

  const normalizedLocation = normalizeWhitespace(location)?.toLowerCase()
  if (normalizedLocation?.includes('remote')) return 'Remote'
  return null
}

const regionNames = typeof Intl?.DisplayNames === 'function'
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null

const toCountryName = (code, location) => {
  const normalizedCode = normalizeWhitespace(code)?.toUpperCase()
  if (normalizedCode && /^[A-Z]{2}$/.test(normalizedCode)) {
    const display = regionNames?.of(normalizedCode)
    if (display) return display
  }

  const normalizedLocation = normalizeWhitespace(location)
  if (!normalizedLocation) return null
  if (/remote/i.test(normalizedLocation) && /\(([^)]+)\)/.test(normalizedLocation)) {
    return normalizeWhitespace(normalizedLocation.match(/\(([^)]+)\)/)?.[1])
  }

  const parts = normalizedLocation.split(',').map((part) => normalizeWhitespace(part)).filter(Boolean)
  return parts.at(-1) || null
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized || /remote/i.test(normalized)) return null
  return normalized.split(/\s*,\s*/)[0] || null
}

export const hasOfficialPlivoJobsSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const text = normalizeText(rawHtml)

  return extractTitle(rawHtml) === 'Jobs | Plivo'
    && text.includes('come build the future of agentic ai with us')
    && text.includes('open positions')
    && text.includes('loading positions')
    && /component-url=["'][^"']*JobsPage[^"']*["']/i.test(rawHtml)
}

export const extractJobsBundleUrl = (html = '') => {
  const bundlePath = String(html ?? '').match(/component-url=["']([^"']*JobsPage[^"']+)["']/i)?.[1]
  return bundlePath ? new URL(bundlePath, CAREERS_URL).toString() : null
}

export const extractLeverApiUrl = (bundleJs = '') =>
  normalizeWhitespace(String(bundleJs ?? '').match(/https:\/\/api\.lever\.co\/v0\/postings\/plivo\?mode=json/i)?.[0])

export const hasOfficialLeverBoardSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const text = normalizeText(rawHtml)

  const hasVerifiedTitle = extractTitle(rawHtml) === 'Plivo'
  const hasVerifiedBranding = /Job openings at Plivo/i.test(rawHtml)
  const hasLegacyLayout = text.includes('location type')
    && text.includes('team')
    && text.includes('work type')
  const hasCurrentEmptyLayout = hasEmptyLeverBoardSignal(rawHtml)
    && text.includes('plivo home page')
    && text.includes('privacy notice')
    && text.includes('artificial intelligence (ai) tools')
    && text.includes('jobs powered by')

  return hasVerifiedTitle
    && hasVerifiedBranding
    && (hasLegacyLayout || hasCurrentEmptyLayout)
}

export const hasEmptyLeverBoardSignal = (html = '') =>
  /No job postings currently open\.\s*Check back later!/i.test(String(html ?? ''))

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: DEFAULT_JSON_HEADERS,
  label: SOURCE,
  timeoutMs: 15000,
})

export const extractLeverJobs = (leverJobs = []) => {
  if (!Array.isArray(leverJobs)) {
    throw new Error('Plivo Lever postings payload no longer returns an array')
  }

  return leverJobs.map((job) => {
    const title = normalizeWhitespace(job?.text)
    const jobId = normalizeWhitespace(job?.id)
    const sourceUrl = normalizeWhitespace(job?.hostedUrl)
    const applyUrl = normalizeWhitespace(job?.applyUrl) || sourceUrl
    const location = normalizeWhitespace(job?.categories?.location)
    const country = toCountryName(job?.country, location)

    if (!title || !jobId || !sourceUrl || !applyUrl || !location || !country) {
      throw new Error('Plivo Lever postings payload no longer exposes the verified public job fields')
    }

    return {
      title,
      company: COMPANY,
      department: normalizeWhitespace(job?.categories?.team || job?.categories?.department),
      location,
      city: extractCity(location),
      country,
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl,
      employmentType: normalizeWhitespace(job?.categories?.commitment),
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: toIsoDateTime(job?.createdAt),
      closingDate: null,
      jobDescription: normalizeWhitespace(job?.descriptionBodyPlain || job?.descriptionPlain),
      remoteStatus: toRemoteStatus(job?.workplaceType, location),
    }
  })
}

export const createPlivoScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
  } = {}) {
    const jobsPageHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialPlivoJobsSignal(jobsPageHtml)) {
      throw new Error('Plivo verified official jobs page changed materially')
    }

    const jobsBundleUrl = extractJobsBundleUrl(jobsPageHtml)
    if (!jobsBundleUrl) {
      throw new Error('Plivo official jobs page no longer exposes the verified JobsPage bundle')
    }

    const jobsBundleJs = await fetchText(jobsBundleUrl)
    if (extractLeverApiUrl(jobsBundleJs) !== LEVER_API_URL) {
      throw new Error('Plivo jobs bundle no longer exposes the verified Lever API')
    }

    const leverBoardHtml = await fetchText(LEVER_BOARD_URL)
    if (!hasOfficialLeverBoardSignal(leverBoardHtml)) {
      throw new Error('Plivo verified public Lever board changed materially')
    }

    const leverJobs = extractLeverJobs(await fetchJson(LEVER_API_URL))
    if (leverJobs.length === 0 && !hasEmptyLeverBoardSignal(leverBoardHtml)) {
      throw new Error('Plivo verified public Lever board no longer matches the live empty-board state')
    }

    const selectedJobs = maxJobs ? leverJobs.slice(0, maxJobs) : leverJobs
    const scrapedAt = now()

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt,
      companyCareerPage: CAREERS_URL,
      companyDomain: PLIVO_CATALOG.companyDomain,
      atsPlatform: PLIVO_CATALOG.atsPlatform,
    }))
  },
})

export const run = async (options = {}) => createPlivoScraper(options).run(options)

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
