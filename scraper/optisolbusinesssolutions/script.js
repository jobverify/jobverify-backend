import { fetchTextWithRetry } from '../utils/fetch.js'

import { OPTISOL_BUSINESS_SOLUTIONS_CATALOG } from './catalog.js'

export const SOURCE = OPTISOL_BUSINESS_SOLUTIONS_CATALOG.source
export const COMPANY_NAME = OPTISOL_BUSINESS_SOLUTIONS_CATALOG.companyName
export const CAREERS_LANDING_URL = OPTISOL_BUSINESS_SOLUTIONS_CATALOG.homepageUrl
export const JOBS_ARCHIVE_URL = OPTISOL_BUSINESS_SOLUTIONS_CATALOG.companyCareerPage

const JOBS_ORIGIN = new URL(JOBS_ARCHIVE_URL).origin
const JOB_DETAIL_PATTERN = /^\/jobs\/[^/]+\/?$/i
const PAGE_PATTERN = /^\/job-type\/full-time\/page\/\d+\/?$/i

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")

const normalizeWhitespace = (value) => decodeHtmlEntities(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<\/(p|div|li|section|article|h[1-6])>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim() || null

const unique = (values) => [...new Set(values.filter(Boolean))]

const toAbsoluteUrl = (value, baseUrl = JOBS_ARCHIVE_URL) => {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const isTrackedJobUrl = (value) => {
  try {
    const url = new URL(value)
    return url.origin === JOBS_ORIGIN && JOB_DETAIL_PATTERN.test(url.pathname)
  } catch {
    return false
  }
}

const isPaginationUrl = (value) => {
  try {
    const url = new URL(value)
    return url.origin === JOBS_ORIGIN && PAGE_PATTERN.test(url.pathname)
  } catch {
    return false
  }
}

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const location = normalized
    .replace(/,\s*Hybrid$/i, '')
    .replace(/,\s*Remote$/i, '')
    .trim()

  if (/,?\s*India$/i.test(location)) return location
  return `${location}, India`
}

const extractCity = (location) => normalizeWhitespace(location)?.split(',')[0]?.trim() || null

const normalizeExperience = (value) => {
  const normalized = normalizeWhitespace(value)?.replace(/^Experience:\s*/i, '') || ''
  if (!normalized) return null

  let match = normalized.match(/(\d+)\s*\+\s*years?/i)
  if (match) return `${match[1]}+ years`

  match = normalized.match(/(\d+)\s*(?:to|-)\s*(\d+)\s*years?/i)
  if (match) return `${match[1]}-${match[2]} years`

  return normalized
}

const extractDescription = (html = '') => normalizeWhitespace(
  String(html ?? '').match(/<(section|div)[^>]*class=["'][^"']*job-description[^"']*["'][^>]*>([\s\S]*?)<\/\1>/i)?.[2],
)

const extractParagraphValues = (html = '') => [...String(html ?? '').matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
  .map((match) => normalizeWhitespace(match[1]))
  .filter(Boolean)

export const hasOfficialCareersLandingSignal = (html = '') => {
  const normalized = normalizeWhitespace(html) || ''
  return normalized.includes('MORE THAN JUST A JOB')
    && normalized.includes('Jobs at OptiSol')
    && [...String(html ?? '').matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)]
      .some((match) =>
        new URL(match[1], CAREERS_LANDING_URL).toString() === OPTISOL_BUSINESS_SOLUTIONS_CATALOG.currentOpeningsUrl,
      )
}

export const hasVerifiedJobArchiveSignal = (html = '') => {
  const normalized = normalizeWhitespace(html) || ''
  return normalized.includes('Full Time')
    && extractArchiveJobLinks(html).length > 0
}

export const extractArchiveJobLinks = (html = '') => unique(
  [...String(html ?? '').matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => {
      const url = toAbsoluteUrl(match[1], JOBS_ARCHIVE_URL)
      return isTrackedJobUrl(url) ? url : null
    }),
)

export const extractPaginationLinks = (html = '', baseUrl = JOBS_ARCHIVE_URL) => unique(
  [...String(html ?? '').matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => {
      const url = toAbsoluteUrl(match[1], baseUrl)
      return isPaginationUrl(url) ? url : null
    }),
)

export const extractJobDetail = (html = '', url) => {
  const title = normalizeWhitespace(String(html ?? '').match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1])
  const paragraphs = extractParagraphValues(html)
  const employmentType = paragraphs.find((value) => /full\s*time/i.test(value)) || null
  const rawLocation = paragraphs.find((value) => /(?:Chennai|Madurai|India|Hybrid|Remote)/i.test(value)) || null
  const experience = paragraphs.find((value) => /^Experience:/i.test(value)) || null

  return {
    title,
    company: COMPANY_NAME,
    department: null,
    location: normalizeLocation(rawLocation),
    city: extractCity(normalizeLocation(rawLocation)),
    country: 'India',
    jobId: url,
    requisitionId: url,
    sourceUrl: url,
    applyUrl: url,
    employmentType: employmentType ? 'Full Time' : null,
    experienceRequired: normalizeExperience(experience),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: extractDescription(html),
    remoteStatus: /Hybrid/i.test(rawLocation || '') ? 'Hybrid' : /Remote/i.test(rawLocation || '') ? 'Remote' : 'On-site',
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createOptiSolBusinessSolutionsScraper = () => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const careersLandingHtml = await fetchText(CAREERS_LANDING_URL)
    if (!hasOfficialCareersLandingSignal(careersLandingHtml)) {
      throw new Error('OptiSol Business Solutions verified careers landing page no longer matches the pinned first-party surface')
    }

    const firstArchiveHtml = await fetchText(JOBS_ARCHIVE_URL)
    if (!hasVerifiedJobArchiveSignal(firstArchiveHtml)) {
      throw new Error('OptiSol Business Solutions verified jobs archive no longer matches the pinned first-party surface')
    }

    const archiveHtmlByUrl = new Map([[JOBS_ARCHIVE_URL, firstArchiveHtml]])
    const queue = [...extractPaginationLinks(firstArchiveHtml)]
    while (queue.length > 0) {
      const pageUrl = queue.shift()
      if (archiveHtmlByUrl.has(pageUrl)) continue

      const pageHtml = await fetchText(pageUrl)
      if (!hasVerifiedJobArchiveSignal(pageHtml)) {
        throw new Error('OptiSol Business Solutions verified jobs archive no longer matches the pinned first-party surface')
      }

      archiveHtmlByUrl.set(pageUrl, pageHtml)
      for (const nextUrl of extractPaginationLinks(pageHtml, pageUrl)) {
        if (!archiveHtmlByUrl.has(nextUrl)) queue.push(nextUrl)
      }
    }

    const jobLinks = unique(
      [...archiveHtmlByUrl.entries()].flatMap(([url, html]) => extractArchiveJobLinks(html, url)),
    )

    const jobs = []
    for (const jobLink of jobLinks) {
      const detailHtml = await fetchText(jobLink)
      const detail = extractJobDetail(detailHtml, jobLink)
      if (!detail.title || !detail.location) continue

      jobs.push({
        ...detail,
        source: SOURCE,
        link: detail.applyUrl,
        scrapedAt: now(),
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createOptiSolBusinessSolutionsScraper().run(options)

