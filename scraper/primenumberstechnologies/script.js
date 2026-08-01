import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'primenumberstechnologies'
export const COMPANY = 'Primenumbers Technologies Private Limited'
export const CAREERS_URL = 'https://primenumbers.in/careers/'

const SITE_ORIGIN = 'https://primenumbers.in'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&middot;/gi, '|')
  .replace(/&#8211;|&ndash;/gi, '–')
  .replace(/&#8212;|&mdash;/gi, '—')
  .replace(/&#8216;|&#8217;|&apos;|&rsquo;|&lsquo;|&#x27;/gi, "'")
  .replace(/&#8220;|&#8221;|&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtml(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\u00c2?\u00b7/g, '|')
    .replace(/[\u2013\u2014]/g, '-')
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

const escapeRegex = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const toAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  const decodedValue = decodeHtml(value)
  if (!decodedValue) return null

  try {
    return new URL(decodedValue, baseUrl).toString()
  } catch {
    return null
  }
}

const extractText = (pattern, html) => stripTags(pattern.exec(String(html ?? ''))?.[1] ?? null)

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  if (/^full[\s_-]*time$/i.test(normalized) || /^FULL_TIME$/i.test(normalized)) {
    return 'Full Time'
  }

  if (/^part[\s_-]*time$/i.test(normalized) || /^PART_TIME$/i.test(normalized)) {
    return 'Part Time'
  }

  if (/^intern(?:ship)?$/i.test(normalized) || /^INTERN$/i.test(normalized)) {
    return 'Internship'
  }

  if (/^contract$/i.test(normalized)) {
    return 'Contract'
  }

  return normalized
}

const deriveCity = (location) => {
  const normalized = normalizeWhitespace(location)?.toLowerCase()
  if (!normalized) return null

  if (/\bbengaluru\b|\bbangalore\b/.test(normalized)) return 'Bengaluru'
  if (/\bhyderabad\b/.test(normalized)) return 'Hyderabad'
  if (/\bchennai\b/.test(normalized)) return 'Chennai'
  if (/\bmumbai\b/.test(normalized)) return 'Mumbai'
  if (/\bdelhi\b/.test(normalized)) return 'Delhi'

  return null
}

const normalizeCountry = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return 'India'
  if (normalized.toUpperCase() === 'IN') return 'India'
  return normalized
}

const normalizeDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

const extractJsonLdBlocks = (html) => {
  const blocks = []

  for (const match of String(html ?? '').matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      blocks.push(JSON.parse(match[1]))
    } catch {
      // Ignore malformed blocks so fail-closed checks rely on the valid JobPosting payload.
    }
  }

  return blocks
}

const extractJobPosting = (html) =>
  extractJsonLdBlocks(html).find((block) => {
    const type = Array.isArray(block?.['@type']) ? block['@type'] : [block?.['@type']]
    return type.some((value) => String(value).toLowerCase() === 'jobposting')
  }) || null

const extractSectionLists = (descriptionHtml) => {
  const sections = []

  for (const match of String(descriptionHtml ?? '').matchAll(
    /<h3\b[^>]*>\s*([^<]+?)\s*<\/h3>\s*<ul\b[^>]*>([\s\S]*?)<\/ul>/gi,
  )) {
    const label = stripTags(match[1])
    const items = [...match[2].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
      .map((item) => stripTags(item[1]))
      .filter(Boolean)

    if (label && items.length > 0) {
      sections.push({ label, items })
    }
  }

  return sections
}

const buildJobDescription = (descriptionHtml) => {
  const summary = stripTags(String(descriptionHtml ?? '').split(/<h3\b/i)[0])
  const sections = extractSectionLists(descriptionHtml)
  const sectionText = sections
    .map((section) => `${section.label}: ${section.items.join(' ')}`)
    .join(' ')

  return normalizeWhitespace([summary, sectionText].filter(Boolean).join(' '))
}

const extractRequiredSkills = (descriptionHtml) => {
  const sections = extractSectionLists(descriptionHtml)
  const preferredSection = sections.find((section) => /requirements|skills/i.test(section.label))
    || sections.find((section) => /responsibilities/i.test(section.label))

  if (preferredSection) {
    return preferredSection.items
  }

  return [...String(descriptionHtml ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)
}

const extractExperienceRequired = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const patterns = [
    /\bMinimum\s+\d+\+?\s*years?\s+of\s+experience[^.]*\.?/i,
    /\b\d+\s*[–-]\s*\d+\s*years?\s+of\s+experience[^.]*\.?/i,
    /\b\d+\+?\s*years?\s+of\s+experience[^.]*\.?/i,
    /\b\d+\s*[–-]\s*\d+\s*years?\s+experience\.?/i,
  ]

  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    if (match) return normalizeWhitespace(match[0])
  }

  return null
}

const extractApplyUrl = (html) => toAbsoluteUrl(
  String(html ?? '').match(/<a[^>]+href=["']([^"']*\/apply\.html[^"']*)["'][^>]*>/i)?.[1],
  SITE_ORIGIN,
)

const isOfficialDetailUrl = (value) => {
  try {
    const url = new URL(value)
    return url.origin === SITE_ORIGIN && /^\/careers\/[a-z0-9]+\/$/i.test(url.pathname)
  } catch {
    return false
  }
}

export const hasOfficialCareersIndexSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)
  const hasCurrentBrandSurface = /<title>\s*Open Roles[\s\S]*Careers at primenumbers\.in\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/primenumbers\.in\/careers\/["']/i.test(page)
    && /Open roles at primenumbers\.in\./i.test(normalized)
    && /All roles onsite in Indiranagar,\s*Bengaluru unless noted\./i.test(normalized)
    && /href=["']\/careers\/[a-z0-9]+\/["']/i.test(page)

  if (hasCurrentBrandSurface) return true

  return /<title>\s*Open Roles\s*(?:—|&#8212;|&mdash;|-)\s*Careers at Primenumbers\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/primenumbers\.in\/careers\/["']/i.test(page)
    && /Open roles at Primenumbers\./i.test(normalized)
    && /All roles onsite in Indiranagar,\s*Bengaluru unless noted\./i.test(normalized)
    && /Primenumbers Technologies Private Limited/i.test(page)
    && /href=["']\/careers\/[a-z0-9]+\/["']/i.test(page)
}

export const extractRoleListings = (html) => {
  if (!hasOfficialCareersIndexSignal(html)) {
    throw new Error('verified Primenumbers careers index no longer matches the trusted first-party public jobs surface')
  }

  const jobs = []
  const seen = new Set()

  for (const match of String(html ?? '').matchAll(
    /<a[^>]+class=["'][^"']*\bpn-role--link\b[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    const sourceUrl = toAbsoluteUrl(match[1], CAREERS_URL)
    if (!isOfficialDetailUrl(sourceUrl) || seen.has(sourceUrl)) continue

    const block = match[0]
    const locationWithDepartment = extractText(
      /<div[^>]+class=["'][^"']*\bpn-role-loc\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      block,
    )
    const title = extractText(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i, block)
    const teaser = extractText(/<p\b[^>]*>([\s\S]*?)<\/p>/i, block)
    const chips = [...block.matchAll(
      /<span[^>]+class=["'][^"']*\bpn-chip\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
    )]
      .map((chip) => stripTags(chip[1]))
      .filter(Boolean)

    if (!title || !locationWithDepartment || !teaser) continue

    const [location, department] = locationWithDepartment
      .split('|')
      .map((value) => normalizeWhitespace(value))

    const employmentType = chips
      .map((chip) => normalizeEmploymentType(chip))
      .find((value) => value && /Full Time|Part Time|Internship|Contract/i.test(value))
      || null

    seen.add(sourceUrl)
    jobs.push({
      title,
      location,
      department: department || null,
      employmentType,
      sourceUrl,
      teaser,
    })
  }

  if (jobs.length === 0) {
    throw new Error('verified Primenumbers careers index changed or no trusted public role cards remain')
  }

  return jobs
}

export const hasOfficialJobDetailSignal = (html, sourceUrl) => {
  const page = String(html ?? '')
  const jobPosting = extractJobPosting(page)
  const applyUrl = extractApplyUrl(page)
  const canonicalPattern = new RegExp(
    `<link[^>]+rel=["']canonical["'][^>]+href=["']${escapeRegex(sourceUrl)}["']`,
    'i',
  )
  const organizationName = normalizeWhitespace(jobPosting?.hiringOrganization?.name)
  const organizationLegalName = normalizeWhitespace(jobPosting?.hiringOrganization?.legalName)
  const hasTrustedOrganization = organizationName === COMPANY || organizationLegalName === COMPANY

  if (
    canonicalPattern.test(page)
    && /<meta[^>]+property=["']og:site_name["'][^>]+content=["'](?:Primenumbers|primenumbers\.in)["']/i.test(page)
    && Boolean(jobPosting)
    && hasTrustedOrganization
    && normalizeWhitespace(jobPosting?.hiringOrganization?.sameAs) === SITE_ORIGIN
    && normalizeWhitespace(jobPosting?.url) === sourceUrl
    && normalizeWhitespace(jobPosting?.identifier?.value) !== null
    && Boolean(applyUrl)
    && /^https:\/\/primenumbers\.in\/apply\.html\?/i.test(applyUrl)
  ) {
    return true
  }

  return canonicalPattern.test(page)
    && /<meta[^>]+property=["']og:site_name["'][^>]+content=["']Primenumbers["']/i.test(page)
    && Boolean(jobPosting)
    && normalizeWhitespace(jobPosting?.hiringOrganization?.name) === COMPANY
    && normalizeWhitespace(jobPosting?.hiringOrganization?.sameAs) === SITE_ORIGIN
    && normalizeWhitespace(jobPosting?.url) === sourceUrl
    && normalizeWhitespace(jobPosting?.identifier?.value) !== null
    && Boolean(applyUrl)
    && /^https:\/\/primenumbers\.in\/apply\.html\?/i.test(applyUrl)
}

export const extractJobDetail = (html, listing = {}) => {
  const jobPosting = extractJobPosting(html)
  if (!jobPosting) {
    throw new Error('missing trusted Primenumbers JobPosting payload')
  }

  const applyUrl = extractApplyUrl(html)
  if (!applyUrl) {
    throw new Error('missing trusted Primenumbers apply link')
  }

  const address = Array.isArray(jobPosting.jobLocation)
    ? jobPosting.jobLocation[0]?.address
    : jobPosting.jobLocation?.address
  const location = normalizeWhitespace(address?.addressLocality) || listing.location || null
  const descriptionHtml = jobPosting.description || ''
  const jobDescription = buildJobDescription(descriptionHtml)
  const jobId = normalizeWhitespace(jobPosting.identifier?.value)

  return {
    title: normalizeWhitespace(jobPosting.title) || listing.title || null,
    company: COMPANY,
    department: listing.department || null,
    location,
    city: deriveCity(location),
    country: normalizeCountry(address?.addressCountry),
    jobId,
    requisitionId: jobId,
    sourceUrl: listing.sourceUrl || normalizeWhitespace(jobPosting.url) || null,
    applyUrl,
    employmentType: normalizeEmploymentType(jobPosting.employmentType) || listing.employmentType || null,
    experienceRequired: extractExperienceRequired(jobDescription),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: extractRequiredSkills(descriptionHtml),
    postingDate: normalizeDate(jobPosting.datePosted),
    closingDate: null,
    jobDescription,
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

export const createPrimenumbersTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    const listings = extractRoleListings(careersHtml)
    const jobs = []

    for (const listing of listings) {
      const detailHtml = await fetchText(listing.sourceUrl)
      if (!hasOfficialJobDetailSignal(detailHtml, listing.sourceUrl)) {
        throw new Error('verified Primenumbers job detail no longer matches the trusted first-party application surface')
      }

      const detail = extractJobDetail(detailHtml, listing)
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

export const run = async (options = {}) => createPrimenumbersTechnologiesScraper().run(options)

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
