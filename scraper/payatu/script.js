import path from 'path'
import { fileURLToPath } from 'url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const COMPANY_NAME = 'Payatu'
export const COUNTRY_FILTER = 'India'
export const OFFICIAL_CAREERS_URL = 'https://payatu.com/career/'
export const LISTING_URL = 'https://payatu.freshteam.com/jobs'
export const DETAIL_URL_PATTERN = 'https://payatu.freshteam.com/jobs/{opaque_id}/{slug}'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const firstMatch = (source, patterns) => {
  for (const pattern of patterns) {
    const match = String(source ?? '').match(pattern)
    const value = normalizeWhitespace(match?.[1])
    if (value) return value
  }

  return null
}

const toAbsoluteUrl = (value, baseUrl = LISTING_URL) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const extractDetailPathParts = (value) => {
  try {
    const pathname = new URL(value).pathname.replace(/\/+$/, '')
    const match = pathname.match(/\/jobs\/([^/]+)\/([^/]+)$/i)
    if (!match) return { opaqueId: null, slug: null }

    return {
      opaqueId: match[1],
      slug: match[2],
    }
  } catch {
    return { opaqueId: null, slug: null }
  }
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase() || ''
  if (!normalized) return null
  if (normalized.includes('full time')) return 'Full-time'
  if (normalized.includes('part time')) return 'Part-time'
  if (normalized.includes('intern')) return 'Internship'
  if (normalized.includes('contract')) return 'Contract'
  return normalizeWhitespace(value)
}

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return COUNTRY_FILTER
  if (/remote|work from home/i.test(normalized)) return `Remote, ${COUNTRY_FILTER}`
  if (/,\s*india$/i.test(normalized)) return normalized
  return `${normalized}, ${COUNTRY_FILTER}`
}

const extractCity = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized || /remote|work from home/i.test(normalized)) return null
  return normalized.split(',')[0]?.trim() || null
}

const inferRemoteStatus = (...values) => {
  const normalizedValues = values
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean)

  const joined = normalizedValues.join(' ').toLowerCase()
  if (normalizedValues.some((value) => /^true$/i.test(value))) return 'Remote'
  if (joined.includes('hybrid')) return 'Hybrid'
  if (joined.includes('remote') || joined.includes('work from home')) return 'Remote'
  return 'On-site'
}

const extractExperienceRequired = (value) =>
  normalizeWhitespace((normalizeWhitespace(value) || '').match(/\b\d+\s*(?:\+|-\s*\d+)?\s*years\b/i)?.[0])

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /\bPayatu\b/i.test(page)
    && /View Open Positions|OPEN POSITIONS/i.test(page)
    && /<iframe[^>]+src="[^"]+"/i.test(page)
}

export const extractFreshteamJobsUrl = (html) =>
  toAbsoluteUrl(firstMatch(html, [
    /<iframe[^>]+src="([^"]*freshteam\.com\/jobs[^"]*)"/i,
  ]), OFFICIAL_CAREERS_URL)

export const buildDetailUrl = (opaqueId, slug) =>
  DETAIL_URL_PATTERN
    .replace('{opaque_id}', opaqueId)
    .replace('{slug}', slug)

const extractLocationParts = (value) => {
  const parts = decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n')
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)

  return {
    locationText: parts[0] || null,
    employmentType: parts[1] || null,
  }
}

export const extractListingJobs = (html) => {
  const jobs = []
  const rolePattern = /<li[^>]*data-portal-role="[^"]+"[^>]*>([\s\S]*?)<\/li>/gi

  for (const roleMatch of String(html ?? '').matchAll(rolePattern)) {
    const roleBlock = roleMatch[1]
    const department = firstMatch(roleBlock, [
      /<h5[^>]*>\s*([^<]+?)\s*(?:<span|<\/h5>)/i,
    ])

    const cardPattern = /<a[^>]+href="([^"]*\/jobs\/[^"/?#]+\/[^"/?#]+)"([^>]*)>([\s\S]*?)<\/a>/gi
    for (const cardMatch of roleBlock.matchAll(cardPattern)) {
      const detailUrl = toAbsoluteUrl(cardMatch[1])
      if (!detailUrl) continue

      const attrs = cardMatch[2]
      const body = cardMatch[3]
      const { opaqueId, slug } = extractDetailPathParts(detailUrl)
      const remoteFlag = firstMatch(attrs, [
        /data-portal-remote-location="([^"]+)"/i,
        /data-portal-remote-location=([^\s>]+)/i,
      ])
      const summary = firstMatch(body, [
        /<div[^>]*class="[^"]*\bjob-desc\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      ])
      const title = firstMatch(body, [
        /<div[^>]*class="[^"]*\bjob-title\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      ]) || firstMatch(body, [
        />([^<]+)<\/a>$/i,
      ])
      const locationInfoMatch = body.match(
        /<div[^>]*class="[^"]*\blocation-info\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      )
      const { locationText, employmentType } = extractLocationParts(locationInfoMatch?.[1] || '')

      jobs.push({
        title,
        summary,
        department,
        detailUrl,
        jobId: opaqueId,
        requisitionId: opaqueId,
        slug,
        locationText,
        employmentType,
        remoteFlag,
      })
    }
  }

  return jobs
}

const extractDescriptionHtml = (source) => {
  const html = String(source ?? '')

  const betweenMarkers = html.match(
    /<a[^>]*>\s*Apply Now\s*<\/a>([\s\S]*?)(?:<h[1-6][^>]*>\s*Submit Your Application|Submit Your Application)/i,
  )
  if (betweenMarkers?.[1]) return betweenMarkers[1]

  return firstMatch(html, [
    /"description"\s*:\s*"((?:\\.|[^"])*)"/i,
  ]) || html
}

export const extractJobDetail = (html, listing = {}) => {
  const source = String(html ?? '')
  const detailUrl = listing.detailUrl || listing.sourceUrl || buildDetailUrl(listing.jobId, listing.slug)
  const { opaqueId, slug } = extractDetailPathParts(detailUrl)
  const title = firstMatch(source, [
    /<h1[^>]*>([\s\S]*?)<\/h1>/i,
  ]) || listing.title
  const department = listing.department || firstMatch(source, [
    /<i[^>]*icon-arrow-left[^>]*><\/i>\s*([^<]+)/i,
  ])
  const locationText = listing.locationText || firstMatch(source, [
    /<meta[^>]+property="og:title"[^>]+content="\s*Hiring for [^"]+ for ([^-"]+?)\s*-\s*/i,
  ])
  const descriptionHtml = extractDescriptionHtml(source)
  const jobDescription = normalizeWhitespace(descriptionHtml)

  return {
    title,
    company: COMPANY_NAME,
    department,
    location: normalizeLocation(locationText),
    city: extractCity(locationText),
    country: COUNTRY_FILTER,
    jobId: listing.jobId || opaqueId || slug,
    requisitionId: listing.requisitionId || opaqueId || slug,
    sourceUrl: detailUrl,
    applyUrl: detailUrl,
    employmentType: normalizeEmploymentType(listing.employmentType),
    experienceRequired: extractExperienceRequired(jobDescription),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription,
    remoteStatus: inferRemoteStatus(listing.remoteFlag, locationText, jobDescription),
  }
}

export const extractSearchResults = ({
  listingHtml = '',
  listingJobs = null,
  detailHtmlByUrl = {},
} = {}) => {
  const listings = Array.isArray(listingJobs) ? listingJobs : extractListingJobs(listingHtml)
  const hasDetails = Object.keys(detailHtmlByUrl).length > 0
  const selectedListings = hasDetails
    ? listings.filter((listing) => detailHtmlByUrl[listing.detailUrl] != null)
    : listings

  return selectedListings.map((listing) =>
    extractJobDetail(detailHtmlByUrl[listing.detailUrl] || '', listing))
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'payatu',
  timeoutMs: 15000,
})

export const createPayatuScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const now = options.now || (() => new Date().toISOString())
    const officialHtml = await fetchText(OFFICIAL_CAREERS_URL)

    if (!hasOfficialCareersSignal(officialHtml)) {
      throw new Error('Payatu official careers page no longer matches the verified official public surface')
    }

    const listingUrl = extractFreshteamJobsUrl(officialHtml)
    if (listingUrl !== LISTING_URL) {
      throw new Error('Verified official Payatu careers handoff no longer points to the known public Freshteam board')
    }

    const listingHtml = await fetchText(listingUrl)
    const listingJobs = extractListingJobs(listingHtml)
    const selectedListings = maxJobs ? listingJobs.slice(0, maxJobs) : listingJobs
    const detailHtmlByUrl = {}

    await Promise.all(selectedListings.map(async (listing) => {
      detailHtmlByUrl[listing.detailUrl] = await fetchText(listing.detailUrl)
    }))

    const jobs = extractSearchResults({
      listingJobs: selectedListings,
      detailHtmlByUrl,
    })

    return jobs.map((job) => ({
      ...job,
      source: 'payatu',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createPayatuScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Payatu scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'payatu')
    console.log('DB result:', result)
    process.exit(0)
  }
}
