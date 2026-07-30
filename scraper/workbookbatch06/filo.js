import { fetchTextWithRetry } from '../utils/fetch.js'

export const SOURCE = 'filo'
export const COMPANY = 'Filo'
export const OFFICIAL_BRAND = 'Filo'
export const VERIFIED_ON = '2026-07-25'
export const CAREERS_URL = 'https://askfilo.com/careers'
export const DISPOSITION =
  'verified-first-party-careers-page-plus-public-google-doc-role-descriptions'
export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 25, 2026 that https://askfilo.com/careers was the live first-party Filo careers page, that its public __NEXT_DATA__ payload enumerated current openings across departments including Analytics, Engineering, and Design, and that each reviewed opening linked to a public published Google Docs role description. The reviewed public contract exposed roles including Business Analyst, Senior Backend Developer, and Senior Product Designer, but it did not disclose per-role location or dedicated application handoffs, so this scraper validates that exact careers-page-plus-Google-Docs contract and returns listing-plus-role-description data conservatively from the public documents.'

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const REQUIRED_CAREERS_PAGE_PATTERNS = [
  /<title[^>]*>\s*Job Opportunities At Filo\. Check For Recent Career Options\s*<\/title>/i,
  /\bCareer at Filo\b/i,
  /\bJOIN OUR TEAM\b/i,
  /\bDepartments\b/i,
  /\bid="__NEXT_DATA__"/i,
  /\bFilo EdTech INC\.\s*2025\b/i,
]

const TRUSTED_GOOGLE_DOC_URL_PATTERN =
  /^https:\/\/docs\.google\.com\/document\/d\/e\/[^/?#]+\/pub(?:[?#].*)?$/i

const DOC_PUBLISH_SIGNAL_PATTERN = /\bPublished using Google Docs\b/i

const decodeHtmlEntities = (value = '') =>
  String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;|&rsquo;|&#8217;/gi, "'")
    .replace(/&ndash;|&#8211;/gi, '-')
    .replace(/&mdash;|&#8212;/gi, '-')
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

const stripHtml = (value = '') =>
  normalizeWhitespace(
    decodeHtmlEntities(String(value))
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '\n')
      .replace(/<p\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )

const slugify = (value = '') =>
  normalizeWhitespace(value)
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  || null

const extractNextDataJson = (html = '') =>
  String(html).match(
    /<script[^>]+id="__NEXT_DATA__"[^>]+type="application\/json"[^>]*>\s*([\s\S]*?)\s*<\/script>/i,
  )?.[1] || null

const parseCareersPayload = (html = '') => {
  const rawJson = extractNextDataJson(html)
  if (!rawJson) {
    throw new Error('Filo verified careers payload changed materially')
  }

  try {
    return JSON.parse(rawJson)
  } catch {
    throw new Error('Filo verified careers payload changed materially')
  }
}

const isTrustedGoogleDocUrl = (value = '') =>
  TRUSTED_GOOGLE_DOC_URL_PATTERN.test(normalizeWhitespace(value) || '')

const dedupeRoles = (roles = []) =>
  roles.filter((role, index, collection) =>
    collection.findIndex((candidate) =>
      candidate.title === role.title
      && candidate.department === role.department
      && candidate.documentUrl === role.documentUrl) === index)

const extractSection = (text = '', startLabel, endLabels = []) => {
  const normalized = normalizeWhitespace(text) || ''
  if (!normalized) return null

  const endPattern = endLabels.length > 0
    ? `(?=${endLabels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}|$)`
    : '$'
  const expression = new RegExp(
    `${startLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*([\\s\\S]*?)${endPattern}`,
    'i',
  )
  const match = normalized.match(expression)
  return normalizeWhitespace(match?.[1])
}

const extractDocContentHtml = (html = '') =>
  String(html).match(/<div id="contents">([\s\S]*?)(?:<\/body>|<script\b)/i)?.[1] || html

const extractDocTitle = (html = '') =>
  normalizeWhitespace(
    String(html).match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
    || String(html).match(/<div id="title">([\s\S]*?)<\/div>/i)?.[1],
  )

const extractExperienceRequired = (text = '') => {
  const normalized = normalizeWhitespace(text) || ''
  const scoped = extractSection(normalized, 'Experience:', [
    'About Filo',
    'Roles and Responsibilities',
    'Requirements',
    'What we offer',
    'Join In',
  ]) || normalized

  const match = scoped.match(/\b(?:Minimum\s+)?\d+(?:\s*-\s*\d+|\+)?\s*years?\b/i)
  return normalizeWhitespace(match?.[0])
}

export const hasOfficialCareersPageSignal = (html = '') =>
  REQUIRED_CAREERS_PAGE_PATTERNS.every((pattern) => pattern.test(String(html)))

export const extractPublicRoles = (html = '') => {
  const payload = parseCareersPayload(html)
  const departmentMap = payload?.props?.pageProps?.data

  if (!departmentMap || typeof departmentMap !== 'object' || Array.isArray(departmentMap)) {
    throw new Error('Filo verified careers payload changed materially')
  }

  const roles = []

  for (const [departmentName, entries] of Object.entries(departmentMap)) {
    if (!Array.isArray(entries)) {
      throw new Error('Filo verified careers payload changed materially')
    }

    for (const entry of entries) {
      const title = normalizeWhitespace(entry?.position)
      const department = normalizeWhitespace(entry?.department)
      const documentUrl = normalizeWhitespace(entry?.documentUrl)

      if (!title || !department || !documentUrl) {
        throw new Error('Filo verified careers payload changed materially')
      }
      if (department !== normalizeWhitespace(departmentName)) {
        throw new Error('Filo verified careers payload changed materially')
      }
      if (!isTrustedGoogleDocUrl(documentUrl)) {
        throw new Error('Filo public role document contract changed materially')
      }

      roles.push({
        title,
        department,
        documentUrl,
      })
    }
  }

  const dedupedRoles = dedupeRoles(roles)
  if (dedupedRoles.length === 0) {
    throw new Error('Filo verified careers payload changed materially')
  }

  return dedupedRoles
}

export const extractPublishedRoleDetails = (html = '', listing = {}) => {
  if (!DOC_PUBLISH_SIGNAL_PATTERN.test(String(html))) {
    throw new Error('Filo published Google Doc detail page changed materially')
  }

  const title = extractDocTitle(html)
  if (!title || title !== normalizeWhitespace(listing?.title)) {
    throw new Error('Filo published Google Doc detail page changed materially')
  }

  const text = stripHtml(extractDocContentHtml(html)) || ''
  const jobDescription = extractSection(text, 'Roles and Responsibilities', [
    'Requirements',
    'What we offer',
    'Join In',
  ])
  const minimumQualification = extractSection(text, 'Requirements', [
    'What we offer',
    'Join In',
    'Website:',
  ])

  return {
    title,
    experienceRequired: extractExperienceRequired(text),
    jobDescription,
    minimumQualification,
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: `${SOURCE}-html`,
  timeoutMs: 15000,
})

const buildJob = (listing = {}, detail = {}, scrapedAt = new Date().toISOString()) => {
  const jobId = slugify(listing.title)

  return {
    title: listing.title,
    company: COMPANY,
    department: listing.department,
    location: null,
    city: null,
    country: null,
    jobId,
    requisitionId: jobId,
    sourceUrl: listing.documentUrl,
    applyUrl: listing.documentUrl,
    employmentType: null,
    experienceRequired: detail.experienceRequired || null,
    minimumQualification: detail.minimumQualification || null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: detail.jobDescription || null,
    source: SOURCE,
    link: listing.documentUrl,
    scrapedAt,
  }
}

export const createFiloScraper = ({ maxJobs = null } = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Filo verified official careers surface changed materially')
    }

    const roles = extractPublicRoles(careersHtml)
    const selectedRoles = Number.isInteger(maxJobs)
      ? roles.slice(0, maxJobs)
      : roles
    const scrapedAt = now()
    const jobs = []

    for (const listing of selectedRoles) {
      try {
        const detailHtml = await fetchText(listing.documentUrl)
        const detail = extractPublishedRoleDetails(detailHtml, listing)
        jobs.push(buildJob(listing, detail, scrapedAt))
      } catch (error) {
        console.warn(`  [${SOURCE}] Skipping ${listing.title}: ${error.message}`)
      }
    }

    return jobs
  },
})

export const run = async (options = {}) => createFiloScraper(options).run(options)
