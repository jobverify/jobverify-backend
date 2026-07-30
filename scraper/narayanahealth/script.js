import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { NARAYANA_HEALTH_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = NARAYANA_HEALTH_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const OFFICIAL_SITE_MAP_URL = PROVIDER_METADATA.siteMapUrl
export const OFFICIAL_CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VIEW_ALL_JOBS_URL = PROVIDER_METADATA.officialCareersHandoffUrl
export const BASE_URL = new URL(VIEW_ALL_JOBS_URL).origin
export const DEFAULT_LOCALE = 'en_GB'
export const DIRECT_CATEGORY_HANDOFF_URL = `${BASE_URL}/NH-India/`

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&#8217;|&rsquo;/gi, "'")
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/&#8212;|&mdash;/gi, '-')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(String(value))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  decodeHtmlEntities(String(value ?? ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? transform(match) : null
}

const toAbsoluteUrl = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(decodeHtmlEntities(normalized), BASE_URL).toString()
  } catch {
    return null
  }
}

const extractListItems = (value) => [...String(value ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const ACCEPTED_SITE_MAP_HANDOFF_URLS = new Set([
  OFFICIAL_CAREERS_URL,
  DIRECT_CATEGORY_HANDOFF_URL,
])

export const extractOfficialJobsBoardUrl = (html = '') => {
  for (const match of String(html ?? '').matchAll(/href=["']([^"']+)["']/gi)) {
    const url = toAbsoluteUrl(match[1])
    if (!url || !ACCEPTED_SITE_MAP_HANDOFF_URLS.has(url)) continue
    return url
  }

  return null
}

export const hasVerifiedSiteMapSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return text.includes('Sitemap')
    && text.includes('Careers')
    && ACCEPTED_SITE_MAP_HANDOFF_URLS.has(extractOfficialJobsBoardUrl(page))
}

export const hasOfficialCareersBoardSignal = (html = '') => {
  const text = stripTags(html) || ''

  return text.includes('About Narayana health')
    && text.includes('Medical Professionals')
    && text.includes('Paramedical & Admin Professionals')
    && text.includes('View All Jobs')
}

export const hasViewAllJobsSignal = (html = '') => {
  const text = stripTags(html) || ''

  return text.includes('Search by Category')
    && text.includes('Medical Professionals')
    && text.includes('Paramedical & Admin Professionals')
    && text.includes('Experienced Jobs')
    && text.includes('SAP as service provider')
}

export const extractCategoryUrls = (html = '') => {
  const seen = new Set()
  const categories = []

  for (const match of String(html ?? '').matchAll(
    /<a\b[^>]*href=["']([^"']*\/NH-India\/go\/[^"']+)["'][^>]*>/gi,
  )) {
    const url = toAbsoluteUrl(match[1])
    if (!url || seen.has(url)) continue
    seen.add(url)
    categories.push(url)
  }

  return categories
}

export const buildCategoryPageUrl = (categoryUrl, startRow = 0) => {
  const url = new URL(decodeHtmlEntities(categoryUrl), BASE_URL)
  url.search = ''
  url.hash = ''
  const normalizedPath = url.pathname.replace(/\/+$/i, '/')
  const basePath = normalizedPath.replace(/(\/\d+\/)\d+\/?$/i, '$1')

  if (Number.isInteger(startRow) && startRow > 0) {
    url.pathname = `${basePath}${startRow}/`
  } else {
    url.pathname = basePath
  }

  return url.toString()
}

export const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  return normalized.split(',')[0]?.trim() || null
}

export const extractJobIdFromUrl = (value) =>
  extractFirst(/\/(\d+)\/?(?:[#?].*)?$/i, value, (match) => match[1])

export const extractResultsSummary = (html = '') => {
  const summaryText = stripTags(
    extractFirst(/<span\b[^>]*class=["'][^"']*\bpaginationLabel\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i, html)
      || html,
  )

  const match = /Results\s+(\d+)\s+[-–]\s+(\d+)\s+of\s+(\d+)\s+Page\s+(\d+)\s+of\s+(\d+)/i.exec(
    summaryText || '',
  )

  if (!match) {
    return {
      totalResults: null,
      currentPage: null,
      totalPages: null,
      pageSize: null,
    }
  }

  const start = Number.parseInt(match[1], 10)
  const end = Number.parseInt(match[2], 10)
  const totalResults = Number.parseInt(match[3], 10)
  const currentPage = Number.parseInt(match[4], 10)
  const totalPages = Number.parseInt(match[5], 10)

  return {
    totalResults,
    currentPage,
    totalPages,
    pageSize: totalResults === 0 ? 0 : end - start + 1,
  }
}

const extractRequisitionId = (rowHtml) => normalizeWhitespace(
  extractFirst(/<td\b[^>]*class=["'][^"']*\bcolFacility\b[^"']*["'][^>]*>[\s\S]*?<span\b[^>]*>([\s\S]*?)<\/span>/i, rowHtml)
    || extractFirst(/<td\b[^>]*class=["'][^"']*\bcolFacility\b[^"']*["'][^>]*>([\s\S]*?)<\/td>/i, rowHtml),
)

export const extractSearchResults = (html = '') => {
  const rows = [...String(html ?? '').matchAll(
    /<tr\b[^>]*class=["'][^"']*\bdata-row\b[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi,
  )]

  return rows
    .map((rowMatch) => {
      const rowHtml = rowMatch[1]
      const relativeLink = normalizeWhitespace(
        extractFirst(
          /<a\b(?=[^>]*class=["'][^"']*\bjobTitle-link\b[^"']*["'])(?=[^>]*href=["']([^"']+)["'])[^>]*>/i,
          rowHtml,
        ),
      )
      const sourceUrl = toAbsoluteUrl(relativeLink)
      const title = normalizeWhitespace(
        extractFirst(/<a\b[^>]*class=["'][^"']*\bjobTitle-link\b[^"']*["'][^>]*>([\s\S]*?)<\/a>/i, rowHtml),
      )
      const location = normalizeWhitespace(
        extractFirst(/<span\b[^>]*class=["'][^"']*\bjobLocation\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i, rowHtml),
      )
      const postingDate = normalizeWhitespace(
        extractFirst(/<span\b[^>]*class=["'][^"']*\bjobDate\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i, rowHtml),
      )
      const requisitionId = extractRequisitionId(rowHtml)
      const jobId = extractJobIdFromUrl(sourceUrl)

      if (!title || !location || !sourceUrl || !jobId) return null

      return {
        title,
        department: null,
        location,
        city: extractCity(location),
        jobId,
        requisitionId: requisitionId || jobId,
        sourceUrl,
        postingDate,
      }
    })
    .filter(Boolean)
}

const extractRequisitionIdFromDetail = (html = '') => normalizeWhitespace(
  extractFirst(/Requisition\s*Id\s*:?\s*([0-9]+)/i, stripTags(html) || ''),
)

const isFilledRolePage = (html = '') =>
  /Sorry,\s*this position has been filled\./i.test(stripTags(html) || '')

export const extractJobDetail = (html = '', listing = {}) => {
  if (isFilledRolePage(html)) {
    return {
      title: listing.title || null,
      department: listing.department || null,
      location: listing.location || null,
      city: listing.city || extractCity(listing.location) || null,
      jobId: listing.jobId || null,
      requisitionId: listing.requisitionId || null,
      sourceUrl: listing.sourceUrl || null,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: listing.postingDate || null,
      closingDate: null,
      jobDescription: null,
      applyUrl: null,
    }
  }

  const descriptionHtml = extractFirst(
    /itemprop=["']description["'][^>]*>\s*<span\b[^>]*class=["'][^"']*\bjobdescription\b[^"']*["'][^>]*>([\s\S]*?)<\/span>\s*<\/span>/i,
    html,
  ) || extractFirst(
    /<span\b[^>]*class=["'][^"']*\bjobdescription\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
    html,
  ) || extractFirst(
    /<div\b[^>]*class=["'][^"']*\bjobdescription\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    html,
  )

  const applyPath = normalizeWhitespace(
    extractFirst(
      /<a\b[^>]*class=["'][^"']*\bdialogApplyBtn\b[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/i,
      html,
    ),
  )

  const jobId = normalizeWhitespace(
    extractFirst(/\/apply\/(\d+)\/\?locale=/i, applyPath),
  ) || listing.jobId || null

  return {
    title: normalizeWhitespace(
      extractFirst(/<(?:span|h1)\b[^>]*itemprop=["']title["'][^>]*>([\s\S]*?)<\/(?:span|h1)>/i, html)
        || extractFirst(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i, html),
    ) || listing.title || null,
    department: listing.department || null,
    location: listing.location || null,
    city: listing.city || extractCity(listing.location) || null,
    jobId,
    requisitionId: extractRequisitionIdFromDetail(html) || listing.requisitionId || jobId,
    sourceUrl: listing.sourceUrl || null,
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: extractListItems(descriptionHtml),
    postingDate: normalizeWhitespace(
      extractFirst(/itemprop=["']datePosted["'][^>]*content=["']([^"']+)["']/i, html),
    ) || listing.postingDate || null,
    closingDate: normalizeWhitespace(
      extractFirst(/itemprop=["']validThrough["'][^>]*content=["']([^"']+)["']/i, html),
    ) || null,
    jobDescription: stripTags(descriptionHtml),
    applyUrl: toAbsoluteUrl(applyPath),
  }
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const createNarayanaHealthScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    maxCategoryPages = Number.POSITIVE_INFINITY,
    maxJobs = null,
    now = () => new Date().toISOString(),
  } = {}) {
    const siteMapHtml = await fetchText(OFFICIAL_SITE_MAP_URL)
    if (!hasVerifiedSiteMapSignal(siteMapHtml)) {
      throw new Error('Narayana Health verified sitemap no longer matches the known careers handoff')
    }

    const careersLandingHtml = await fetchText(OFFICIAL_CAREERS_URL)
    if (!hasOfficialCareersBoardSignal(careersLandingHtml)) {
      throw new Error('Narayana Health official careers board no longer matches the verified first-party surface')
    }

    const categoryDiscoveryHtml = await fetchText(VIEW_ALL_JOBS_URL)
    if (!hasViewAllJobsSignal(categoryDiscoveryHtml)) {
      throw new Error('Narayana Health view-all jobs page no longer matches the verified category surface')
    }

    const jobs = []
    const seenJobIds = new Set()
    const categoryUrls = extractCategoryUrls(categoryDiscoveryHtml)

    for (const categoryUrl of categoryUrls) {
      let startRow = 0
      let pageNumber = 1

      while (pageNumber <= maxCategoryPages) {
        const categoryPageUrl = buildCategoryPageUrl(categoryUrl, startRow)
        const listingHtml = await fetchText(categoryPageUrl)
        const listings = extractSearchResults(listingHtml)
        const summary = extractResultsSummary(listingHtml)

        if (listings.length === 0) break

        for (const listing of listings) {
          if (seenJobIds.has(listing.jobId)) continue
          seenJobIds.add(listing.jobId)

          const detailHtml = await fetchText(listing.sourceUrl)
          const detail = extractJobDetail(detailHtml, listing)

          jobs.push({
            jobId: detail.jobId || listing.jobId,
            requisitionId: detail.requisitionId || listing.requisitionId,
            title: detail.title || listing.title,
            company: COMPANY,
            department: detail.department || listing.department || null,
            location: detail.location || listing.location,
            city: detail.city || listing.city,
            link: detail.applyUrl || detail.sourceUrl || listing.sourceUrl,
            applyUrl: detail.applyUrl || listing.sourceUrl,
            sourceUrl: detail.sourceUrl || listing.sourceUrl,
            source: SOURCE,
            employmentType: detail.employmentType,
            experienceRequired: detail.experienceRequired,
            jobDescription: detail.jobDescription,
            minimumQualification: detail.minimumQualification,
            preferredQualification: detail.preferredQualification,
            requiredSkills: detail.requiredSkills,
            postingDate: detail.postingDate || listing.postingDate,
            closingDate: detail.closingDate || null,
            scrapedAt: now(),
          })

          if (maxJobs && jobs.length >= maxJobs) {
            return jobs
          }
        }

        if (!summary.totalPages || pageNumber >= summary.totalPages) break

        startRow += summary.pageSize || listings.length
        pageNumber += 1
      }
    }

    return jobs
  },
})

export const run = async (options = {}) => createNarayanaHealthScraper().run(options)

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
