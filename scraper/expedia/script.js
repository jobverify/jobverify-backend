import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'

import { EXPEDIA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = EXPEDIA_CATALOG.source
export const COMPANY = EXPEDIA_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = EXPEDIA_CATALOG.officialBrandName
export const VERIFIED_ON = EXPEDIA_CATALOG.verifiedOn
export const HOMEPAGE_URL = EXPEDIA_CATALOG.homepageUrl
export const CAREERS_URL = EXPEDIA_CATALOG.companyCareerPage
export const JOBS_URL = EXPEDIA_CATALOG.jobsPageUrl
export const WORKDAY_HOST = 'expedia.wd108.myworkdayjobs.com'
export const PROVIDER_METADATA = EXPEDIA_CATALOG

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
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const toAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  if (!value) return null

  try {
    return new URL(decodeHtmlEntities(value), baseUrl).toString()
  } catch {
    return null
  }
}

const normalizeComparableUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return String(value ?? '').replace(/\/$/, '')
  }
}

const sameUrl = (left, right) => normalizeComparableUrl(left) === normalizeComparableUrl(right)

const isTrustedCareerUrl = (value) => {
  try {
    return new URL(String(value ?? '')).hostname === 'careers.expediagroup.com'
  } catch {
    return false
  }
}

const isTrustedWorkdayApplyUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    return url.hostname === WORKDAY_HOST && /\/apply\??$/i.test(url.pathname + url.search)
  } catch {
    return false
  }
}

const extractTitle = (html = '') =>
  normalizeWhitespace(String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1])

const extractJobsPagePath = (html = '') =>
  String(html ?? '').match(/(?:href|action)=["'](https:\/\/careers\.expediagroup\.com\/jobs\/?|\/*jobs\/?)["']/i)?.[1]
    ?? null

const extractRequisitionId = (value) =>
  normalizeWhitespace(
    String(value ?? '')
      .match(/\b(R-\d+(?:-\d+)?)\b/i)?.[1],
  )

const parseLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) {
    return {
      location: null,
      city: null,
      country: null,
    }
  }

  const parts = normalized.split(/\s*-\s*/).map((part) => normalizeWhitespace(part)).filter(Boolean)
  const country = parts[0] || null
  const cityToken = parts.at(-1) || null
  const city = cityToken ? (normalizeCity(cityToken) || cityToken) : null

  return {
    location: normalized,
    city,
    country,
  }
}

const isIndiaLocation = (value) => /^india$/i.test(parseLocation(value).country || '')

const extractInfoItems = (html = '') => [...String(html ?? '').matchAll(
  /<li class="Info__list__item">[\s\S]*?<p>([\s\S]*?)<\/p>\s*<\/li>/gi,
)].map((match) => normalizeWhitespace(match[1])).filter(Boolean)

const extractJobPostingJsonLd = (html = '') => {
  for (const match of String(html ?? '').matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const payload = JSON.parse(match[1])
      if (payload?.['@type'] === 'JobPosting') return payload
    } catch {
      continue
    }
  }

  return null
}

const extractSectionBulletItems = (descriptionHtml = '', sectionTitle) => {
  const safeTitle = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = String(descriptionHtml ?? '').match(
    new RegExp(`<p><b>${safeTitle}:<\\/b><\\/p>\\s*<ul>([\\s\\S]*?)<\\/ul>`, 'i'),
  )
  if (!match) return []

  return [...match[1].matchAll(/<li>\s*(?:<p>)?([\s\S]*?)(?:<\/p>)?\s*<\/li>/gi)]
    .map((item) => normalizeWhitespace(item[1]))
    .filter(Boolean)
}

const extractAllJobCards = (html = '') => [...String(html ?? '').matchAll(
  /<li class="Results__list__item">[\s\S]*?<a href="([^"]+)" class="view-job-button">[\s\S]*?<h3 class="Results__list__title[^"]*">([\s\S]*?)<\/h3>[\s\S]*?<h4 class="Results__list__location[^"]*">([\s\S]*?)<\/h4>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<\/li>/gi,
)].map((match) => {
  const sourceUrl = toAbsoluteUrl(match[1], JOBS_URL)
  const title = normalizeWhitespace(match[2])
  const department = normalizeWhitespace(match[4])
  const locationData = parseLocation(match[3])
  const requisitionId = extractRequisitionId(sourceUrl)

  if (
    !sourceUrl
    || !title
    || !department
    || !locationData.location
    || !locationData.city
    || !locationData.country
    || !requisitionId
    || !isTrustedCareerUrl(sourceUrl)
  ) {
    return null
  }

  return {
    title,
    company: COMPANY,
    department,
    location: locationData.location,
    city: locationData.city,
    country: locationData.country,
    jobId: requisitionId,
    requisitionId,
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
    remoteStatus: null,
  }
}).filter(Boolean)

export const hasOfficialCareersPageSignal = (html = '') => {
  const title = extractTitle(html)
  const page = String(html ?? '')

  return title === 'Home - Expedia Group | Careers'
    && /Search by keyword\/title/i.test(page)
    && /<option value="India"\s*>India<\/option>/i.test(page)
    && /Search Jobs/i.test(page)
    && /careers in Gurgaon, India/i.test(page)
    && sameUrl(toAbsoluteUrl(extractJobsPagePath(page), HOMEPAGE_URL), JOBS_URL)
}

export const extractJobsPageUrl = (html = '') =>
  toAbsoluteUrl(extractJobsPagePath(html), HOMEPAGE_URL)

export const hasOfficialJobsPageSignal = (html = '') => {
  const title = extractTitle(html)
  const page = String(html ?? '')

  return title === 'Jobs | Expedia Group | Careers'
    && /Results__list/i.test(page)
    && /view-job-button/i.test(page)
    && /Results__list__location/i.test(page)
  }

export const extractNextPageUrl = (html = '') => {
  const match = String(html ?? '').match(/<link rel=['"]next['"] href="([^"]+)">/i)
  return match ? toAbsoluteUrl(match[1], JOBS_URL) : null
}

export const extractJobCards = (html = '') =>
  extractAllJobCards(html).filter((job) => isIndiaLocation(job.location))

export const hasOfficialJobDetailSignal = (html = '', expectedUrl = null) => {
  const title = extractTitle(html)
  const canonical = toAbsoluteUrl(
    String(html ?? '').match(/<link rel="canonical" href="([^"]+)"/i)?.[1],
    CAREERS_URL,
  )
  const applyUrl = toAbsoluteUrl(
    String(html ?? '').match(/href="(https:\/\/expedia\.wd108\.myworkdayjobs\.com[^"]+\/apply\?)"[^>]*page_apply_link/i)?.[1],
    CAREERS_URL,
  )
  const infoItems = extractInfoItems(html)
  const posting = extractJobPostingJsonLd(html)

  return /^.+ \| Expedia Group \| Careers$/i.test(title || '')
    && (!expectedUrl || sameUrl(canonical, expectedUrl))
    && isTrustedWorkdayApplyUrl(applyUrl)
    && infoItems.length >= 5
    && /^India\b/i.test(infoItems[0] || '')
    && !!posting?.datePosted
    && !!posting?.identifier
}

export const extractJobDetail = (html = '', listing = {}) => {
  const posting = extractJobPostingJsonLd(html)
  const infoItems = extractInfoItems(html)
  const locationData = parseLocation(infoItems[0])
  const applyUrl = toAbsoluteUrl(
    String(html ?? '').match(/href="(https:\/\/expedia\.wd108\.myworkdayjobs\.com[^"]+\/apply\?)"[^>]*page_apply_link/i)?.[1],
    CAREERS_URL,
  )
  const descriptionHtml = posting?.description || ''
  const minimumItems = extractSectionBulletItems(descriptionHtml, 'Minimum Qualifications')
  const preferredItems = extractSectionBulletItems(descriptionHtml, 'Preferred Qualifications')
  const requisitionId = extractRequisitionId(posting?.identifier || infoItems[4] || listing.requisitionId)
  const title = normalizeWhitespace(
    String(html ?? '').match(/<h1 class="Desc__title[^"]*">([\s\S]*?)<\/h1>/i)?.[1],
  ) || normalizeWhitespace(posting?.title) || listing.title || null

  return {
    ...listing,
    title,
    company: COMPANY,
    department: normalizeWhitespace(infoItems[1]) || listing.department || null,
    location: locationData.location || listing.location || null,
    city: locationData.city || listing.city || null,
    country: locationData.country || listing.country || null,
    jobId: requisitionId || listing.jobId || null,
    requisitionId: requisitionId || listing.requisitionId || null,
    sourceUrl: listing.sourceUrl || null,
    applyUrl,
    employmentType: normalizeWhitespace(infoItems[2]) || null,
    experienceRequired: null,
    minimumQualification: minimumItems[0] || null,
    preferredQualification: preferredItems[0] || null,
    requiredSkills: [...minimumItems, ...preferredItems],
    postingDate: normalizeWhitespace(posting?.datePosted) || null,
    closingDate: null,
    jobDescription: normalizeWhitespace(descriptionHtml),
    remoteStatus: null,
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createExpediaScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  maxPages = 10,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const careersHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Expedia verified official careers surface no longer matches the first-party contract')
    }

    const jobsPageUrl = extractJobsPageUrl(careersHtml)
    if (!sameUrl(jobsPageUrl, JOBS_URL)) {
      throw new Error('Expedia verified official careers surface no longer links to the expected jobs page')
    }

    let nextPageUrl = JOBS_URL
    let visitedPages = 0
    const seenPageUrls = new Set()
    const allListings = []

    while (
      nextPageUrl
      && !seenPageUrls.has(normalizeComparableUrl(nextPageUrl))
      && visitedPages < maxPages
    ) {
      const jobsHtml = await fetchText(nextPageUrl)
      if (!hasOfficialJobsPageSignal(jobsHtml)) {
        throw new Error('Expedia verified first-party jobs surface no longer matches the public contract')
      }

      const pageListings = extractAllJobCards(jobsHtml)
      if (pageListings.length === 0) {
        throw new Error('Expedia verified first-party jobs surface no longer exposes the expected job cards')
      }

      allListings.push(...pageListings)
      seenPageUrls.add(normalizeComparableUrl(nextPageUrl))
      nextPageUrl = extractNextPageUrl(jobsHtml)
      visitedPages += 1
    }

    const indiaListings = allListings.filter((listing) => isIndiaLocation(listing.location))
    const jobs = []

    for (const listing of indiaListings) {
      const detailHtml = await fetchText(listing.sourceUrl)
      if (!hasOfficialJobDetailSignal(detailHtml, listing.sourceUrl)) {
        throw new Error('Expedia verified first-party detail surface no longer matches the public contract')
      }

      const job = extractJobDetail(detailHtml, listing)
      jobs.push({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: now(),
      })
    }

    return maxJobs ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async (options = {}) => createExpediaScraper(options).run(options)

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
