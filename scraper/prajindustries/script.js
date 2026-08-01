import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { PRAJ_INDUSTRIES_CATALOG } from './catalog.js'
import { createBrowserFetchSession } from '../../scraper-support/shared/browserFetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = PRAJ_INDUSTRIES_CATALOG.source
export const COMPANY = PRAJ_INDUSTRIES_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = PRAJ_INDUSTRIES_CATALOG.officialBrandName
export const VERIFIED_ON = PRAJ_INDUSTRIES_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PRAJ_INDUSTRIES_CATALOG.verifiedSurfaceSummary
export const OFFICIAL_CAREERS_URL = PRAJ_INDUSTRIES_CATALOG.companyCareerPage
export const DARWINBOX_HANDOFF_URL = PRAJ_INDUSTRIES_CATALOG.officialCareersHandoffUrl
export const DARWINBOX_ORIGIN = PRAJ_INDUSTRIES_CATALOG.darwinboxOrigin
export const DARWINBOX_COMPANY_ID = PRAJ_INDUSTRIES_CATALOG.darwinboxCompanyId

const DEFAULT_PAGE_SIZE = 10

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || null

const normalizeDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return normalized

  const year = parsed.getUTCFullYear()
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
  const day = String(parsed.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatExperienceRange = (fromValue, toValue) => {
  const from = normalizeWhitespace(fromValue)
  const to = normalizeWhitespace(toValue)

  if (from && to) return `${from} - ${to} Years`
  if (from) return `${from}+ Years`
  return null
}

const extractLocationParts = (value) =>
  normalizeWhitespace(value)
    ?.split(',')
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean) || []

const extractCity = (value) => {
  const parts = extractLocationParts(value)
  if (!parts.length) return null

  const lastPart = parts.at(-1)
  if (/india/i.test(lastPart || '') && parts.length >= 3) {
    return parts.at(-3) || parts[0]
  }

  return parts[0]
}

const isIndiaLocation = (value) => /india/i.test(normalizeWhitespace(value) || '')

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

const defaultFetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain,*/*',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

const isExpectedDarwinbox403Error = (error, url) =>
  /HTTP 403/i.test(String(error?.message || error || ''))
  && String(url ?? '').startsWith(DARWINBOX_ORIGIN)

const parseBrowserJsonResponse = (value, url) => {
  try {
    return JSON.parse(String(value ?? ''))
  } catch (error) {
    throw new Error(`Unexpected non-JSON browser response for ${url}: ${error.message}`)
  }
}

export const extractOfficialDarwinboxUrl = (html = '') => {
  const match = String(html ?? '').match(/https:\/\/praj\.darwinbox\.in\/ms\/candidate\/careers/i)
  return match?.[0] ?? null
}

export const hasVerifiedCareersPageSignals = (html = '') => {
  const page = String(html ?? '')

  return /<title>\s*Careers - Praj Industries\s*<\/title>/i.test(page)
    && /href="https:\/\/www\.praj\.net\/careers\/"/i.test(page)
    && /prajhumancapitalconnect@praj\.net/i.test(page)
    && extractOfficialDarwinboxUrl(page) === DARWINBOX_HANDOFF_URL
    && /SEARCH FOR JOB/i.test(page)
    && /Life At Praj/i.test(page)
}

export const buildListingApiUrl = (page = 1) =>
  `${DARWINBOX_ORIGIN}/ms/candidateapi/job?page=${Math.max(1, Number(page) || 1)}`

export const buildJobDetailApiUrl = (jobId) =>
  `${DARWINBOX_ORIGIN}/ms/candidateapi/job/${normalizeWhitespace(jobId) || ''}`

export const buildJobDetailUrl = (jobId) =>
  `${DARWINBOX_ORIGIN}/ms/candidatev2/${DARWINBOX_COMPANY_ID}/careers/jobDetails/${normalizeWhitespace(jobId) || ''}`

export const extractListings = (payload = {}) =>
  (payload?.message?.jobs || [])
    .filter((job) => isIndiaLocation(job?.officelocation_show_arr))
    .map((job) => {
      const location = normalizeWhitespace(job.officelocation_show_arr)
      const jobId = normalizeWhitespace(job.id)

      return {
        title: normalizeWhitespace(job.title),
        company: COMPANY,
        department: normalizeWhitespace(job.department),
        location,
        city: extractCity(location),
        jobId,
        requisitionId: null,
        sourceUrl: buildJobDetailUrl(jobId),
        applyUrl: buildJobDetailUrl(jobId),
        employmentType: normalizeWhitespace(job.emp_type),
        experienceRequired: formatExperienceRange(job.experience_from_num, job.experience_to_num),
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: normalizeDate(job.created_on),
        closingDate: null,
        jobDescription: null,
      }
    })
    .filter((job) => job.title && job.jobId && job.location)

export const extractJobDetail = (payload = {}, listing = {}) => {
  const detail = payload?.message?.job?.[0] || {}
  const location = normalizeWhitespace(detail.officelocation_show_arr) || listing.location || null
  const jobId = normalizeWhitespace(detail.id) || listing.jobId || null

  return {
    title: normalizeWhitespace(detail.title) || listing.title || null,
    company: COMPANY,
    department: normalizeWhitespace(detail.department) || listing.department || null,
    location,
    city: extractCity(location) || listing.city || null,
    jobId,
    requisitionId: listing.requisitionId || null,
    sourceUrl: listing.sourceUrl || buildJobDetailUrl(jobId),
    applyUrl: listing.applyUrl || buildJobDetailUrl(jobId),
    employmentType: normalizeWhitespace(detail.emp_type) || listing.employmentType || null,
    experienceRequired: normalizeWhitespace(detail.experience) || listing.experienceRequired || null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: listing.requiredSkills || [],
    postingDate: normalizeWhitespace(detail.posted_on) || listing.postingDate || null,
    closingDate: null,
    jobDescription: normalizeWhitespace(detail.jd) || listing.jobDescription || null,
  }
}

const extractPaginationSummary = (payload = {}, { page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) => {
  const totalCount = Number(payload?.message?.jobscount) || 0
  return {
    hasNext: page * pageSize < totalCount,
    totalCount,
  }
}

export const createPrajIndustriesScraper = ({
  now = () => new Date().toISOString(),
  maxPages = Number.POSITIVE_INFINITY,
  pageSize = DEFAULT_PAGE_SIZE,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    fetchBrowserJson = null,
  } = {}) {
    let browserSession = null
    const fetchJsonWithBrowserFallback = async (url) => {
      try {
        return await fetchJson(url)
      } catch (error) {
        if (!isExpectedDarwinbox403Error(error, url)) {
          throw error
        }

        if (typeof fetchBrowserJson === 'function') {
          return fetchBrowserJson(url)
        }

        browserSession ??= await createBrowserFetchSession({ userAgent: USER_AGENT })
        const page = await browserSession.fetchPage(url, { referer: DARWINBOX_HANDOFF_URL })
        if (page.status !== 200) {
          throw new Error(`HTTP ${page.status} for ${url}`)
        }
        return parseBrowserJsonResponse(page.html, url)
      }
    }

    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)
    if (!hasVerifiedCareersPageSignals(careersHtml)) {
      throw new Error('Praj Industries verified careers page no longer matches the official first-party handoff')
    }

    try {
      const jobs = []
      const seenJobIds = new Set()

      for (let page = 1; page <= maxPages; page += 1) {
        const listingPayload = await fetchJsonWithBrowserFallback(buildListingApiUrl(page))
        const listings = extractListings(listingPayload)

        for (const listing of listings) {
          if (seenJobIds.has(listing.jobId)) continue
          seenJobIds.add(listing.jobId)

          const detailPayload = await fetchJsonWithBrowserFallback(buildJobDetailApiUrl(listing.jobId))
          const detail = extractJobDetail(detailPayload, listing)

          jobs.push({
            ...detail,
            source: SOURCE,
            link: detail.applyUrl || detail.sourceUrl,
            scrapedAt: now(),
          })
        }

        if (!extractPaginationSummary(listingPayload, { page, pageSize }).hasNext) {
          break
        }
      }

      return jobs
    } finally {
      await browserSession?.close?.()
    }
  },
})

export const run = async (options = {}) => createPrajIndustriesScraper().run(options)

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
