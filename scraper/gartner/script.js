import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

import { GARTNER_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = GARTNER_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const LISTINGS_URL = PROVIDER_METADATA.companyCareerPage
export const COMPANY_DOMAIN = PROVIDER_METADATA.companyDomain
export const ATS_PLATFORM = PROVIDER_METADATA.atsPlatform
export const COUNTRY_FILTER = PROVIDER_METADATA.countryFilter
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const DEFAULT_TIMEOUT_MS = 120000

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&#34;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&#8217;|&rsquo;|&#x27;/gi, "'")
  .replace(/&ndash;|&#8211;/gi, '-')
  .replace(/&mdash;|&#8212;/gi, '-')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(value)
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeText = (value) => {
  const normalized = normalizeWhitespace(value)
  return normalized || null
}

const stripTagsToText = (value) => normalizeText(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const toAbsoluteUrl = (value) => {
  try {
    return new URL(value, HOMEPAGE_URL).toString()
  } catch {
    return null
  }
}

const extractJobIdFromHref = (value) => normalizeText(
  String(value ?? '').match(/\/jobs\/job\/(\d+)-/i)?.[1],
)

const extractFirst = (pattern, value) => {
  const match = pattern.exec(String(value ?? ''))
  return match?.[1] ?? null
}

const extractCity = (location) => normalizeText(String(location ?? '').split(',')[0])

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const buildListingsUrl = ({ page = 1 } = {}) => {
  if (Number(page) <= 1) return LISTINGS_URL

  const url = new URL('/jobs/', HOMEPAGE_URL)
  url.searchParams.set('country', COUNTRY_FILTER)
  url.searchParams.set('page', String(Number(page)))
  return url.toString()
}

export const hasListingsPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()

  return normalized.includes('career opportunities')
    && page.includes('grid job-listing')
    && page.includes('card card-job js-job')
    && page.includes('/jobs/job/')
}

export const extractSearchResults = (html = '') => [...String(html ?? '').matchAll(
  /<div class="card card-job js-job"[\s\S]*?<a[\s\S]*?(?:'jobid':\s*'(\d+)')?[\s\S]*?href="([^"]+)"[\s\S]*?>([\s\S]*?)<\/a>[\s\S]*?<ul class="job-meta">([\s\S]*?)<\/ul>/gi,
)]
  .map((match) => {
    const sourceUrl = toAbsoluteUrl(match[2])
    const title = normalizeText(match[3])
    const location = normalizeText(
      extractFirst(/<li\b[^>]*>([\s\S]*?)<\/li>/i, match[4]),
    )
    const jobId = normalizeText(match[1]) || extractJobIdFromHref(match[2])

    if (!sourceUrl || !title || !location || !jobId) return null

    return {
      title,
      location,
      city: extractCity(location),
      jobId,
      requisitionId: jobId,
      sourceUrl,
    }
  })
  .filter(Boolean)

export const hasJobDetailSignal = (html = '') => {
  const page = String(html ?? '')
  return /<h1 class="display-2">[\s\S]*?<\/h1>/i.test(page)
    && /<article class="cms-content">[\s\S]*?<\/article>/i.test(page)
    && /Job Requisition ID\s*:\s*\d+/i.test(page)
    && /<a[^>]+class="btn btn-primary btn-block"[^>]+href="https:\/\/gartner\.wd5\.myworkdayjobs\.com\/[^"]+\/apply"[^>]*>\s*Apply Now\s*<\/a>/i.test(page)
}

const extractDetailMeta = (html = '') => {
  const metaHtml = extractFirst(/<ul class="job-meta">([\s\S]*?)<\/ul>/i, html)
  const items = [...String(metaHtml ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => stripTagsToText(match[1]))
    .filter(Boolean)

  return {
    location: items[0] ?? null,
    department: items[1] ?? null,
  }
}

const extractPublishedDate = (html = '') => {
  const value = extractFirst(
    /<meta property="http:\/\/ogp\.me\/ns\/article#published_time" content="([^"]+)"/i,
    html,
  ) || extractFirst(
    /<meta property="http:\/\/ogp\.me\/ns\/article#modified_time" content="([^"]+)"/i,
    html,
  )

  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  const year = parsed.getUTCFullYear()
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
  const day = String(parsed.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const extractJobDetail = (html = '', listing = {}) => {
  if (!hasJobDetailSignal(html)) {
    throw new Error('Gartner job detail no longer matches the verified first-party surface')
  }

  const title = normalizeText(extractFirst(/<h1 class="display-2">([\s\S]*?)<\/h1>/i, html))
    || listing.title
  const { location, department } = extractDetailMeta(html)
  const requisitionId = normalizeText(extractFirst(/Job Requisition ID\s*:\s*(\d+)/i, html))
    || listing.requisitionId
    || listing.jobId
  const sourceUrl = listing.sourceUrl || null
  const applyUrl = toAbsoluteUrl(
    extractFirst(
      /<a[^>]+class="btn btn-primary btn-block"[^>]+href="([^"]+)"[^>]*>\s*Apply Now/i,
      html,
    ),
  )
  const descriptionHtml = extractFirst(/<article class="cms-content">([\s\S]*?)<\/article>/i, html)

  return {
    title,
    company: COMPANY,
    department,
    location: location || listing.location || null,
    city: extractCity(location || listing.location),
    jobId: requisitionId,
    requisitionId,
    sourceUrl,
    applyUrl,
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: extractPublishedDate(html),
    closingDate: null,
    jobDescription: stripTagsToText(descriptionHtml),
    companyCareerPage: LISTINGS_URL,
    companyDomain: COMPANY_DOMAIN,
    atsPlatform: ATS_PLATFORM,
  }
}

export const createGartnerScraper = ({
  now = () => new Date().toISOString(),
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY,
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const listings = []
    const seenJobIds = new Set()

    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
      const url = buildListingsUrl({ page: pageNumber })
      const html = await fetchText(url)
      if (!hasListingsPageSignal(html)) {
        throw new Error('Gartner listings page no longer matches the verified India jobs surface')
      }

      const pageListings = extractSearchResults(html)
      if (pageListings.length === 0) break

      let newListings = 0
      for (const listing of pageListings) {
        if (seenJobIds.has(listing.jobId)) continue
        seenJobIds.add(listing.jobId)
        listings.push(listing)
        newListings += 1
      }

      if (newListings === 0) break
      if (Number.isInteger(maxJobs) && maxJobs > 0 && listings.length >= maxJobs) break
    }

    const limitedListings = Number.isInteger(maxJobs) && maxJobs > 0
      ? listings.slice(0, maxJobs)
      : listings

    const jobs = []
    for (const listing of limitedListings) {
      const html = await fetchText(listing.sourceUrl)
      const detail = extractJobDetail(html, listing)

      jobs.push({
        ...detail,
        source: SOURCE,
        link: detail.applyUrl || detail.sourceUrl,
        scrapedAt: now(),
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createGartnerScraper(options).run()

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
