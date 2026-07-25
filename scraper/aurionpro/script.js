import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const CAREER_CLIENT_KEY = 'AHJX1-HGSAB-BSHB1'
const BASE_API_URL = 'https://mservices.zinghr.com/recruitment/api/v1/CareerConfig'
const LISTING_PAGE_SIZE = 10

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&#x2F;/gi, '/')
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/&#8212;|&mdash;/gi, '-')

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  decodeHtmlEntities(value)
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const extractListItems = (value) => [...decodeHtmlEntities(value).matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const normalizeLocation = (value) => {
  const location = normalizeWhitespace(value)
  if (!location) return null
  return /india/i.test(location) ? location : `${location}, India`
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return 'Full-time'
  if (/intern|internship|apprentice/.test(normalized)) return 'Internship'
  if (/contract|temporary|fixed term/.test(normalized)) return 'Contract'
  return 'Full-time'
}

const formatExperienceRange = (minExp, maxExp) => {
  const min = Number.isFinite(minExp) ? minExp : Number.parseInt(minExp, 10)
  const max = Number.isFinite(maxExp) ? maxExp : Number.parseInt(maxExp, 10)
  if (Number.isFinite(min) && Number.isFinite(max)) return `${min} - ${max} Years`
  if (Number.isFinite(min)) return `${min}+ Years`
  return null
}

const buildUrl = (pathName, params = {}) => {
  const url = new URL(`${BASE_API_URL}/${pathName}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value == null ? '' : String(value))
  }
  return url.toString()
}

export const buildListingUrl = ({ pageIndex = 1, pageSize = LISTING_PAGE_SIZE, searchText = '' } = {}) =>
  buildUrl('GetCareerJobPostings', {
    careerClientKey: CAREER_CLIENT_KEY,
    pageIndex,
    pageSize,
    searchText,
  })

export const buildDetailUrl = (requisitionId) =>
  buildUrl('GetJobDescriptionByRequisitionId', {
    careerClientKey: CAREER_CLIENT_KEY,
    requisitionId,
  })

export const extractListingSummary = (payload = {}) => ({
  totalCount: Number(payload?.data?.totalCount || 0),
  pageSize: LISTING_PAGE_SIZE,
})

export const extractListings = (payload = {}) =>
  (payload?.data?.careerJobPostings || [])
    .map((posting) => ({
      title: normalizeWhitespace(posting.jobTitle),
      location: null,
      city: null,
      jobId: normalizeWhitespace(posting.requisitionId),
      requisitionId: normalizeWhitespace(posting.requisitionId),
      employmentType: normalizeEmploymentType(posting.eT_Desc),
      experienceRequired: formatExperienceRange(posting.minExp, posting.maxExp),
      postingDate: normalizeWhitespace(posting.startDate),
      closingDate: normalizeWhitespace(posting.endDate),
      sourceUrl: null,
      applyUrl: null,
      department: null,
    }))
    .filter((posting) => posting.jobId && posting.title)

export const extractJobDetail = (payload = {}, listing = {}) => {
  const detail = payload?.data || {}
  const location = normalizeLocation(detail.location)
  const city = normalizeWhitespace(detail.location)
  const requiredSkills = [
    ...extractListItems(detail.jobDescription),
    ...extractListItems(detail.skillsAndCompetencies),
    ...extractListItems(detail.rulesAndResponsibility),
    ...extractListItems(detail.krAs),
  ]

  return {
    title: normalizeWhitespace(detail.jobTitle) || listing.title || null,
    location,
    city,
    jobId: normalizeWhitespace(detail.requisitionID) || listing.jobId || null,
    requisitionId: normalizeWhitespace(detail.requisitionID) || listing.requisitionId || null,
    employmentType: normalizeEmploymentType(detail.employementType || listing.employmentType),
    experienceRequired: listing.experienceRequired || null,
    department: normalizeWhitespace(detail.department) || null,
    jobDescription: stripTags(detail.jobDescription),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills,
    postingDate: listing.postingDate || null,
    closingDate: listing.closingDate || normalizeWhitespace(detail.endDate) || null,
    sourceUrl: normalizeWhitespace(detail.qrCodeDetails?.longUrl) || listing.sourceUrl || null,
    applyUrl: normalizeWhitespace(detail.candidateApplyLink) || listing.applyUrl || null,
  }
}

const defaultFetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      Accept: 'application/json,text/plain,*/*',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const createAurionproScraper = ({ fetchJson = defaultFetchJson } = {}) => ({
  run: async ({ fetchJson: overrideFetchJson, maxPages: overrideMaxPages } = {}) => {
    const fetchImpl = overrideFetchJson || fetchJson
    const jobs = []
    const seenJobIds = new Set()
    const maxPages = Number.isInteger(overrideMaxPages)
      ? overrideMaxPages
      : Number.isInteger(config.maxPages)
        ? config.maxPages
        : Number.POSITIVE_INFINITY

    for (let pageIndex = 1; pageIndex <= maxPages; pageIndex += 1) {
      const listingPayload = await fetchImpl(buildListingUrl({ pageIndex }))
      const listings = extractListings(listingPayload)
      const summary = extractListingSummary(listingPayload)

      for (const listing of listings) {
        if (seenJobIds.has(listing.jobId)) continue
        seenJobIds.add(listing.jobId)

        const detailPayload = await fetchImpl(buildDetailUrl(listing.jobId))
        const detail = extractJobDetail(detailPayload, listing)

        jobs.push({
          jobId: detail.jobId || listing.jobId,
          requisitionId: detail.requisitionId || listing.requisitionId,
          title: detail.title || listing.title,
          company: 'AurionPro',
          department: detail.department || listing.department,
          location: detail.location || listing.location,
          city: detail.city || listing.city,
          link: detail.applyUrl || detail.sourceUrl || listing.applyUrl || listing.sourceUrl,
          applyUrl: detail.applyUrl || listing.applyUrl,
          sourceUrl: detail.sourceUrl || listing.sourceUrl,
          source: 'aurionpro',
          employmentType: detail.employmentType || listing.employmentType,
          experienceRequired: detail.experienceRequired || listing.experienceRequired,
          jobDescription: detail.jobDescription,
          minimumQualification: detail.minimumQualification,
          preferredQualification: detail.preferredQualification,
          requiredSkills: detail.requiredSkills,
          postingDate: detail.postingDate || listing.postingDate,
          closingDate: detail.closingDate || listing.closingDate,
          scrapedAt: new Date().toISOString(),
        })
      }

      if (pageIndex * summary.pageSize >= summary.totalCount || listings.length === 0) break
    }

    return jobs
  },
})

export const run = async (options = {}) => createAurionproScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running AurionPro scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)
  const cities = [...new Set(jobs.map((job) => job.city).filter(Boolean))].sort()
  console.log(`Cities found: ${cities.join(', ')}`)
  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'aurionpro')
    console.log('DB result:', result)
    process.exit(0)
  }
}
