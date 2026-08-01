import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { CANONICAL_CITIES } from '../../scraper-support/utils/cities.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'nexturn'
export const COMPANY = 'NexTurn'
export const HOMEPAGE_URL = 'https://nexturn.com/'
export const CAREERS_URL = 'https://nexturn.com/careers/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const DETAIL_SECTION_LABELS = [
  'Location',
  'Work Experience',
  'Requirements',
  'Qualifications',
  'Job Description',
]

const DETAIL_STOP_PATTERNS = [
  /^Apply\b/i,
  /^Job Application Form\b/i,
  /^Offices\b/i,
  /^Technologies\b/i,
  /^Quick Links\b/i,
]

const NON_INDIA_LOCATION_PATTERNS = [
  /\busa\b/i,
  /\bunited states\b/i,
  /\bking of prussia\b/i,
  /\bpennsylvania\b/i,
  /\bpa\b/i,
]

const CITY_MATCHERS = Object.entries(CANONICAL_CITIES)
  .map(([raw, canonical]) => ({
    canonical,
    pattern: new RegExp(`(^|[^a-z])${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[^a-z]|$)`, 'i'),
  }))
  .sort((left, right) => right.pattern.source.length - left.pattern.source.length)

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/&#8212;|&mdash;/gi, '-')
  .replace(/&#8216;|&#8217;|&apos;|&rsquo;|&lsquo;/gi, "'")
  .replace(/&#8220;|&#8221;|&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  decodeHtmlEntities(value)
    .replace(/<(?:br|\/p|\/div|\/section|\/article|\/li|\/ul|\/ol|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const htmlToTextLines = (html) =>
  decodeHtmlEntities(html)
    .replace(/<(?:br|\/p|\/div|\/section|\/article|\/li|\/ul|\/ol|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)

const extractText = (pattern, html) => stripTags((String(html ?? '').match(pattern) || [])[1])

const toAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  try {
    return new URL(value, baseUrl).href
  } catch {
    return null
  }
}

const isOfficialNexTurnJobUrl = (value) => {
  try {
    const url = new URL(value)
    return url.hostname.replace(/^www\./i, '').toLowerCase() === 'nexturn.com'
      && /^\/job\/[^/?#]+\/?$/i.test(url.pathname)
  } catch {
    return false
  }
}

const extractHref = (html) => {
  const match = String(html ?? '').match(/href=(["']?)([^"'\s>]+)\1/i)
  return toAbsoluteUrl(match?.[2] || null)
}

const extractSection = (lines, label) => {
  const labelPattern = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:`, 'i')
  const startIndex = lines.findIndex((line) => labelPattern.test(line))
  if (startIndex === -1) return null

  const values = []
  const firstLine = lines[startIndex].replace(labelPattern, '').trim()
  if (firstLine) values.push(firstLine)

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (DETAIL_STOP_PATTERNS.some((pattern) => pattern.test(line))) break
    if (DETAIL_SECTION_LABELS.some((candidate) => {
      if (candidate === label) return false
      return new RegExp(`^${candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:`, 'i').test(line)
    })) {
      break
    }
    values.push(line)
  }

  return normalizeWhitespace(values.join(' '))
}

const isExplicitNonIndiaLocation = (value) =>
  NON_INDIA_LOCATION_PATTERNS.some((pattern) => pattern.test(String(value ?? '')))

const findCanonicalCities = (location) => {
  const normalized = normalizeWhitespace(location)?.toLowerCase()
  if (!normalized) return []

  const matches = CITY_MATCHERS
    .map(({ canonical, pattern }) => {
      const match = pattern.exec(normalized)
      return match ? { canonical, index: match.index } : null
    })
    .filter(Boolean)
    .sort((left, right) => left.index - right.index)

  return [...new Set(matches.map((item) => item.canonical))]
}

const deriveCity = (location) => {
  const matches = findCanonicalCities(location)
  const firstPhysicalCity = matches.find((city) => city !== 'Remote' && city !== 'None')
  if (firstPhysicalCity) return firstPhysicalCity
  return matches.includes('Remote') ? 'Remote' : null
}

const isIndiaLocation = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return false
  if (/\bindia\b/i.test(normalized)) return true
  if (isExplicitNonIndiaLocation(normalized)) return false
  return findCanonicalCities(normalized).some((city) => city !== 'Remote' && city !== 'None')
}

const buildJobId = (sourceUrl) => {
  try {
    const slug = new URL(sourceUrl).pathname.split('/').filter(Boolean).at(-1) || 'role'
    return `${SOURCE}-${slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`
  } catch {
    return `${SOURCE}-role`
  }
}

const composeJobDescription = ({ requirements, jobDescription, jobDescriptionPreview }) => {
  const sections = []
  if (requirements) sections.push(`Requirements: ${requirements}`)
  if (jobDescription) sections.push(`Job Description: ${jobDescription}`)
  if (!sections.length && jobDescriptionPreview) sections.push(jobDescriptionPreview)
  return normalizeWhitespace(sections.join('\n\n'))
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')

  return /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/nexturn\.com\/["']/i.test(page)
    && /<meta[^>]+property=["']og:site_name["'][^>]+content=["']NexTurn["']/i.test(page)
    && /href=["']https:\/\/nexturn\.com\/careers\/["']/i.test(page)
    && /careers@nexturn\.com/i.test(page)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Careers at NexTurn\b/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/nexturn\.com\/careers\/["']/i.test(page)
    && /Current Positions Available/i.test(page)
    && /href=["']?https:\/\/nexturn\.com\/job\/[^"'\s>]+["']?/i.test(page)
}

export const hasOfficialJobDetailSignal = (html) => {
  const page = String(html ?? '')

  return /<title>[\s\S]+-\s*NexTurn<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/nexturn\.com\/job\/[^"']+\/["']/i.test(page)
    && /Location\s*:/i.test(page)
    && /Work Experience\s*:/i.test(page)
    && /Qualifications\s*:/i.test(page)
    && /Job Description\s*:/i.test(page)
}

export const extractJobCards = (html) => {
  const jobs = []
  const seenUrls = new Set()
  const page = String(html ?? '')
  const blockStarts = [...page.matchAll(/<div\b[^>]*id=(["']?)job_post_thumb_\d+\1[^>]*>/gi)]
    .map((match) => match.index)
    .filter((index) => Number.isInteger(index))

  for (let index = 0; index < blockStarts.length; index += 1) {
    const cardHtml = page.slice(blockStarts[index], blockStarts[index + 1] ?? page.length)
    const sourceUrl = extractHref(cardHtml)

    if (!isOfficialNexTurnJobUrl(sourceUrl) || seenUrls.has(sourceUrl)) continue

    seenUrls.add(sourceUrl)
    jobs.push({
      title: extractText(/<h3[^>]*>([\s\S]*?)<\/h3>/i, cardHtml),
      location: extractText(/<p[^>]*class=["']?job-subtitle["']?[^>]*>([\s\S]*?)<\/p>/i, cardHtml),
      experienceRequired: extractText(/Work Experience:\s*<\/strong>\s*([\s\S]*?)<\/div>/i, cardHtml),
      minimumQualification: extractText(/Qualifications:\s*<\/strong>\s*([\s\S]*?)<\/div>/i, cardHtml),
      jobDescriptionPreview: extractText(/Job Description:\s*<\/strong>\s*<p[^>]*>([\s\S]*?)<\/p>/i, cardHtml),
      sourceUrl,
    })
  }

  return jobs.filter((job) => job.title && job.location && job.sourceUrl)
}

export const extractJobDetail = (html, sourceUrl) => {
  const allLines = htmlToTextLines(html)
  const startIndex = allLines.findIndex((line) => /back to career/i.test(line))
  const lines = startIndex >= 0 ? allLines.slice(startIndex) : allLines

  const title = extractText(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html)
    || extractText(/<title>([\s\S]*?)<\/title>/i, html)?.replace(/\s*-\s*NexTurn$/i, '')
  const location = extractSection(lines, 'Location')
  const experienceRequired = extractSection(lines, 'Work Experience')
  const requirements = extractSection(lines, 'Requirements')
  const minimumQualification = extractSection(lines, 'Qualifications')
  const jobDescription = extractSection(lines, 'Job Description')

  return {
    title,
    location,
    city: deriveCity(location),
    experienceRequired,
    requirements,
    minimumQualification,
    jobDescription,
    sourceUrl,
    applyUrl: sourceUrl,
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

export const createNexTurnScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('NexTurn official homepage changed; refusing to trust careers links')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('NexTurn official careers surface changed; refusing to trust public listings')
    }

    const jobCards = extractJobCards(careersHtml)
    if (jobCards.length === 0) {
      throw new Error('NexTurn official careers surface changed; no same-domain job cards found')
    }

    const jobs = []

    for (const card of jobCards) {
      if (isExplicitNonIndiaLocation(card.location) && !isIndiaLocation(card.location)) {
        continue
      }

      const detailHtml = await fetchText(card.sourceUrl)
      if (!hasOfficialJobDetailSignal(detailHtml)) {
        throw new Error('NexTurn official job detail surface changed; refusing to trust public listings')
      }

      const detail = extractJobDetail(detailHtml, card.sourceUrl)
      const location = detail.location || card.location
      if (!isIndiaLocation(location)) continue

      const jobId = buildJobId(card.sourceUrl)
      jobs.push({
        title: detail.title || card.title,
        company: COMPANY,
        source: SOURCE,
        country: 'India',
        location,
        city: detail.city || deriveCity(location),
        experienceRequired: detail.experienceRequired || card.experienceRequired,
        minimumQualification: detail.minimumQualification || card.minimumQualification,
        preferredQualification: null,
        requiredSkills: [],
        jobDescription: composeJobDescription({
          requirements: detail.requirements,
          jobDescription: detail.jobDescription,
          jobDescriptionPreview: card.jobDescriptionPreview,
        }),
        sourceUrl: card.sourceUrl,
        applyUrl: detail.applyUrl || card.sourceUrl,
        jobId,
        requisitionId: jobId,
        employmentType: null,
        postingDate: null,
        closingDate: null,
        link: detail.applyUrl || card.sourceUrl,
        scrapedAt: new Date().toISOString(),
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createNexTurnScraper().run(options)

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
