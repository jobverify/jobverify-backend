import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_URL = 'https://careers.media.net/'

const CAREERS_HOST = new URL(CAREERS_URL).hostname
const COMPANY = 'Media.net'
const SOURCE = 'medianet'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&ndash;|&#8211;|&mdash;|&#8212;/gi, '-')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim() || null

const stripTags = (value) => normalizeWhitespace(String(value ?? '').replace(/<[^>]+>/g, ' '))

const toSameHostUrl = (value, baseUrl = CAREERS_URL) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    const url = new URL(normalized, baseUrl)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    return url.hostname === CAREERS_HOST ? url.toString() : null
  } catch {
    return null
  }
}

const getPathSegments = (value) => {
  try {
    return new URL(value).pathname.replace(/\/+$/, '').split('/').filter(Boolean)
  } catch {
    return []
  }
}

const toJobId = (value) => getPathSegments(value).at(-1) || null

const extractFirst = (pattern, value) => {
  const match = String(value ?? '').match(pattern)
  return match ? stripTags(match[1]) : null
}

const extractField = (label, html) => {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return extractFirst(new RegExp(`${escaped}\\s*:\\s*([^<]+)`, 'i'), html)
}

const extractAnchorMatches = (html) => [...String(html ?? '').matchAll(
  /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
)]

const isActiveDepartmentLink = (href, text) => {
  const url = toSameHostUrl(href)
  if (!url) return false

  const countMatch = stripTags(text)?.match(/(\d+)\s+Positions?\b/i)
  if (!countMatch || Number(countMatch[1]) <= 0) return false

  return getPathSegments(url).length === 1
}

const findActiveDepartmentUrls = (html) => {
  const urls = []
  const seen = new Set()

  for (const [, href, text] of extractAnchorMatches(html)) {
    if (!isActiveDepartmentLink(href, text)) continue
    const url = toSameHostUrl(href)
    if (!url || seen.has(url)) continue
    seen.add(url)
    urls.push(url)
  }

  return urls
}

const toDepartmentNameFromUrl = (departmentUrl) => {
  const [slug] = getPathSegments(departmentUrl)
  if (!slug) return null

  return slug
    .split('-')
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join(' ')
}

const normalizeLocation = (value) => normalizeWhitespace(value)

const toCity = (location) => {
  const normalized = normalizeLocation(location)
  if (!normalized) return null
  if (/remote/i.test(normalized)) return 'Remote'

  const [city] = normalized.split(/[\/,]/)
  return normalizeWhitespace(city)
}

const inferCountry = (location) => {
  const normalized = String(location ?? '').toLowerCase()
  if (!normalized) return null

  if (
    /india/.test(normalized)
    || /\b(mumbai|pune|bengaluru|bangalore)\b/.test(normalized)
  ) {
    return 'India'
  }

  if (
    /united states|usa/.test(normalized)
    || /\b(new york|los angeles)\b/.test(normalized)
  ) {
    return 'United States'
  }

  if (/dubai|united arab emirates|uae/.test(normalized)) return 'United Arab Emirates'
  if (/zurich|switzerland/.test(normalized)) return 'Switzerland'

  return null
}

const inferRemoteStatus = (location) => {
  const normalized = normalizeLocation(location)
  if (!normalized) return null
  return /remote|hybrid/i.test(normalized) ? 'Hybrid' : 'On-site'
}

const extractListItems = (html) => [...String(html ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const extractSectionHtml = (html, headingPattern) => {
  const match = String(html ?? '').match(
    new RegExp(
      `<h[1-6]\\b[^>]*>[\\s\\S]*?${headingPattern}[\\s\\S]*?<\\/h[1-6]>([\\s\\S]*?)(?=<h[1-6]\\b|<\\/main>|<\\/body>)`,
      'i',
    ),
  )

  return match?.[1] || null
}

const extractParagraphs = (html) => [...String(html ?? '').matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const extractDescriptionParts = (html) => {
  const sections = [
    extractSectionHtml(html, 'Job\\s+Summary'),
    extractSectionHtml(html, 'Overall\\s+Responsibility'),
    extractSectionHtml(html, 'About\\s+the\\s+role'),
    extractSectionHtml(html, 'Roles\\s+and\\s+Responsibilities'),
  ].filter(Boolean)

  const parts = sections.flatMap((sectionHtml) => [
    ...extractParagraphs(sectionHtml),
    ...extractListItems(sectionHtml),
  ])

  return [...new Set(parts)]
}

const buildJobDescription = (html) => {
  const parts = extractDescriptionParts(html)
  return parts.length > 0 ? parts.join('\n\n') : stripTags(html)
}

const extractRequiredSkills = (html) => {
  const qualificationsSection = extractSectionHtml(
    html,
    'Qualification\\s+and\\s+Experience|Basic\\s+Requirements?|Requirements?',
  )

  return extractListItems(qualificationsSection || html)
}

const extractExperienceRequired = (value) => {
  const match = String(value ?? '').match(
    /(\d+\+?\s+years?[^.]*experience|\d+\s+to\s+\d+\s+years?[^.]*experience)/i,
  )

  return match ? normalizeWhitespace(match[1]) : null
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return /media\.net/i.test(page)
    && /open positions/i.test(page)
    && findActiveDepartmentUrls(html).length > 0
}

export const extractDepartmentUrls = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('Expected verified Media.net careers surface with public opportunities')
  }

  return findActiveDepartmentUrls(html)
}

export const extractListings = (html, { departmentUrl } = {}) => {
  const resolvedDepartmentUrl = toSameHostUrl(departmentUrl) || CAREERS_URL
  const [departmentSlug] = getPathSegments(resolvedDepartmentUrl)
  const department = extractFirst(/Current Openings for\s*([^<]+)/i, html)
    || extractFirst(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i, html)
    || toDepartmentNameFromUrl(resolvedDepartmentUrl)

  const jobs = []
  const seen = new Set()

  for (const [, href, text] of extractAnchorMatches(html)) {
    const sourceUrl = toSameHostUrl(href, resolvedDepartmentUrl)
    if (!sourceUrl || seen.has(sourceUrl)) continue

    const pathSegments = getPathSegments(sourceUrl)
    if (pathSegments.length !== 2) continue
    if (departmentSlug && pathSegments[0] !== departmentSlug) continue

    const title = stripTags(text)
    const jobId = toJobId(sourceUrl)
    if (!title || !jobId) continue

    seen.add(sourceUrl)
    jobs.push({
      title,
      company: COMPANY,
      department,
      location: null,
      city: null,
      country: null,
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
      remoteStatus: null,
    })
  }

  return jobs
}

export const extractJobDetail = (html, listing = {}) => {
  const title = extractFirst(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i, html) || listing.title || null
  const location = normalizeLocation(extractField('Location', html) || listing.location)
  const requiredSkills = extractRequiredSkills(html)
  const jobDescription = buildJobDescription(html)
  const textForExperience = [jobDescription, ...requiredSkills].filter(Boolean).join(' ')

  return {
    ...listing,
    title,
    company: listing.company || COMPANY,
    department: listing.department || toDepartmentNameFromUrl(listing.sourceUrl) || null,
    location,
    city: toCity(location) || listing.city || null,
    country: inferCountry(location) || listing.country || null,
    applyUrl: listing.sourceUrl || listing.applyUrl || null,
    employmentType: extractField('Employment Type', html) || listing.employmentType || null,
    experienceRequired: extractExperienceRequired(textForExperience) || listing.experienceRequired || null,
    minimumQualification: requiredSkills[0] || listing.minimumQualification || null,
    preferredQualification: requiredSkills[1] || listing.preferredQualification || null,
    requiredSkills,
    jobDescription: jobDescription || listing.jobDescription || null,
    remoteStatus: inferRemoteStatus(location || listing.location),
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

export const createMediaNetScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const rootHtml = await fetchText(CAREERS_URL)
    const jobs = []
    const seenUrls = new Set()

    for (const departmentUrl of extractDepartmentUrls(rootHtml)) {
      const departmentHtml = await fetchText(departmentUrl)

      for (const listing of extractListings(departmentHtml, { departmentUrl })) {
        if (seenUrls.has(listing.sourceUrl)) continue
        seenUrls.add(listing.sourceUrl)

        const detailHtml = await fetchText(listing.sourceUrl)
        jobs.push(extractJobDetail(detailHtml, listing))
      }
    }

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: (overrideNow || now)(),
    }))
  },
})

export const run = async (options = {}) => createMediaNetScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  console.log(`Total Media.net jobs scraped: ${jobs.length}`)
  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
