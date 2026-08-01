import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { HERO_MOTO_CORP_CATALOG } from './catalog.js'

export const PROVIDER_METADATA = HERO_MOTO_CORP_CATALOG
export const COMPANY = PROVIDER_METADATA.companyName
export const SOURCE = PROVIDER_METADATA.source
export const OFFICIAL_CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VIEW_ALL_JOBS_URL = PROVIDER_METADATA.officialCareersHandoffUrl
export const BASE_URL = new URL(VIEW_ALL_JOBS_URL).origin
export const COMPANY_DOMAIN = PROVIDER_METADATA.companyDomain
export const ATS_PLATFORM = PROVIDER_METADATA.atsPlatform
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const DEFAULT_LOCALE = 'en_GB'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&ndash;|&#8211;/gi, '-')
  .replace(/&mdash;|&#8212;/gi, '-')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul)\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, ' '),
)

const toAbsoluteUrl = (value) => {
  try {
    return new URL(decodeHtmlEntities(value), BASE_URL).toString()
  } catch {
    return null
  }
}

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? transform(match) : null
}

export const extractOfficialJobsBoardUrl = (html = '') => normalizeWhitespace(
  extractFirst(
    /href=["'](https:\/\/jobs\.heromotocorp\.com\/viewalljobs\/?)["']/i,
    html,
  ),
)

export const hasOfficialHeroMotoCorpCareersSignals = (html = '') => {
  const page = String(html ?? '')
  const normalized = (normalizeWhitespace(page) || '').toLowerCase()

  return normalized.includes('hero motocorp')
    && (normalized.includes('career overview') || normalized.includes('careers'))
    && extractOfficialJobsBoardUrl(page) === VIEW_ALL_JOBS_URL
}

export const buildCategoryPageUrl = (categoryUrl, startRow = 0) => {
  const url = new URL(decodeHtmlEntities(categoryUrl), BASE_URL)

  if (Number.isInteger(startRow) && startRow > 0) {
    url.searchParams.set('startrow', String(startRow))
  }

  return url.toString()
}

export const extractCategoryUrls = (html) => {
  const seen = new Set()
  const categories = []

  for (const match of String(html ?? '').matchAll(
    /<a\b[^>]*href=["']((?:https?:\/\/[^"']+)?\/(?:default\/)?go\/[^"']+)["'][^>]*>/gi,
  )) {
    const categoryUrl = toAbsoluteUrl(match[1])
    if (!categoryUrl || seen.has(categoryUrl)) continue
    seen.add(categoryUrl)
    categories.push(categoryUrl)
  }

  return categories
}

export const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  return normalized.split(',')[0]?.trim() || null
}

export const extractJobIdFromUrl = (value) =>
  extractFirst(/\/(\d+)\/?(?:[#?].*)?$/i, value, (match) => match[1])

export const extractResultsSummary = (html) => {
  const summaryText = stripTags(
    extractFirst(/<span\b[^>]*class=["'][^"']*\bpaginationLabel\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i, html)
      || html,
  )

  const match = /Results\s+(\d+)\s+[–-]\s+(\d+)\s+of\s+(\d+)\s+Page\s+(\d+)\s+of\s+(\d+)/i.exec(
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

export const extractSearchResults = (html) => {
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
      const jobId = extractJobIdFromUrl(sourceUrl)
      const title = normalizeWhitespace(
        extractFirst(/<a\b[^>]*class=["'][^"']*\bjobTitle-link\b[^"']*["'][^>]*>([\s\S]*?)<\/a>/i, rowHtml),
      )
      const department = normalizeWhitespace(
        extractFirst(/<span\b[^>]*class=["'][^"']*\bjobDepartment\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i, rowHtml),
      )
      const location = normalizeWhitespace(
        extractFirst(
          /<td\b[^>]*class=["'][^"']*\bcolLocation\b[^"']*["'][^>]*>[\s\S]*?<span\b[^>]*class=["'][^"']*\bjobLocation\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
          rowHtml,
        ) || extractFirst(
          /<span\b[^>]*class=["'][^"']*\bjobLocation\b[^"']*["'][^>]*>\s*<span\b[^>]*class=["'][^"']*\bjobLocation\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
          rowHtml,
        ) || extractFirst(
          /<span\b[^>]*class=["'][^"']*\bjobLocation\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
          rowHtml,
        ),
      )
      const postingDate = normalizeWhitespace(
        extractFirst(
          /<td\b[^>]*class=["'][^"']*\bcolDate\b[^"']*["'][^>]*>[\s\S]*?<span\b[^>]*class=["'][^"']*\bjobDate\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
          rowHtml,
        ) || extractFirst(/<span\b[^>]*class=["'][^"']*\bjobDate\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i, rowHtml),
      )

      if (!title || !location || !sourceUrl || !jobId) return null

      return {
        title,
        department,
        location,
        city: extractCity(location),
        jobId,
        requisitionId: jobId,
        sourceUrl,
        postingDate,
      }
    })
    .filter(Boolean)
}

const extractListItems = (value) => [...String(value ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

export const extractJobDetail = (html, listing = {}) => {
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
      /<a\b[^>]*class=["'][^"']*\bapply\b[^"']*\bdialogApplyBtn\b[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/i,
      html,
    ),
  )

  const jobId = normalizeWhitespace(
    extractFirst(/\/apply\/(\d+)\/\?locale=/i, applyPath),
  ) || listing.jobId || null

  return {
    title: normalizeWhitespace(
      extractFirst(/<(?:span|h1)\b[^>]*itemprop=["']title["'][^>]*>([\s\S]*?)<\/(?:span|h1)>/i, html),
    ) || listing.title || null,
    department: listing.department || null,
    location: listing.location || null,
    city: listing.city || extractCity(listing.location) || null,
    jobId,
    requisitionId: listing.requisitionId || jobId,
    sourceUrl: listing.sourceUrl || null,
    employmentType: 'Full-time',
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
    applyUrl:
      toAbsoluteUrl(applyPath)
      || (jobId ? toAbsoluteUrl(`/talentcommunity/apply/${jobId}/?locale=${DEFAULT_LOCALE}`) : null),
  }
}

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

export const createHeroMotoCorpScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    maxCategoryPages = Number.POSITIVE_INFINITY,
    maxJobs = null,
    now = () => new Date().toISOString(),
  } = {}) {
    const officialCareersHtml = await fetchText(OFFICIAL_CAREERS_URL)
    if (!hasOfficialHeroMotoCorpCareersSignals(officialCareersHtml)) {
      throw new Error('Hero MotoCorp verified official careers page no longer matches the verified public surface')
    }

    const categoryDiscoveryHtml = await fetchText(VIEW_ALL_JOBS_URL)
    const categoryUrls = extractCategoryUrls(categoryDiscoveryHtml)
    const jobs = []
    const seenJobIds = new Set()

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

export const run = async (options = {}) => createHeroMotoCorpScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
