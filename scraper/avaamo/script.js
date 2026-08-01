import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const SOURCE = 'avaamo'
export const COMPANY = 'Avaamo'
export const VERIFIED_ON = '2026-07-25'
export const CAREERS_URL = 'https://avaamo.ai/careers/'
export const DISPOSITION = 'verified-first-party-careers-page-plus-public-same-origin-job-pages'
export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 25, 2026 that https://avaamo.ai/careers/ was the live first-party Avaamo careers page, that it exposed public same-origin Learn more job pages for active openings, and that trustworthy India listings were publicly available for Applied AI Engineer, Senior Software Engineer – Full-Stack, Senior QA Engineer, Conversational AI Lead or Architect, Conversation Designer, Product Manager, and Solution Delivery Manager. The reviewed Forward Deployed Engineer (FDE) card on the official careers page pointed to the full-stack detail page instead of an FDE detail page, so this scraper validates listing-to-detail title agreement and returns only India jobs whose first-party detail page matches the listing.'

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const CAREERS_PAGE_PATTERNS = [
  /<title[^>]*>\s*Careers at Avaamo\s*<\/title>/i,
  /\bWE DEVELOP FUNDAMENTAL AI TECHNOLOGY\b/i,
  /\bWork with us\b/i,
  /\bActive Positions\b/i,
  /\bCompensation\b/i,
  /\bGenerous PTO\b/i,
]

const DETAIL_PAGE_PATTERNS = [
  /\bCareers at Avaamo\b/i,
  /\bApply now\b/i,
  /\bJob description\b/i,
  /\bAbout Avaamo\b/i,
]

const INDIA_LOCATION_PATTERN = /\b(?:india|bengaluru|bangalore|pune|mumbai|koramangala)\b/i
const EMPLOYMENT_TYPE_PATTERN = /\b(full[\s-]*time|part[\s-]*time|contract|intern(?:ship)?)\b/i

const decodeEntities = (value = '') =>
  String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
    .replace(/&#8211;|&ndash;/gi, '-')
    .replace(/&#8212;|&mdash;/gi, '-')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeEntities(String(value))
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value = '') =>
  normalizeWhitespace(
    decodeEntities(String(value))
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '\n')
      .replace(/<p\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )

const normalizePageText = (value = '') =>
  stripTags(
    String(value)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' '),
  ) || ''

const toAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  try {
    return new URL(String(value ?? ''), baseUrl).toString()
  } catch {
    return null
  }
}

const buildJobId = (url) => {
  try {
    return new URL(url).pathname.split('/').filter(Boolean).at(-1) || null
  } catch {
    return null
  }
}

const normalizeTitleKey = (value) =>
  normalizeWhitespace(value)
    ?.replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\b(?:u\s*s|us)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase() || ''

const titlesMatch = (left, right) => {
  const leftKey = normalizeTitleKey(left)
  const rightKey = normalizeTitleKey(right)

  if (!leftKey || !rightKey) return false
  return leftKey === rightKey
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (normalized.includes('full')) return 'Full-time'
  if (normalized.includes('part')) return 'Part-time'
  if (normalized.includes('contract')) return 'Contract'
  if (normalized.includes('intern')) return 'Internship'
  return normalizeWhitespace(value)
}

const isLikelyDepartment = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return false
  if (normalized.startsWith('Location:')) return false
  if (INDIA_LOCATION_PATTERN.test(normalized)) return false
  return !EMPLOYMENT_TYPE_PATTERN.test(normalized)
}

const splitMetaParts = (meta) =>
  normalizeWhitespace(meta)
    ?.split('|')
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean) || []

const extractDepartment = (meta) => {
  const parts = splitMetaParts(meta)
  if (parts.length >= 3 && isLikelyDepartment(parts[0])) return parts[0]
  return null
}

const extractEmploymentType = (meta) => {
  const parts = splitMetaParts(meta)
  const candidate = parts.at(-1)
  return EMPLOYMENT_TYPE_PATTERN.test(candidate || '')
    ? normalizeEmploymentType(candidate)
    : null
}

const extractLocation = (meta) => {
  const normalized = normalizeWhitespace(meta)
  if (!normalized) return null

  const parts = splitMetaParts(normalized)

  if (parts.length >= 3 && isLikelyDepartment(parts[0])) {
    return normalizeWhitespace(parts.slice(1, -1).join(' | '))
  }

  if (parts.length >= 2 && EMPLOYMENT_TYPE_PATTERN.test(parts.at(-1) || '')) {
    return normalizeWhitespace(parts.slice(0, -1).join(' | '))
  }

  return normalizeWhitespace(normalized.replace(/^Location:\s*/i, ''))
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  if (/\bbengaluru\b/i.test(normalized)) return 'Bengaluru'
  if (/\bbangalore\b/i.test(normalized)) return 'Bangalore'
  if (/\bpune\b/i.test(normalized)) return 'Pune'
  if (/\bmumbai\b/i.test(normalized)) return 'Mumbai'
  if (/\bkoramangala\b/i.test(normalized)) return 'Koramangala'
  return null
}

const isIndiaListing = (meta) => INDIA_LOCATION_PATTERN.test(normalizeWhitespace(meta) || '')

export const hasOfficialCareersPageSignal = (html = '') =>
  CAREERS_PAGE_PATTERNS.every((pattern) => pattern.test(String(html ?? '')))

export const hasOfficialDetailPageSignal = (html = '') =>
  DETAIL_PAGE_PATTERNS.every((pattern) => pattern.test(normalizePageText(html)))

export const extractListingCards = (html = '', baseUrl = CAREERS_URL) => {
  const matches = String(html).matchAll(
    /<h2>([^<]+)<\/h2>[\s\S]*?<span class="category-eyebrow__date">([\s\S]*?)<\/span>[\s\S]*?<a\s+itemprop="url"\s+href="([^"]+)"[\s\S]*?>Learn more<\/a>/gi,
  )

  return [...matches]
    .map((match) => {
      const title = normalizeWhitespace(match[1])
      const meta = normalizeWhitespace(match[2])
      const detailUrl = toAbsoluteUrl(match[3], baseUrl)

      if (!title || !meta || !detailUrl) return null

      return {
        title,
        meta,
        detailUrl,
      }
    })
    .filter(Boolean)
}

export const extractDetailTitle = (html = '') =>
  stripTags(String(html).match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '')

export const extractJobDescription = (html = '') => {
  const section = String(html).match(
    /<h2[^>]*>\s*Job description\s*<\/h2>([\s\S]*?)(?:<h2[^>]*>\s*About Avaamo\s*<\/h2>|\bAbout Avaamo\b)/i,
  )?.[1]

  return stripTags(section || '') || null
}

const mapListingToJob = (listing, detailHtml) => {
  const location = extractLocation(listing.meta)
  const sourceUrl = listing.detailUrl
  const jobId = buildJobId(sourceUrl)

  if (!location || !sourceUrl || !jobId) return null

  return {
    title: listing.title,
    company: COMPANY,
    department: extractDepartment(listing.meta),
    location,
    city: extractCity(location),
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: extractEmploymentType(listing.meta),
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: extractJobDescription(detailHtml),
    remoteStatus: /\bremote working\b/i.test(location) ? 'Remote' : null,
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

export const createAvaamoScraper = ({ maxJobs = null } = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Avaamo verified official careers page changed materially')
    }

    const listings = extractListingCards(careersHtml, CAREERS_URL)
    if (listings.length === 0) {
      throw new Error('Avaamo careers page no longer exposes the verified public listing structure')
    }

    const detailCache = new Map()
    const jobs = []
    const seenJobIds = new Set()
    const scrapedAt = now()

    for (const listing of listings) {
      if (!isIndiaListing(listing.meta)) continue

      let detailHtml = detailCache.get(listing.detailUrl)
      if (!detailHtml) {
        detailHtml = await fetchText(listing.detailUrl)
        detailCache.set(listing.detailUrl, detailHtml)
      }

      if (!hasOfficialDetailPageSignal(detailHtml)) continue

      const detailTitle = extractDetailTitle(detailHtml)
      if (!titlesMatch(detailTitle, listing.title)) continue

      const job = mapListingToJob(listing, detailHtml)
      if (!job || seenJobIds.has(job.jobId)) continue

      seenJobIds.add(job.jobId)
      jobs.push({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt,
      })

      if (Number.isInteger(maxJobs) && jobs.length >= maxJobs) break
    }

    return jobs
  },
})

export const run = async (options = {}) => createAvaamoScraper().run(options)
