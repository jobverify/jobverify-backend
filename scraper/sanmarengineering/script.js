import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'sanmarengineering'
export const COMPANY = 'The Sanmar Group (Sanmar Engineering)'
export const CAREERS_URL = 'https://www.sanmargroup.com/working-at-sanmar/opportunities/'
export const AJAX_URL = 'https://www.sanmargroup.com/wp-admin/admin-ajax.php'
export const POSTS_PER_PAGE = 10
export const AJAX_TEMPLATE_FILE = 'template-parts/dropdown-filter-layouts/career-post-layout'
export const ENGINEERING_BUSINESS_AREAS = [
  'Flowserve Sanmar Private Limited',
  'Anderson Greenwood Crosby Sanmar Limited / Xomox Sanmar Limited',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&#x27;|&rsquo;|&#8217;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtml(value)
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  decodeHtml(value)
    .replace(/<(br|\/p|\/div|\/li|\/ul|\/ol|\/h[1-6]|\/section)\b[^>]*>/gi, '\n')
    .replace(/<(p|div|li|ul|ol|h[1-6]|section)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const toAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const deriveJobIdFromUrl = (value) => {
  try {
    const segments = new URL(value).pathname.split('/').filter(Boolean)
    return slugify(segments.at(-1))
  } catch {
    return slugify(value)
  }
}

const dedupeValues = (values = []) => {
  const deduped = []
  const seen = new Set()

  for (const value of values) {
    if (!value || seen.has(value)) continue
    seen.add(value)
    deduped.push(value)
  }

  return deduped
}

const normalizeBusinessArea = (value) => normalizeWhitespace(value)

const hasExpectedBusinessAreas = (values = []) =>
  values.length === ENGINEERING_BUSINESS_AREAS.length
  && ENGINEERING_BUSINESS_AREAS.every((businessArea, index) => values[index] === businessArea)

export const hasOfficialCareersSurface = (html) => {
  const page = String(html ?? '')

  return /The Sanmar Group/i.test(page)
    && /filter_career_posts/i.test(page)
    && /<select[^>]+name=["']business_area["']/i.test(page)
}

export const extractEngineeringBusinessAreas = (html) =>
  dedupeValues(
    [...String(html ?? '').matchAll(/<option[^>]+value=["']([^"']+)["'][^>]*>/gi)]
      .map(([, value]) => normalizeBusinessArea(value))
      .filter((value) => ENGINEERING_BUSINESS_AREAS.includes(value)),
  )

export const buildAjaxRequestBody = ({ businessArea, paged = 1 } = {}) =>
  new URLSearchParams({
    action: 'filter_career_posts',
    post_type: 'job-opening',
    posts_per_page: String(POSTS_PER_PAGE),
    order: 'DESC',
    post_status: 'publish',
    template_file: AJAX_TEMPLATE_FILE,
    not_found_message: 'No job openings found',
    paged: String(paged),
    job_title: '',
    business_area: String(businessArea ?? ''),
    location: '',
  }).toString()

export const extractListingsFromHtml = (html) =>
  [...String(html ?? '').matchAll(
    /<div class="content_row">[\s\S]*?<div class="col col-title">([\s\S]*?)<\/div>[\s\S]*?<div class="col col-business">([\s\S]*?)<\/div>[\s\S]*?<div class="col col-location">([\s\S]*?)<\/div>[\s\S]*?<div class="col col-exp">([\s\S]*?)<\/div>[\s\S]*?<a href="([^"]+)"[^>]*class="apply-now"/gi,
  )]
    .map(([, rawTitle, rawBusinessArea, rawLocation, rawExperience, rawSourceUrl]) => {
      const title = stripTags(rawTitle)
      const businessArea = normalizeBusinessArea(rawBusinessArea)
      const location = stripTags(rawLocation)
      const experienceRequired = stripTags(rawExperience)
      const sourceUrl = toAbsoluteUrl(normalizeWhitespace(rawSourceUrl))

      if (!title || !businessArea || !location || !sourceUrl) {
        return null
      }

      return {
        title,
        businessArea,
        location,
        experienceRequired,
        sourceUrl,
      }
    })
    .filter(Boolean)

const dedupeListings = (listings = []) => {
  const deduped = []
  const seen = new Set()

  for (const listing of listings) {
    const key = listing.sourceUrl || `${listing.title}|${listing.businessArea}|${listing.location}`
    if (!key || seen.has(key)) continue

    seen.add(key)
    deduped.push(listing)
  }

  return deduped
}

const deriveCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized || /^head office$/i.test(normalized) || /&|\/|\|/.test(normalized)) {
    return null
  }

  const parts = normalized
    .split(',')
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)

  if (parts.length === 0 || parts.length > 2) {
    return null
  }

  return parts.length === 2 ? parts[1] : parts[0]
}

const buildJobDescription = ({ businessArea, location, experienceRequired }) => {
  const parts = []

  if (businessArea) parts.push(`Business area: ${businessArea}`)
  if (location) parts.push(`Location: ${location}`)
  if (experienceRequired) parts.push(`Experience: ${experienceRequired}`)

  return parts.length > 0 ? `${parts.join('. ')}.` : null
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchJson = (url, options = {}) => fetchJsonWithRetry(url, {
  method: 'POST',
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/javascript,*/*;q=0.01',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    Origin: 'https://www.sanmargroup.com',
    Referer: CAREERS_URL,
    'X-Requested-With': 'XMLHttpRequest',
  },
  label: SOURCE,
  timeoutMs: 15000,
  ...options,
})

const fetchBusinessAreaListings = async (businessArea, { fetchJson }) => {
  const listings = []
  let paged = 1

  while (true) {
    const payload = await fetchJson(AJAX_URL, {
      body: buildAjaxRequestBody({ businessArea, paged }),
    })

    if (!payload?.success) break

    const pageListings = extractListingsFromHtml(payload?.data?.html ?? '')
    if (pageListings.length === 0) break

    listings.push(...pageListings)

    const totalCount = Number.parseInt(payload?.data?.post_count, 10)
    if (!Number.isFinite(totalCount) || paged * POSTS_PER_PAGE >= totalCount) {
      break
    }

    paged += 1
  }

  return listings
}

export const createSanmarEngineeringScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({ fetchText = defaultFetchText, fetchJson = defaultFetchJson } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSurface(careersHtml)) {
      throw new Error('Sanmar official careers page no longer matches the verified engineering opportunities surface')
    }

    const businessAreas = extractEngineeringBusinessAreas(careersHtml)
    if (!hasExpectedBusinessAreas(businessAreas)) {
      throw new Error('Sanmar official careers page no longer exposes the verified engineering business-area filters')
    }

    const allListings = []
    for (const businessArea of ENGINEERING_BUSINESS_AREAS) {
      allListings.push(...await fetchBusinessAreaListings(businessArea, { fetchJson }))
    }

    const selectedListings = maxJobs
      ? dedupeListings(allListings).slice(0, maxJobs)
      : dedupeListings(allListings)

    return selectedListings.map((listing) => {
      const jobId = deriveJobIdFromUrl(listing.sourceUrl)

      return {
        title: listing.title,
        company: COMPANY,
        department: listing.businessArea,
        location: listing.location,
        city: deriveCity(listing.location),
        country: 'India',
        source: SOURCE,
        jobId,
        requisitionId: jobId,
        sourceUrl: listing.sourceUrl,
        applyUrl: listing.sourceUrl,
        link: listing.sourceUrl,
        employmentType: null,
        experienceRequired: listing.experienceRequired,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: buildJobDescription(listing),
        remoteStatus: null,
        scrapedAt: new Date().toISOString(),
      }
    })
  },
})

export const run = async (options = {}) => createSanmarEngineeringScraper().run(options)

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
