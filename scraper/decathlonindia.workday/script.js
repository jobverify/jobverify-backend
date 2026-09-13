import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { attachInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'decathlonindia'
export const COMPANY = 'Decathlon India'
export const CAREERS_URL = 'https://joinus.decathlon.in/en/annonces'
export const API_URL = 'https://api.digitalrecruiters.com/public/v1/careers-site/job-ads'
export const DISPOSITION = 'live-official-digitalrecruiters-inventory'
export const VERIFIED_ON = '2026-09-13'
export const VERIFIED_SURFACE_SUMMARY = 'Verified on Sunday, September 13, 2026 that Decathlon India publishes its complete official vacancy inventory through the DigitalRecruiters API configured by https://joinus.decathlon.in/en/annonces.'

const normalizeWhitespace = (value) => {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()
  return normalized || null
}

const toOfferUrl = (value) => {
  const slug = normalizeWhitespace(value)
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/i.test(slug)) return null

  const url = new URL(`/en/annonce/${slug}`, CAREERS_URL)
  return url.origin === new URL(CAREERS_URL).origin ? url.toString() : null
}

const normalizeIndiaLocation = (value) => {
  const location = normalizeWhitespace(value)
  if (!location) return null
  return /\bIndia\b/i.test(location) ? location : `${location}, India`
}

const getCity = (location) => {
  const city = String(location || '').split(',')[0]?.trim()
  return city && !/^India$/i.test(city) ? city : null
}

const validateOffersShell = (html) => {
  const page = String(html || '')
  if (!/Job offers at Decathlon Sports India Pvt Ltd/i.test(page)
    || !/job-ads-listing-page/i.test(page)
    || !/api\.digitalrecruiters\.com\/(?:careers|public)\/v1/i.test(page)) {
    throw new Error('Decathlon India official offers surface changed materially')
  }
}

const normalizeApiPage = (payload) => {
  if (!payload || typeof payload !== 'object'
    || !Number.isSafeInteger(payload.count)
    || payload.count < 0
    || !Array.isArray(payload.items)) {
    throw new Error('Decathlon India official offers API changed materially')
  }

  return { count: payload.count, items: payload.items }
}

const normalizeOffer = (offer) => {
  const id = normalizeWhitespace(offer?.id)
  const requisitionId = Number.isSafeInteger(offer?.job_ad_id)
    ? String(offer.job_ad_id)
    : null
  const title = normalizeWhitespace(offer?.title)
  const location = normalizeIndiaLocation(offer?.location)
  const sourceUrl = toOfferUrl(offer?.url)

  if (!id || !requisitionId || !title || !location || !sourceUrl
    || offer?.career_domain !== new URL(CAREERS_URL).hostname
    || offer?.is_external !== false
    || offer?.is_aggregated !== false) {
    throw new Error('Decathlon India official offer changed materially or exposed an unsafe URL')
  }

  return {
    title,
    company: COMPANY,
    location,
    city: getCity(location),
    country: 'India',
    link: sourceUrl,
    applyUrl: sourceUrl,
    sourceUrl,
    source: SOURCE,
    jobId: id,
    requisitionId,
    department: normalizeWhitespace(offer.job),
    employmentType: normalizeWhitespace(offer.contract),
    jobDescription: null,
    remoteStatus: 'On-site',
    atsPlatform: 'digitalrecruiters',
    companyCareerPage: CAREERS_URL,
    sourceListingComplete: true,
    publicExperienceChecked: false,
  }
}

export const extractDecathlonOfferLinks = (payload) => {
  const { items } = normalizeApiPage(payload)
  return items.map((offer) => {
    const url = toOfferUrl(offer?.url)
    if (!url || offer?.career_domain !== new URL(CAREERS_URL).hostname) {
      throw new Error('Decathlon India official offer exposed an unsafe URL')
    }
    return url
  })
}

const defaultFetchHtml = async (url, { signal } = {}) => {
  const response = await fetch(url, {
    signal,
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Mozilla/5.0 (compatible; Jobverify Decathlon India scraper)',
    },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.text()
}

const defaultFetchJson = async (url, {
  signal,
  page,
  pageSize,
  body,
} = {}) => {
  const endpoint = new URL(url)
  endpoint.searchParams.set('domainName', new URL(CAREERS_URL).hostname)
  endpoint.searchParams.set('limit', String(pageSize))
  endpoint.searchParams.set('page', String(page))
  endpoint.searchParams.set('locale', 'en_GB')

  const response = await fetch(endpoint, {
    method: 'POST',
    signal,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; Jobverify Decathlon India scraper)',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${endpoint}`)
  return response.json()
}

export const createDecathlonIndiaScraper = ({
  fetchHtml = defaultFetchHtml,
  fetchJson = defaultFetchJson,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ signal = null, pageSize = 100, maxPages = 50 } = {}) {
    if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new Error('Decathlon India pageSize must be between 1 and 100')
    }
    if (!Number.isSafeInteger(maxPages) || maxPages < 1) {
      throw new Error('Decathlon India maxPages must be a positive integer')
    }

    signal?.throwIfAborted()
    validateOffersShell(await fetchHtml(CAREERS_URL, { signal }))
    signal?.throwIfAborted()

    const jobs = []
    const seen = new Set()
    let reportedTotal = null
    let pagesFetched = 0

    for (let page = 1; page <= maxPages; page += 1) {
      const payload = normalizeApiPage(await fetchJson(API_URL, {
        signal,
        page,
        pageSize,
        body: {},
      }))
      signal?.throwIfAborted()
      pagesFetched += 1
      reportedTotal ??= payload.count

      if (payload.count !== reportedTotal
        || payload.items.length > pageSize
        || jobs.length + payload.items.length > reportedTotal
        || (jobs.length < reportedTotal && payload.items.length === 0)) {
        throw new Error('Decathlon India official offers inventory is incomplete')
      }

      for (const rawOffer of payload.items) {
        const job = normalizeOffer(rawOffer)
        if (seen.has(job.jobId)) {
          throw new Error('Decathlon India official offers pagination repeated a job and is incomplete')
        }
        seen.add(job.jobId)
        jobs.push(job)
      }

      if (jobs.length === reportedTotal) break
    }

    if (reportedTotal == null || jobs.length !== reportedTotal) {
      throw new Error('Decathlon India official offers inventory is incomplete')
    }

    const verifiedAt = now()
    for (const job of jobs) job.scrapedAt = verifiedAt
    return attachInventoryEvidence(jobs, {
      status: jobs.length === 0 ? 'verified-empty' : 'complete-inventory',
      surface: API_URL,
      firstParty: true,
      listingComplete: true,
      pagesFetched,
      reportedTotal,
      indiaFacetCount: jobs.length,
      verifiedAt,
      reason: jobs.length === 0
        ? 'verified-decathlon-india-digitalrecruiters-empty'
        : 'complete-decathlon-india-digitalrecruiters-inventory',
    })
  },
})

export const run = async (options = {}) => createDecathlonIndiaScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
