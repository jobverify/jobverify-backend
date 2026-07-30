import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'clari5'
export const COMPANY = 'Clari5'
export const HOMEPAGE_URL = 'https://www.clari5.com/'
export const CAREERS_URL = 'https://www.clari5.com/careers/'

const SITE_ORIGIN = 'https://www.clari5.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const INDIA_LOCATION_PATTERN =
  /\b(?:india|bangalore|bengaluru|mumbai|delhi|new delhi|gurgaon|gurugram|pune|hyderabad|chennai|noida|kolkata|calcutta|ahmedabad|kochi|cochin|coimbatore|thiruvananthapuram|trivandrum)\b/i

const decodeHtml = (value) => {
  let decoded = String(value ?? '')

  for (let index = 0; index < 3; index += 1) {
    const next = decoded
      .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
      .replace(/&nbsp;|&#160;/gi, ' ')
      .replace(/&#038;|&amp;/gi, '&')
      .replace(/&#8211;|&ndash;|\u2013/gi, '-')
      .replace(/&#8212;|&mdash;|\u2014/gi, '-')
      .replace(/&#8216;|&#8217;|&apos;|&rsquo;|&lsquo;|&#x27;/gi, "'")
      .replace(/&#8220;|&#8221;|&quot;|&ldquo;|&rdquo;/gi, '"')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')

    if (next === decoded) break
    decoded = next
  }

  return decoded
}

const normalizeWhitespace = (value) => {
  const normalized = decodeHtml(String(value ?? ''))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  decodeHtml(String(value ?? ''))
    .replace(/\r/g, '')
    .replace(/<(?:br|\/p|\/div|\/li|\/ul|\/ol|\/section|\/article|\/main|\/h[1-6]|\/a|\/span)\b[^>]*>/gi, '\n')
    .replace(/<(?:p|div|li|ul|ol|section|article|main|h[1-6]|a|span)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const toPlainText = (value) => {
  const normalized = decodeHtml(String(value ?? ''))
    .replace(/\r/g, '')
    .replace(/<(?:br|\/p|\/div|\/li|\/ul|\/ol|\/section|\/article|\/main|\/h[1-6]|\/tr|\/table)\b[^>]*>/gi, '\n')
    .replace(/<(?:p|div|li|ul|ol|section|article|main|h[1-6]|tr|table)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim()

  return normalized || null
}

const escapeRegex = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const extractText = (pattern, html) => stripTags(pattern.exec(String(html ?? ''))?.[1] ?? null)

const toAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, baseUrl).toString()
  } catch {
    return null
  }
}

const isOfficialDetailUrl = (value) => {
  try {
    const url = new URL(value)
    return url.origin === SITE_ORIGIN && /^\/careers\/(?!page\/)[a-z0-9-]+\/$/i.test(url.pathname)
  } catch {
    return false
  }
}

const isIndiaLocation = (value) => INDIA_LOCATION_PATTERN.test(normalizeWhitespace(value) || '')

const deriveState = (location) => {
  const normalized = normalizeWhitespace(location)?.toLowerCase()
  if (!normalized) return null
  if (normalized.includes('bangalore') || normalized.includes('bengaluru')) return 'Karnataka'
  if (normalized.includes('mumbai') || normalized.includes('pune')) return 'Maharashtra'
  if (normalized.includes('delhi')) return 'Delhi'
  if (normalized.includes('gurgaon') || normalized.includes('gurugram')) return 'Haryana'
  if (normalized.includes('hyderabad')) return 'Telangana'
  if (normalized.includes('chennai') || normalized.includes('coimbatore')) return 'Tamil Nadu'
  if (normalized.includes('noida')) return 'Uttar Pradesh'
  if (normalized.includes('kochi') || normalized.includes('cochin') || normalized.includes('thiruvananthapuram') || normalized.includes('trivandrum')) {
    return 'Kerala'
  }
  if (normalized.includes('ahmedabad')) return 'Gujarat'
  if (normalized.includes('kolkata') || normalized.includes('calcutta')) return 'West Bengal'
  return null
}

const deriveCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null

  const withoutCountry = normalized.replace(/,\s*India$/i, '')
  if (/[\/]|,/.test(withoutCountry)) return null

  return withoutCountry || null
}

const extractDescriptionHtml = (html) =>
  String(html ?? '').match(
    /<div class="job-description">\s*([\s\S]*?)\s*<\/div>\s*(?:<div class="clearfix"><\/div>\s*)?(?:<!-- Start Job Features|<div class="job-features">)/i,
  )?.[1] ?? null

const extractListItems = (html) =>
  [...String(html ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)

const extractCategory = (html) =>
  extractText(
    /<h4>\s*<i[^>]*><\/i>\s*Job Category<\/h4>\s*<p>([\s\S]*?)<\/p>/i,
    html,
  )

const descriptionLines = (descriptionHtml) =>
  (toPlainText(descriptionHtml) || '')
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)

const extractValueAfterLabel = (descriptionHtml, label) => {
  const lines = descriptionLines(descriptionHtml)
  const normalizedLabel = normalizeWhitespace(label)?.replace(/:$/, '').toLowerCase()
  if (!normalizedLabel) return null

  const index = lines.findIndex((line) => line.replace(/:$/, '').toLowerCase() === normalizedLabel)
  if (index === -1) return null

  return lines[index + 1] || null
}

const extractExperienceRequired = (descriptionHtml) => {
  const labeledExperience = extractValueAfterLabel(descriptionHtml, 'Experience')
  if (labeledExperience) return labeledExperience

  const lines = descriptionLines(descriptionHtml)
  return lines.find((line) =>
    /\b(?:\d+\s*(?:-\s*\d+)?\+?\s*years?\b|relevant experience of \d+\s*(?:-\s*\d+)?\s*years?\b)/i.test(line),
  ) || null
}

const extractMinimumQualification = (descriptionHtml) => {
  const lines = descriptionLines(descriptionHtml)
  const matchingLine = lines.find((line) => /^minimum qualification:/i.test(line))
  return normalizeWhitespace(matchingLine?.replace(/^minimum qualification:\s*/i, '') || null)
}

const extractPreferredQualification = (descriptionHtml) => {
  const lines = descriptionLines(descriptionHtml)
  return lines.find((line) => /preferred/i.test(line) && !/:$/.test(line)) || null
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)?.toLowerCase() || ''

  return /<link rel="canonical" href="https:\/\/www\.clari5\.com\/"/i.test(page)
    && /(?:og:site_name" content="Clari5"|"name":"Clari5"|<title>[\s\S]*Clari5<\/title>)/i.test(page)
    && /href="https:\/\/www\.clari5\.com\/careers\/"/i.test(page)
    && normalized.includes('fraud detection')
    && normalized.includes('aml')
}

export const hasOfficialCareersPageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''
  const hasJobsArchiveIdentity =
    /<title>\s*Jobs(?:\s*-\s*Page\s+\d+\s+of\s+\d+)?\s*-\s*Clari5\s*<\/title>/i.test(page)
    || /<title>\s*Contact Forms\s*-\s*Clari5\s*<\/title>/i.test(page)
    || /meta name="description" content="Jobs Archive - Clari5"/i.test(page)
  const hasListingsOrEmptyState =
    /class="sjb-search-location\b/i.test(page)
    || /<div class="v2 sjb-job-\d+">/i.test(page)
    || /<div class="no-job-listing">/i.test(page)

  return hasJobsArchiveIdentity
    && /<link rel="canonical" href="https:\/\/www\.clari5\.com\/careers\/(?:page\/\d+\/)?"/i.test(page)
    && /post-type-archive-jobpost/i.test(page)
    && /<div class="sjb-listing">/i.test(page)
    && /simple-job-board-public\.js/i.test(page)
    && hasListingsOrEmptyState
    && (normalized.includes('Apply Now') || normalized.includes('No jobs found'))
}

const archiveShowsNoJobs = (html = '') =>
  /<div class="no-job-listing">/i.test(String(html ?? ''))
  && /No jobs found/i.test(String(html ?? ''))

export const extractNextPageUrl = (html) => {
  const nextUrl = String(html ?? '').match(/<link rel="next" href="([^"]+)"/i)?.[1] ?? null
  const absoluteUrl = toAbsoluteUrl(nextUrl, CAREERS_URL)

  if (!absoluteUrl) return null

  try {
    const url = new URL(absoluteUrl)
    return url.origin === SITE_ORIGIN && /^\/careers\/page\/\d+\/$/i.test(url.pathname)
      ? absoluteUrl
      : null
  } catch {
    return null
  }
}

export const extractArchiveListings = (html) => {
  if (!hasOfficialCareersPageSignal(html)) {
    throw new Error('verified Clari5 careers archive no longer matches the trusted first-party public surface')
  }

  if (archiveShowsNoJobs(html)) {
    return []
  }

  const listings = []
  const seen = new Set()

  for (const match of String(html ?? '').matchAll(
    /<div class="v2 sjb-job-(\d+)">([\s\S]*?)<div class="job-description-list">\s*<div id="sjb_less_content_\1"><p>([\s\S]*?)<\/p><\/div>/gi,
  )) {
    const jobId = normalizeWhitespace(match[1])
    const blockHtml = match[2]
    const sourceUrl = toAbsoluteUrl(
      blockHtml.match(/<a href="([^"]+)">\s*<span class="job-title">/i)?.[1] ?? null,
      CAREERS_URL,
    )

    if (!jobId || !sourceUrl || !isOfficialDetailUrl(sourceUrl) || seen.has(sourceUrl)) {
      continue
    }

    const title = extractText(/<span class="job-title">([\s\S]*?)<\/span>/i, blockHtml)
    const employmentType = extractText(/<div class="job-type"><i[^>]*><\/i>([\s\S]*?)<\/div>/i, blockHtml)
    const location = extractText(/<div class="job-location"><i[^>]*><\/i>([\s\S]*?)<\/div>/i, blockHtml)
    const postedText = extractText(/<div class="job-date"><i[^>]*><\/i>([\s\S]*?)<\/div>/i, blockHtml)
    const category = extractCategory(blockHtml)
    const excerpt = stripTags(match[3])

    if (!title || !employmentType || !location || !excerpt) continue

    seen.add(sourceUrl)
    listings.push({
      jobId,
      title,
      sourceUrl,
      employmentType,
      location,
      postedText,
      category,
      excerpt,
    })
  }

  if (listings.length === 0) {
    throw new Error('verified Clari5 careers archive changed or no trusted public role cards remain')
  }

  return listings
}

export const hasOfficialJobDetailSignal = (html, sourceUrl) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''
  const canonicalPattern = new RegExp(
    `<link rel="canonical" href="${escapeRegex(sourceUrl)}"`,
    'i',
  )

  return canonicalPattern.test(page)
    && /<title>[\s\S]*\s-\sClari5<\/title>/i.test(page)
    && /single-jobpost|jobpost type-jobpost/i.test(page)
    && /<form class="jobpost-form sjb-job-detail-\d+" id="sjb-application-form"/i.test(page)
    && /<input type="hidden" name="action" value="process_applicant_form"/i.test(page)
    && normalized.includes('Apply For This Job')
}

export const extractJobDetail = (html, listing = {}) => {
  const sourceUrl = listing.sourceUrl || null
  if (!sourceUrl || !hasOfficialJobDetailSignal(html, sourceUrl)) {
    throw new Error('verified Clari5 job detail no longer matches the trusted first-party application surface')
  }

  const descriptionHtml = extractDescriptionHtml(html)
  const location = extractText(/<div class="job-location"><i[^>]*><\/i>([\s\S]*?)<\/div>/i, html) || listing.location || null
  const employmentType = extractText(/<div class="job-type"><i[^>]*><\/i>([\s\S]*?)<\/div>/i, html) || listing.employmentType || null
  const postedText = extractText(/<div class="job-date"><i[^>]*><\/i>([\s\S]*?)<\/div>/i, html) || listing.postedText || null
  const category = extractCategory(html) || listing.category || null
  const jobId = normalizeWhitespace(
    String(html ?? '').match(/<input type="hidden" name="job_id" value="(\d+)"/i)?.[1]
      || listing.jobId
      || null,
  )

  return {
    title: extractText(/<title>([\s\S]*?)\s*-\s*Clari5<\/title>/i, html) || listing.title || null,
    company: COMPANY,
    department: extractValueAfterLabel(descriptionHtml, 'Department') || category,
    location,
    city: deriveCity(location),
    state: deriveState(location),
    country: isIndiaLocation(location) ? 'India' : null,
    jobId,
    requisitionId: jobId,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType,
    experienceRequired: extractExperienceRequired(descriptionHtml),
    minimumQualification: extractMinimumQualification(descriptionHtml),
    preferredQualification: extractPreferredQualification(descriptionHtml),
    requiredSkills: extractListItems(descriptionHtml),
    postingDate: postedText,
    closingDate: null,
    jobDescription: toPlainText(descriptionHtml),
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

export const createClari5Scraper = () => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Clari5 verified homepage no longer matches the trusted first-party surface')
    }

    const archiveListings = []
    const seenPages = new Set()
    let nextPageUrl = CAREERS_URL

    while (nextPageUrl && !seenPages.has(nextPageUrl)) {
      seenPages.add(nextPageUrl)

      const archiveHtml = await fetchText(nextPageUrl)
      archiveListings.push(...extractArchiveListings(archiveHtml))
      nextPageUrl = extractNextPageUrl(archiveHtml)
    }

    const jobs = []
    const seenJobUrls = new Set()

    for (const listing of archiveListings) {
      if (!isIndiaLocation(listing.location) || seenJobUrls.has(listing.sourceUrl)) {
        continue
      }

      const detailHtml = await fetchText(listing.sourceUrl)
      const detail = extractJobDetail(detailHtml, listing)

      jobs.push({
        ...detail,
        source: SOURCE,
        link: detail.applyUrl || detail.sourceUrl,
        companyCareerPage: CAREERS_URL,
        companyDomain: 'clari5.com',
        atsPlatform: 'official-company-careers',
        scrapedAt: now(),
      })
      seenJobUrls.add(listing.sourceUrl)
    }

    return jobs
  },
})

export const run = async (options = {}) => createClari5Scraper().run(options)

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
