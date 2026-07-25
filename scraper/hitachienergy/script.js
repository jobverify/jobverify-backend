import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const LISTING_API_URL = 'https://www.hitachienergy.com/careers/open-jobs/_jcr_content/root/container/content_1/content/grid_0/joblist.listsearchresults.json'

const COMPANY_NAME = 'Hitachi Energy'
const SOURCE = 'hitachienergy'
const PAGE_SIZE = 20

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/\s+�\s+/g, ' – ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim() || null

const unique = (values) => [...new Set(values.filter(Boolean))]

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (/full.?time/.test(normalized)) return 'Full-time'
  if (/part.?time/.test(normalized)) return 'Part-time'
  if (/intern/.test(normalized)) return 'Internship'
  if (/contract/.test(normalized)) return 'Contract'
  return normalizeWhitespace(value)
}

const isIndiaLocation = (value) => /\bindia\b/i.test(String(value ?? ''))

const extractJobId = (url) => normalizeWhitespace(String(url ?? '').match(/\/details\/([^/?#]+)/i)?.[1])

const extractRequisitionId = (url) => normalizeWhitespace(String(url ?? '').match(/_([^/_?#]+)\/apply$/i)?.[1])

const splitLocation = (location) => {
  const parts = unique(String(location ?? '')
    .split(/[;,]/)
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean))

  return {
    city: parts[0] || null,
    state: parts.length > 2 ? parts[1] : null,
    country: parts.at(-1) || null,
  }
}

export const buildListingApiUrl = (offset = 0) => {
  const normalizedOffset = Math.max(0, Number(offset) || 0)
  if (normalizedOffset === 0) return LISTING_API_URL

  const url = new URL(LISTING_API_URL)
  url.searchParams.set('offset', String(normalizedOffset))
  return url.toString()
}

export const extractSearchSummary = (payload = {}) => ({
  totalJobCount: Number.isFinite(payload?.totalNumber) ? payload.totalNumber : null,
  pageSize: Array.isArray(payload?.items) ? payload.items.length : 0,
  hasMore: Boolean(payload?.loadMore),
})

export const extractSearchResults = (payload = {}) => {
  if (!Array.isArray(payload?.items)) return []

  return payload.items
    .filter((item) => isIndiaLocation(item?.location))
    .map((item) => {
      const location = normalizeWhitespace(item.location)
      const sourceUrl = normalizeWhitespace(item.url)
      const applyUrl = normalizeWhitespace(item.applyNowUrl)
      const jobId = extractJobId(sourceUrl)
      const requisitionId = extractRequisitionId(applyUrl)
      const { city, state, country } = splitLocation(location)

      if (!location || !sourceUrl || !applyUrl || !jobId) return null

      return {
        title: normalizeWhitespace(item.title),
        location,
        city,
        state,
        country,
        jobId,
        requisitionId,
        sourceUrl,
        applyUrl,
        department: normalizeWhitespace(item.jobFunction),
        employmentType: normalizeEmploymentType(item.jobType),
        experienceRequired: normalizeWhitespace(item.experience),
        postingDate: normalizeWhitespace(item.publicationDate)?.slice(0, 10) || null,
        closingDate: null,
        jobDescription: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
      }
    })
    .filter(Boolean)
}

const defaultFetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json,text/plain,*/*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const createHitachiEnergyScraper = () => ({
  async run({
    maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY,
    maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    const jobs = []
    const seenJobIds = new Set()

    for (let pageNumber = 0; pageNumber < maxPages; pageNumber += 1) {
      const offset = pageNumber * PAGE_SIZE
      const payload = await fetchJson(buildListingApiUrl(offset))
      const listings = extractSearchResults(payload)
      const summary = extractSearchSummary(payload)

      if (listings.length === 0 && !summary.hasMore) break

      for (const listing of listings) {
        if (seenJobIds.has(listing.jobId)) continue
        seenJobIds.add(listing.jobId)

        jobs.push({
          ...listing,
          company: COMPANY_NAME,
          link: listing.applyUrl || listing.sourceUrl,
          source: SOURCE,
          scrapedAt: now(),
        })

        if (maxJobs && jobs.length >= maxJobs) return jobs
      }

      const totalJobCount = summary.totalJobCount || 0
      if (!summary.hasMore || (pageNumber + 1) * PAGE_SIZE >= totalJobCount) break
    }

    return jobs
  },
})

export const run = async (options = {}) => createHitachiEnergyScraper().run(options)
