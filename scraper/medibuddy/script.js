import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

import { MEDIBUDDY_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = MEDIBUDDY_CATALOG
export const SOURCE = MEDIBUDDY_CATALOG.source
export const COMPANY_NAME = MEDIBUDDY_CATALOG.companyName
export const COUNTRY_FILTER = MEDIBUDDY_CATALOG.countryFilter
export const FIRST_PARTY_JOB_PAGES = MEDIBUDDY_CATALOG.firstPartyJobPages
export const TRAKSTAR_JOBS_HOST = MEDIBUDDY_CATALOG.trakstarJobsHost
export const MEDIREVIVA_APPLY_URL = MEDIBUDDY_CATALOG.medirevivaApplyUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#8211;|&#8212;|&ndash;|&mdash;/gi, '-')
  .replace(/&#39;|&apos;|&#x27;|&#8217;|&rsquo;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&nbsp;|&#160;/gi, ' ')

const decodeUnicodeEscapes = (value) => String(value ?? '')
  .replace(/\\u([0-9a-f]{4})/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/\\x([0-9a-f]{2})/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))

const normalizeWhitespace = (value) => {
  const normalized = decodeUnicodeEscapes(decodeHtmlEntities(value))
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|section)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u000b/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(value)

const defaultFetchText = (url, options = {}) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    ...(options.headers || {}),
  },
  label: SOURCE,
  timeoutMs: 15000,
  ...options,
})

const titleCase = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/\b\w/g, (character) => character.toUpperCase()) || null

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase() || ''
  if (!normalized) return null
  if (normalized.includes('full')) return 'Full-time'
  if (normalized.includes('part')) return 'Part-time'
  if (normalized.includes('contract')) return 'Contract'
  if (normalized.includes('intern')) return 'Internship'
  return normalizeWhitespace(value)
}

const inferRemoteStatus = (...values) => {
  const normalized = values
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (!normalized) return 'On-site'
  if (/no\s+remote(?:\/hybrid|\s+or\s+hybrid)?/.test(normalized)) return 'On-site'
  if (normalized.includes('hybrid')) return 'Hybrid'
  if (normalized.includes('remote')) return 'Remote'
  if (normalized.includes('onsite') || normalized.includes('on-site') || normalized.includes('office based')) {
    return 'On-site'
  }
  return 'On-site'
}

const extractExperienceRequired = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase() || ''
  if (!normalized) return null

  let match = normalized.match(/\b(\d+)\s*-\s*(\d+)\s*years?\b/i)
  if (match) return `${match[2]} years`

  match = normalized.match(/\b(\d+)\+\s*years?\b/i)
  if (match) return `${match[1]}+ years`

  match = normalized.match(/\bat least\s+(\d+)\s*years?\b/i)
  if (match) return `${match[1]} years`

  match = normalized.match(/\b(\d+)\s*years?\b/i)
  if (match) return `${match[1]} years`

  return null
}

const extractCity = (value) => normalizeWhitespace(value)
  ?.split(/,|\/|\|/)[0]
  ?.trim() || null

const normalizeDocsLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (/\b(india|bengaluru|bangalore|hyderabad|mumbai|delhi|chennai|pune|indore)\b/i.test(normalized)) {
    return normalized
  }
  return null
}

const toAbsoluteUrl = (value, baseUrl) => {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const extractTrackedTrakstarUrl = (value) => {
  const jobId = String(value ?? '').match(/medibuddy\.hire\.trakstar\.com\/jobs\/([a-z0-9]+)/i)?.[1]
  return jobId ? `${TRAKSTAR_JOBS_HOST}/jobs/${jobId}/` : null
}

const extractGoogleDocUrl = (value, baseUrl) => {
  const absoluteUrl = toAbsoluteUrl(value, baseUrl)
  if (!absoluteUrl) return null

  try {
    const parsed = new URL(absoluteUrl)
    if (parsed.hostname !== 'docs.google.com') return null
    if (!/^\/document\/d\/[^/]+\/edit/i.test(parsed.pathname)) return null
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return null
  }
}

const getJobsSectionHtml = (html, pageUrl) => {
  const page = String(html ?? '')
  const sectionMarker = pageUrl.includes('medireviva') ? 'id="available-positions"' : 'id="job-openings"'
  const start = page.indexOf(sectionMarker)
  if (start < 0) return page

  let section = page.slice(start)
  for (const marker of ['Testimonials', 'FAQ']) {
    const markerIndex = section.indexOf(marker)
    if (markerIndex > 0) {
      section = section.slice(0, markerIndex)
    }
  }

  return section
}

const extractAnchorPairs = (chunk, baseUrl) =>
  [...String(chunk ?? '').matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => ({
      href: match[1],
      text: stripTags(match[2]),
      absoluteUrl: toAbsoluteUrl(match[1], baseUrl),
      trakstarUrl: extractTrackedTrakstarUrl(match[1]),
      docsUrl: extractGoogleDocUrl(match[1], baseUrl),
    }))

const dedupeListings = (listings) => {
  const deduped = []
  const seen = new Set()

  for (const listing of listings) {
    const key = listing.sourceUrl || `${listing.sourcePageUrl}|${listing.title}`
    if (!key || seen.has(key)) continue
    seen.add(key)
    deduped.push(listing)
  }

  return deduped
}

const getListingWindow = (sectionHtml, startIndex) => {
  const remaining = sectionHtml.slice(startIndex)
  const nextTitleIndex = remaining.slice(1).search(/<h2[^>]*>/i)
  if (nextTitleIndex < 0) return remaining.slice(0, 2500)
  return remaining.slice(0, Math.min(nextTitleIndex + 1, 2500))
}

const getJobIdFromUrl = (value, title) => {
  try {
    const url = new URL(value)
    if (url.hostname === 'docs.google.com') {
      return url.pathname.match(/\/document\/d\/([^/]+)/i)?.[1] || null
    }
    const match = url.pathname.match(/\/jobs\/([^/]+)\/?$/i)
    if (match) return match[1]
  } catch {
    return null
  }

  return normalizeWhitespace(title)
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || null
}

export const hasOfficialJobsPageSignal = (html) => {
  const normalized = normalizeWhitespace(html) || ''

  return /Available Positions/i.test(normalized)
    && (
      /#BaatBadiHaiYeMediBuddyHai/i.test(normalized)
      || /MediReViva/i.test(normalized)
    )
}

export const extractListingCards = (html, sourcePageUrl) => {
  const listings = []
  const sectionHtml = getJobsSectionHtml(html, sourcePageUrl)

  for (const match of sectionHtml.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)) {
    const title = stripTags(match[1])
    if (!title || /^Available Positions$/i.test(title)) continue

    const chunk = getListingWindow(sectionHtml, match.index)
    const anchors = extractAnchorPairs(chunk, sourcePageUrl)
    const trakstarUrl = anchors.map((anchor) => anchor.trakstarUrl).find(Boolean)
    const docsUrl = anchors
      .filter((anchor) => /view job description/i.test(anchor.text || ''))
      .map((anchor) => anchor.docsUrl)
      .find(Boolean)
    const applyUrl = anchors
      .filter((anchor) => /apply/i.test(anchor.text || ''))
      .map((anchor) => anchor.absoluteUrl)
      .find(Boolean)

    if (trakstarUrl) {
      const jobId = getJobIdFromUrl(trakstarUrl, title)
      listings.push({
        title,
        sourceUrl: trakstarUrl,
        applyUrl: trakstarUrl,
        link: trakstarUrl,
        sourcePageUrl,
        detailKind: 'trakstar',
        employmentType: null,
        jobId,
        requisitionId: jobId,
      })
      continue
    }

    if (docsUrl) {
      const jobId = getJobIdFromUrl(docsUrl, title)
      listings.push({
        title,
        sourceUrl: docsUrl,
        applyUrl: applyUrl || MEDIREVIVA_APPLY_URL,
        link: docsUrl,
        sourcePageUrl,
        detailKind: 'public-doc',
        employmentType: 'Internship',
        jobId,
        requisitionId: jobId,
      })
    }
  }

  return dedupeListings(listings)
}

const extractDescriptionBlock = (html, endPattern) => {
  const page = String(html ?? '')
  const match = page.match(
    new RegExp(
      `<p[^>]*>\\s*[^<]*\\|\\s*[^<]*\\|\\s*[^<]*<\\/p>([\\s\\S]*?)${endPattern}`,
      'i',
    ),
  )

  return normalizeWhitespace(match?.[1])
}

export const extractTrakstarDetail = (html, listing = {}) => {
  const title = stripTags(String(html ?? '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]) || listing.title
  const summaryLine = stripTags(String(html ?? '').match(/<p[^>]*>\s*([^<]*\|\s*[^<]*\|\s*[^<]*)\s*<\/p>/i)?.[1])
  const [location, department, employmentType] = String(summaryLine ?? '')
    .split('|')
    .map((part) => normalizeWhitespace(part))
  const jobDescription = extractDescriptionBlock(html, '<h2[^>]*>\\s*Application Form\\s*<\\/h2>')

  return {
    title,
    department: department || null,
    location: location || null,
    city: extractCity(location),
    employmentType: normalizeEmploymentType(employmentType),
    experienceRequired: extractExperienceRequired(jobDescription),
    jobDescription,
    remoteStatus: inferRemoteStatus(location, jobDescription),
  }
}

const extractDocTitle = (html, listing = {}) => {
  const page = String(html ?? '')
  const rawTitle = stripTags(
    page.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1]
      || page.match(/<title>([\s\S]*?)<\/title>/i)?.[1],
  ) || listing.title

  return rawTitle
    ?.replace(/^MediBuddy\s*-\s*JD\s*/i, '')
    .replace(/\s*-\s*Google Docs$/i, '')
    .trim() || listing.title
}

const extractDocText = (html) => {
  const page = String(html ?? '')
  const scriptText = [...page.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => decodeUnicodeEscapes(match[1]))
    .join(' ')

  return normalizeWhitespace(scriptText)
}

export const extractGoogleDocDetail = (html, listing = {}) => {
  const decodedText = extractDocText(html) || ''
  const title = extractDocTitle(html, listing)
  const locationLine = decodedText.match(/Location:\s*([^"]+?)(?:\s+Role Overview|\s+About MediBuddy|\s+Work Mode|$)/i)?.[1]
  const overview = decodedText.match(/Role Overview\s*(.*?)(?=\s+Work Mode|$)/i)?.[1]
  const workMode = decodedText.match(/Work Mode\s*(.*?)(?=$)/i)?.[1]
  const jobDescription = normalizeWhitespace(
    [overview ? `Role Overview ${overview}` : null, workMode ? `Work Mode ${workMode}` : null]
      .filter(Boolean)
      .join(' '),
  )?.replace(/[";]+$/g, '').trim() || null

  return {
    title,
    location: normalizeDocsLocation(locationLine),
    city: extractCity(normalizeDocsLocation(locationLine)),
    employmentType: normalizeEmploymentType(listing.employmentType || decodedText.match(/\bintern\w*/i)?.[0]),
    experienceRequired: extractExperienceRequired(jobDescription),
    jobDescription,
    remoteStatus: inferRemoteStatus(locationLine, jobDescription, 'office based'),
  }
}

export const createMediBuddyScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const listings = []

    for (const pageUrl of FIRST_PARTY_JOB_PAGES) {
      const pageHtml = await fetchText(pageUrl)
      if (!hasOfficialJobsPageSignal(pageHtml)) {
        throw new Error(`The verified MediBuddy first-party jobs page no longer matches the trusted surface: ${pageUrl}`)
      }

      listings.push(...extractListingCards(pageHtml, pageUrl))
    }

    const selectedListings = Number.isInteger(maxJobs)
      ? dedupeListings(listings).slice(0, maxJobs)
      : dedupeListings(listings)

    const jobs = []

    for (const listing of selectedListings) {
      const detailHtml = await fetchText(listing.sourceUrl)
      const detail = listing.detailKind === 'trakstar'
        ? extractTrakstarDetail(detailHtml, listing)
        : extractGoogleDocDetail(detailHtml, listing)

      jobs.push({
        title: detail.title || listing.title,
        company: COMPANY_NAME,
        department: detail.department || null,
        location: detail.location || null,
        city: detail.city || null,
        country: COUNTRY_FILTER,
        source: SOURCE,
        jobId: listing.jobId,
        requisitionId: listing.requisitionId,
        sourceUrl: listing.sourceUrl,
        applyUrl: listing.applyUrl,
        link: listing.link || listing.sourceUrl,
        employmentType: detail.employmentType || normalizeEmploymentType(listing.employmentType),
        experienceRequired: detail.experienceRequired,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: detail.jobDescription,
        remoteStatus: detail.remoteStatus || 'On-site',
        scrapedAt: now(),
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createMediBuddyScraper().run(options)

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
