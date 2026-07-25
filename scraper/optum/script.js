import path from 'path'
import { fileURLToPath } from 'url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const COMPANY_NAME = 'Optum'
export const SOURCE = 'optum'
export const ATS_PLATFORM = 'talentbrew-radancy+oracle-taleo'
export const BASE_URL = 'https://careers.unitedhealthgroup.com'
export const CAREER_PAGE_URL = `${BASE_URL}/location/india-jobs/34088/1269750/2`

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

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
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const htmlToText = (value) => stripTags(value)

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? transform(match) : null
}

const toAbsoluteUrl = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, BASE_URL).toString()
  } catch {
    return null
  }
}

const extractCity = (location) => normalizeWhitespace(location)?.split(',')[0]?.trim() || null

const extractBrandedJobId = (value) => normalizeWhitespace(
  extractFirst(/\/(\d+)(?:[/?#]|$)/, value || ''),
)

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (normalized === 'full_time' || normalized === 'full time' || normalized === 'full-time') return 'Full-time'
  if (normalized === 'part_time' || normalized === 'part time' || normalized === 'part-time') return 'Part-time'
  if (normalized.includes('contract')) return 'Contract'
  return normalizeWhitespace(value)
}

const normalizeDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const isoLike = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(normalized)
  if (isoLike) {
    const [, year, month, day] = isoLike
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

const extractJobPosting = (html) => {
  for (const match of String(html ?? '').matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1])
      const payloads = Array.isArray(parsed) ? parsed : [parsed]
      const jobPosting = payloads.find((item) => item?.['@type'] === 'JobPosting')
      if (jobPosting) return jobPosting
    } catch {
      // Ignore unrelated JSON-LD payloads.
    }
  }

  return null
}

const getSectionKey = (label) => {
  const normalized = normalizeWhitespace(label)?.toLowerCase()
  if (!normalized) return null
  if (normalized === 'required qualifications' || normalized === 'required skills') return 'required'
  if (normalized === 'preferred qualifications' || normalized === 'preferred skills') return 'preferred'
  return null
}

const addSectionMarkers = (html) => String(html ?? '').replace(
  /<(p|h[1-6]|strong)[^>]*>[\s\S]*?<\/\1>/gi,
  (block) => {
    const sectionKey = getSectionKey(stripTags(block))
    return sectionKey ? `[[SECTION:${sectionKey}]]` : block
  },
)

const extractSectionBlock = (html, sectionKey) => extractFirst(
  new RegExp(`\\[\\[SECTION:${sectionKey}\\]\\]([\\s\\S]*?)(?=\\[\\[SECTION:|$)`, 'i'),
  addSectionMarkers(html),
)

const extractListItems = (html) => [...String(html ?? '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => htmlToText(match[1]))
  .filter(Boolean)

const extractRequiredSkills = (descriptionHtml) => extractListItems(
  extractSectionBlock(descriptionHtml, 'required'),
)

const extractPreferredQualification = (descriptionHtml) => {
  const items = extractListItems(extractSectionBlock(descriptionHtml, 'preferred'))
  return items.length > 0 ? items.join('; ') : null
}

const extractMinimumQualification = (descriptionText) => {
  const match = String(descriptionText ?? '').match(
    /([^.]*(?:Bachelor'?s|Master'?s|B\.Tech|B\.E\.|M\.Tech|MBA)[^.]*\.)/i,
  )
  return match ? normalizeWhitespace(match[1]) : null
}

const extractLocationFromJobPosting = (jobPosting = {}) => {
  const location = Array.isArray(jobPosting.jobLocation) ? jobPosting.jobLocation[0] : jobPosting.jobLocation
  const address = location?.address || {}
  const city = normalizeWhitespace(address.addressLocality)
  const region = normalizeWhitespace(address.addressRegion)
  const country = normalizeWhitespace(address.addressCountry)

  return [city, region, country].filter(Boolean).join(', ') || null
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const buildSearchUrl = ({ page = 1 } = {}) => {
  const pageNumber = Math.max(1, Number(page) || 1)
  return pageNumber === 1 ? CAREER_PAGE_URL : `${CAREER_PAGE_URL}/${pageNumber}`
}

export const extractSearchResults = (html) => {
  const section = extractFirst(/<section id="search-results-list">([\s\S]*?)<\/section>/i, html)
  if (!section) return []

  return [...section.matchAll(
    /<a[^>]*class="[^"]*\bsr-item\b[^"]*"[^>]*href="([^"]+)"[^>]*data-job-id="([^"]+)"[^>]*>[\s\S]*?<h2>([\s\S]*?)<\/h2>[\s\S]*?<span class="job-location">([\s\S]*?)<\/span>/gi,
  )]
    .map((match) => {
      const sourceUrl = toAbsoluteUrl(match[1])
      const jobId = normalizeWhitespace(match[2])
      const title = normalizeWhitespace(match[3])
      const location = normalizeWhitespace(match[4])

      if (!sourceUrl || !jobId || !title || !location) return null

      return {
        title,
        company: COMPANY_NAME,
        department: null,
        location,
        city: extractCity(location),
        country: 'India',
        jobId,
        requisitionId: jobId,
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: null,
      }
    })
    .filter(Boolean)
}

export const extractPaginationSummary = (html) => {
  const currentPage = Number.parseInt(
    extractFirst(/data-current-page="(\d+)"/i, html) || '',
    10,
  )
  const totalPages = Number.parseInt(
    extractFirst(/data-total-pages="(\d+)"/i, html) || '',
    10,
  )
  const totalJobCount = Number.parseInt(
    extractFirst(/data-total-results="(\d+)"/i, html) || '',
    10,
  )
  const pageSize = Number.parseInt(
    extractFirst(/data-records-per-page="(\d+)"/i, html) || '',
    10,
  )
  const nextUrl = toAbsoluteUrl(extractFirst(/<a class="next"[^>]+href="([^"]+)"/i, html))

  return {
    hasNext: Boolean(
      nextUrl
      || (Number.isFinite(currentPage) && Number.isFinite(totalPages) && currentPage < totalPages)
    ),
    currentPage: Number.isFinite(currentPage) ? currentPage : null,
    totalPages: Number.isFinite(totalPages) ? totalPages : null,
    totalJobCount: Number.isFinite(totalJobCount) ? totalJobCount : null,
    pageSize: Number.isFinite(pageSize) ? pageSize : null,
    nextUrl,
  }
}

export const extractJobDetail = (html, listing = {}) => {
  const jobPosting = extractJobPosting(html)
  const descriptionHtml = jobPosting?.description || ''
  const descriptionText = htmlToText(descriptionHtml)
  const location = normalizeWhitespace(
    extractFirst(
      /<span class="job-location-jd job-info"><b>Location<\/b>\s*([\s\S]*?)<\/span>/i,
      html,
      (match) => stripTags(match[1]),
    ),
  ) || extractLocationFromJobPosting(jobPosting) || listing.location || null
  const applyUrl = toAbsoluteUrl(
    extractFirst(/<meta name="search-job-apply-url" content="([^"]+)"/i, html),
  ) || toAbsoluteUrl(
    extractFirst(/<a[^>]+class="[^"]*job-apply[^"]*"[^>]+href="([^"]+)"/i, html),
  ) || listing.applyUrl || listing.sourceUrl || null
  const requisitionId = normalizeWhitespace(
    extractFirst(/<meta name="job-ats-req-id" content="([^"]+)"/i, html),
  ) || normalizeWhitespace(
    extractFirst(/[?&]job=([^&]+)/i, applyUrl || ''),
  ) || normalizeWhitespace(jobPosting?.identifier) || listing.requisitionId || listing.jobId || null

  return {
    title: normalizeWhitespace(
      extractFirst(/<section id="job-detail-pull">[\s\S]*?<h1>([\s\S]*?)<\/h1>/i, html),
    ) || normalizeWhitespace(jobPosting?.title) || listing.title || null,
    company: normalizeWhitespace(jobPosting?.hiringOrganization?.name) || COMPANY_NAME,
    department: normalizeWhitespace(
      extractFirst(
        /<span class="job-category-jd job-info"><b>Category<\/b>\s*([\s\S]*?)<\/span>/i,
        html,
        (match) => stripTags(match[1]),
      ),
    ) || listing.department || null,
    location,
    city: extractCity(location) || listing.city || null,
    country: 'India',
    jobId: listing.jobId || extractBrandedJobId(listing.sourceUrl || jobPosting?.url) || null,
    requisitionId,
    sourceUrl: listing.sourceUrl || normalizeWhitespace(jobPosting?.url) || null,
    applyUrl,
    employmentType: normalizeEmploymentType(jobPosting?.employmentType),
    experienceRequired: null,
    minimumQualification: extractMinimumQualification(descriptionText),
    preferredQualification: extractPreferredQualification(descriptionHtml),
    requiredSkills: extractRequiredSkills(descriptionHtml),
    postingDate: normalizeDate(jobPosting?.datePosted),
    closingDate: null,
    jobDescription: descriptionText || null,
    remoteStatus: null,
  }
}

export const createOptumScraper = ({
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY,
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const now = options.now || (() => new Date().toISOString())
    const jobs = []
    const seenJobIds = new Set()
    let currentUrl = buildSearchUrl()
    let page = 0

    while (currentUrl && page < maxPages) {
      page += 1
      const listingHtml = await fetchText(currentUrl)
      const listings = extractSearchResults(listingHtml)
      const summary = extractPaginationSummary(listingHtml)

      for (const listing of listings) {
        if (seenJobIds.has(listing.jobId)) continue
        seenJobIds.add(listing.jobId)

        const detailHtml = await fetchText(listing.sourceUrl)
        const detail = extractJobDetail(detailHtml, listing)

        jobs.push({
          jobId: detail.jobId || listing.jobId,
          requisitionId: detail.requisitionId || listing.requisitionId,
          title: detail.title || listing.title,
          company: detail.company || COMPANY_NAME,
          department: detail.department || listing.department,
          location: detail.location || listing.location,
          city: detail.city || listing.city,
          country: detail.country || listing.country,
          link: detail.applyUrl || detail.sourceUrl || listing.sourceUrl,
          applyUrl: detail.applyUrl || listing.applyUrl,
          sourceUrl: detail.sourceUrl || listing.sourceUrl,
          source: SOURCE,
          employmentType: detail.employmentType || listing.employmentType,
          experienceRequired: detail.experienceRequired,
          jobDescription: detail.jobDescription,
          minimumQualification: detail.minimumQualification,
          preferredQualification: detail.preferredQualification,
          requiredSkills: detail.requiredSkills,
          postingDate: detail.postingDate || listing.postingDate,
          closingDate: detail.closingDate,
          remoteStatus: detail.remoteStatus ?? null,
          scrapedAt: now(),
        })

        if (maxJobs && jobs.length >= maxJobs) {
          return jobs
        }
      }

      if (!summary.hasNext || !summary.nextUrl || (summary.totalPages && page >= summary.totalPages)) {
        break
      }

      currentUrl = summary.nextUrl
    }

    return jobs
  },
})

export const run = async (options = {}) => createOptumScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running ${COMPANY_NAME} scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, SOURCE)
    console.log('DB result:', result)
    process.exit(0)
  }
}
