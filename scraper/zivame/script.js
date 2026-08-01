import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const SOURCE = 'zivame'
export const COMPANY = 'Zivame'
export const VERIFIED_ON = '2026-07-30'
export const CAREERS_URL = 'https://careers.zivame.com/'

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'
const INDIA_LOCATION_HINTS = ['india', 'bangalore', 'bengaluru']

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
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '\n')
      .replace(/<p\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )

const extractTextLines = (html = '') =>
  decodeEntities(String(html))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(\/?(?:div|p|span|h[1-6]|section|article|li|ul|ol|a))\b[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .split(/\r?\n/)
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean)

const toAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  try {
    return new URL(String(value ?? ''), baseUrl).toString()
  } catch {
    return null
  }
}

const normalizeComparableText = (value) =>
  normalizeWhitespace(value)?.toLowerCase().replace(/[^a-z0-9]+/g, ' ')?.trim() || ''

const titlesMatch = (left, right) =>
  Boolean(normalizeComparableText(left) && normalizeComparableText(left) === normalizeComparableText(right))

const extractH1 = (html = '') =>
  stripTags(String(html).match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '')

const extractLabelValue = (html = '', label) => {
  const normalizedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const page = String(html ?? '')

  const sameLineMatch = page.match(
    new RegExp(`<[^>]+>\\s*${normalizedLabel}\\s*:?\\s*([^<]+?)\\s*<\\/[^>]+>`, 'i'),
  )
  if (sameLineMatch) return normalizeWhitespace(sameLineMatch[1])

  const textLines = extractTextLines(page)
  const normalizedTarget = normalizeComparableText(label)
  const sameLine = textLines.find((line) => normalizeComparableText(line).startsWith(normalizedTarget))
  if (sameLine) {
    const suffix = normalizeWhitespace(sameLine.replace(new RegExp(`^${label}\\s*:?\s*`, 'i'), ''))
    if (suffix && normalizeComparableText(suffix) !== normalizedTarget) return suffix
  }

  const lineIndex = textLines.findIndex((line) => normalizeComparableText(line) === normalizedTarget)
  if (lineIndex >= 0) return textLines[lineIndex + 1] || null

  return null
}

const extractApplyUrl = (html = '', baseUrl) => {
  const match = String(html ?? '').match(
    /<a[^>]+href="([^"]+)"[^>]*>\s*Click here to apply for this role\s*<\/a>/i,
  )
  return toAbsoluteUrl(match?.[1], baseUrl)
}

const extractExperienceLine = (lines = []) => {
  const matchedLine = lines.find((line) =>
    /\b\d+\s*-\s*\d+\s+years\b/i.test(line)
    || /\b\d+\s*-\s*\d+\s+years'? experience\b/i.test(line)
    || /\b\d+\s*-\s*\d+\s+years of experience\b/i.test(line),
  )

  return normalizeWhitespace(matchedLine?.replace(/^Have\s+/i, '')) || null
}

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (/\bindia\b/i.test(normalized)) return normalized
  return `${normalized}, India`
}

const isIndiaLocation = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return false
  return INDIA_LOCATION_HINTS.some((hint) => normalized.includes(hint))
}

const extractCity = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return normalized.split(',')[0]?.trim() || null
}

const buildDescription = (detailHtml = '', title) => {
  const detailLines = extractTextLines(detailHtml)
  const filtered = detailLines.filter((line) => {
    if (line === title) return false
    if (/-\s+Zivame Careers$/i.test(line)) return false
    if (/^Job Category:/i.test(line)) return false
    if (/^Job Type:/i.test(line)) return false
    if (/^Job Location:/i.test(line)) return false
    if (/^Zivame HQ,/i.test(line)) return false
    if (/^Click here to apply for this role$/i.test(line)) return false
    if (/^(You MUST:|Skills:?|Skills & Experience required)$/i.test(line)) return false
    return true
  })

  return filtered.join(' ') || 'Apply via the Zivame careers page.'
}

export const hasOfficialCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /<title[^>]*>\s*Zivame Careers\s*<\/title>/i.test(page)
    && text.includes('Department Job Openings')
    && text.includes('Life @ Zivame')
    && text.includes('careers@zivame.com')
    && /href="https:\/\/careers\.zivame\.com\/job-openings\/[^"/?#]+\/"/i.test(page)
}

export const hasOfficialDetailPageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /<title[^>]*>[\s\S]+?\s+-\s+Zivame Careers\s*<\/title>/i.test(page)
    && /\bJob Category\b/i.test(text)
    && /\bJob Type\b/i.test(text)
    && /\bJob Location\b/i.test(text)
    && /\bClick here to apply for this role\b/i.test(text)
}

export const extractListingCards = (html = '', baseUrl = CAREERS_URL) => {
  const seen = new Set()
  const listings = []
  const pattern = /<a[^>]+href="([^"]*\/job-openings\/[^"/?#]+\/?)"[^>]*>([\s\S]*?)<\/a>/gi

  for (const match of String(html ?? '').matchAll(pattern)) {
    const detailUrl = toAbsoluteUrl(match[1], baseUrl)
    if (!detailUrl || seen.has(detailUrl)) continue

    const detailHost = new URL(detailUrl).host
    if (detailHost !== new URL(baseUrl).host) continue

    const title = stripTags(match[2])
    if (!title) continue

    seen.add(detailUrl)
    listings.push({
      detailUrl,
      slug: detailUrl.split('/').filter(Boolean).at(-1) || null,
      title,
    })
  }

  return listings
}

const buildMappedJob = ({
  listing,
  detailHtml,
  scrapedAt,
}) => {
  const detailTitle = extractH1(detailHtml) || listing.title
  if (!titlesMatch(detailTitle, listing.title)) {
    throw new Error('Zivame verified detail page title no longer matches the listing link')
  }

  const department = extractLabelValue(detailHtml, 'Job Category')
  const employmentType = extractLabelValue(detailHtml, 'Job Type')
  const location = extractLabelValue(detailHtml, 'Job Location')

  if (!department || !employmentType || !location) {
    throw new Error('Zivame verified detail page no longer exposes the trusted public job fields')
  }

  const normalizedLocation = normalizeLocation(location)
  if (!normalizedLocation || !isIndiaLocation(normalizedLocation)) return null

  const detailLines = extractTextLines(detailHtml)

  return {
    title: detailTitle,
    company: COMPANY,
    department,
    location: normalizedLocation,
    city: extractCity(normalizedLocation),
    country: 'India',
    link: listing.detailUrl,
    applyUrl: extractApplyUrl(detailHtml, listing.detailUrl) || listing.detailUrl,
    sourceUrl: listing.detailUrl,
    source: SOURCE,
    jobId: listing.slug,
    requisitionId: listing.slug,
    employmentType,
    experienceRequired: extractExperienceLine(detailLines),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: buildDescription(detailHtml, detailTitle),
    remoteStatus: null,
    scrapedAt,
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

export const createZivameScraper = ({ maxJobs = null } = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error(
        'Zivame verified official careers page no longer matches the trusted public jobs surface',
      )
    }

    const listings = extractListingCards(careersHtml, CAREERS_URL)
    if (listings.length === 0) {
      throw new Error('Zivame careers page no longer exposes the verified public role links')
    }

    const jobs = []
    const scrapedAt = now()

    for (const listing of listings) {
      if (Number.isFinite(maxJobs) && jobs.length >= maxJobs) break

      const detailHtml = await fetchText(listing.detailUrl)
      if (!hasOfficialDetailPageSignal(detailHtml)) {
        throw new Error(
          'Zivame verified detail page no longer matches the trusted public jobs surface',
        )
      }

      const job = buildMappedJob({
        listing,
        detailHtml,
        scrapedAt,
      })

      if (!job) continue
      jobs.push(job)
    }

    if (jobs.length === 0) {
      throw new Error('Zivame careers page returned no public India jobs')
    }

    return Number.isFinite(maxJobs) ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async (options = {}) => createZivameScraper(options).run(options)
