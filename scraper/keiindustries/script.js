import path from 'node:path'
import { fileURLToPath } from 'node:url'

import KEI_INDUSTRIES_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = KEI_INDUSTRIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const COMPANY_DOMAIN = PROVIDER_METADATA.companyDomain
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREER_PAGE_URL = PROVIDER_METADATA.officialCareerPageUrl
export const JOBS_ARCHIVE_URL = PROVIDER_METADATA.jobsArchiveUrl

const FEATURE_LABELS = ['Locations', 'Department', 'Experience', 'Qualification', 'Salary']

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtml(value)
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizePathname = (pathname) => pathname === '/' ? '/' : pathname.replace(/\/+$/, '')

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const matchesExpectedUrl = (value, expected) => {
  try {
    const actualUrl = new URL(String(value ?? ''))
    const expectedUrl = new URL(expected)

    return actualUrl.hostname.toLowerCase() === expectedUrl.hostname.toLowerCase()
      && normalizePathname(actualUrl.pathname) === normalizePathname(expectedUrl.pathname)
      && actualUrl.search === expectedUrl.search
  } catch {
    return false
  }
}

const toAbsoluteUrl = (value, baseUrl = JOBS_ARCHIVE_URL) => {
  try {
    return new URL(String(value ?? ''), baseUrl).toString()
  } catch {
    return null
  }
}

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

export const defaultFetchPage = async (url, {
  fetchImpl = fetch,
  timeoutMs = 15000,
} = {}) => {
  const response = await fetchImpl(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: createTimeoutSignal(timeoutMs),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const isVerifiedFirstPartyJobUrl = (value) => {
  try {
    const url = new URL(value, JOBS_ARCHIVE_URL)
    return url.hostname === 'www.kei-ind.com'
      && normalizePathname(url.pathname).startsWith('/jobs/')
      && normalizePathname(url.pathname) !== '/jobs'
  } catch {
    return false
  }
}

const extractTagText = (html, tagName) => {
  const pattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i')
  const match = String(html ?? '').match(pattern)
  return match ? normalizeWhitespace(match[1]) || null : null
}

const extractFeatureValue = (text, label) => {
  const boundary = `(?:${FEATURE_LABELS.map(escapeRegExp).join('|')})\\s*:|Apply Online|Previous post|Next post|$`
  const pattern = new RegExp(`${escapeRegExp(label)}\\s*:\\s*(.*?)\\s*(?=${boundary})`, 'i')
  const match = String(text ?? '').match(pattern)
  const value = normalizeWhitespace(match?.[1] || '')
  return value || null
}

const extractJobDescription = (text) => {
  const match = String(text ?? '').match(/Job Description\s*(.*?)\s*Job Features/i)
  const value = normalizeWhitespace(match?.[1] || '')
  return value || null
}

const locationToCountry = () => 'India'

const locationToCity = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return normalized.split(/[;,]/)[0]?.trim() || null
}

const locationToDisplay = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return `${normalized}, India`
}

const slugFromUrl = (value) => {
  try {
    const url = new URL(value, JOBS_ARCHIVE_URL)
    const segments = url.pathname.split('/').filter(Boolean)
    return segments.at(-1) || null
  } catch {
    return null
  }
}

export const hasOfficialJobsArchiveSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('Home / Job')
    && normalized.includes('Job Archives')
}

export const extractJobDetailUrls = (html = '') => {
  const detailUrls = new Set()
  const pattern = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi

  for (const match of String(html ?? '').matchAll(pattern)) {
    const absoluteUrl = toAbsoluteUrl(match[1], JOBS_ARCHIVE_URL)
    if (!absoluteUrl || !isVerifiedFirstPartyJobUrl(absoluteUrl)) continue
    detailUrls.add(absoluteUrl)
  }

  return [...detailUrls].sort((left, right) => left.localeCompare(right))
}

export const isValidatedJobDetailPage = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('Job Features') && normalized.includes('Apply Online')
}

export const extractJobFromDetailPage = ({ url, html } = {}) => {
  if (!isVerifiedFirstPartyJobUrl(url) || !isValidatedJobDetailPage(html)) {
    return null
  }

  const text = normalizeWhitespace(html)
  const title = extractTagText(html, 'h1')
  const locationValue = extractFeatureValue(text, 'Locations')
  const jobId = slugFromUrl(url)

  if (!title || !locationValue || !jobId) {
    return null
  }

  return {
    title,
    company: COMPANY,
    department: extractFeatureValue(text, 'Department'),
    location: locationToDisplay(locationValue),
    city: locationToCity(locationValue),
    country: locationToCountry(locationValue),
    jobId,
    requisitionId: jobId,
    sourceUrl: new URL(url, JOBS_ARCHIVE_URL).toString(),
    applyUrl: new URL(url, JOBS_ARCHIVE_URL).toString(),
    employmentType: null,
    experienceRequired: extractFeatureValue(text, 'Experience'),
    minimumQualification: extractFeatureValue(text, 'Qualification'),
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: extractJobDescription(text),
    remoteStatus: 'On-site',
  }
}

export const createKeiIndustriesScraper = () => ({
  async run({ fetchPage = defaultFetchPage, now = () => new Date().toISOString() } = {}) {
    const archivePage = await fetchPage(JOBS_ARCHIVE_URL)

    if (Number(archivePage?.status) !== 200 || !matchesExpectedUrl(archivePage?.url, JOBS_ARCHIVE_URL)) {
      throw new Error('KEI Industries verified jobs archive no longer matches the known first-party surface')
    }

    if (!hasOfficialJobsArchiveSignal(archivePage?.html)) {
      throw new Error('KEI Industries verified jobs archive no longer matches the known first-party surface')
    }

    const jobs = []

    for (const detailUrl of extractJobDetailUrls(archivePage.html)) {
      const detailPage = await fetchPage(detailUrl)

      if (Number(detailPage?.status) !== 200 || !isVerifiedFirstPartyJobUrl(detailPage?.url)) {
        throw new Error('KEI Industries detail link moved off the verified first-party host or no longer resolves cleanly')
      }

      const job = extractJobFromDetailPage({
        url: detailPage.url,
        html: detailPage.html,
      })

      if (!job) continue

      jobs.push({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: now(),
      })
    }

    return jobs.sort((left, right) => left.title.localeCompare(right.title))
  },
})

export const run = async (options = {}) => createKeiIndustriesScraper().run(options)

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
