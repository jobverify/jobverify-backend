import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { SRI_CHAITANYA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = SRI_CHAITANYA_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const DETAIL_PAGE_URLS = [...PROVIDER_METADATA.detailPageUrls]
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobverify scraper)'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")

const stripScriptsAndStyles = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  stripScriptsAndStyles(value).replace(/<[^>]+>/g, ' '),
)

const htmlToLines = (value) => decodeHtmlEntities(
  stripScriptsAndStyles(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6|form)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)
  .split(/\r?\n/)
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const makeAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const extractFirstHeading = (html = '') => normalizeWhitespace(
  stripTags(String(html ?? '').match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1]),
)

const normalizeLabel = (value) => normalizeWhitespace(String(value ?? '').replace(/:\s*$/, ''))?.toLowerCase() || null

const extractFieldValue = (lines, label) => {
  const normalizedLabel = normalizeLabel(label)
  if (!normalizedLabel) return null

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const normalizedLine = normalizeLabel(line)
    if (!normalizedLine) continue

    if (normalizedLine === normalizedLabel) {
      return normalizeWhitespace(lines[index + 1])
    }

    if (normalizedLine.startsWith(`${normalizedLabel}:`)) {
      return normalizeWhitespace(line.slice(line.indexOf(':') + 1))
    }
  }

  return null
}

const extractSection = (lines, startLabel, endLabels = []) => {
  const normalizedStartLabel = normalizeLabel(startLabel)
  const normalizedEndLabels = endLabels.map((label) => normalizeLabel(label)).filter(Boolean)
  const startIndex = lines.findIndex((line) => {
    const normalizedLine = normalizeLabel(line)
    return normalizedLine === normalizedStartLabel
      || normalizedLine?.startsWith(`${normalizedStartLabel}:`)
  })
  if (startIndex < 0) return null

  const values = []

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]
    const normalizedLine = normalizeLabel(line)
    if (normalizedEndLabels.some((label) => normalizedLine === label || normalizedLine?.startsWith(`${label}:`))) break
    values.push(line)
  }

  return normalizeWhitespace(values.join(' '))
}

const extractLastPathSegment = (value) => {
  try {
    return new URL(value).pathname.split('/').filter(Boolean).at(-1) || null
  } catch {
    return null
  }
}

const formatLocation = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return 'India'
  if (/\bindia\b/i.test(normalized)) return normalized
  return `${normalized}, India`
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  return normalized.split(',')[0]?.trim() || null
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = (stripTags(rawHtml) || '').toLowerCase()

  return /<link[^>]+href=["']https:\/\/srichaitanya\.net\/careers\/["']/i.test(rawHtml)
    && normalized.includes('make careers at sri chaitanya')
    && normalized.includes('careers')
    && normalized.includes('sr. faculty for neet')
    && normalized.includes('sr. faculty for iitjee')
}

export const hasOfficialJobDetailSignal = (html = '') => {
  const normalized = (stripTags(html) || '').toLowerCase()

  return normalized.includes('sri chaitanya')
    && normalized.includes('apply for job')
    && (
      (
        normalized.includes('date posted:')
        && normalized.includes('location:')
        && normalized.includes('experience:')
        && normalized.includes('qualification:')
      ) || (
        normalized.includes('job overview')
        && normalized.includes('date posted')
        && normalized.includes('location')
        && normalized.includes('experience')
        && normalized.includes('qulification')
      )
    )
  }

export const extractCareerCards = (html = '') => {
  const cards = []
  const seenDetailUrls = new Set()

  for (const match of String(html ?? '').matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)) {
    const articleHtml = match[1]
    const title = normalizeWhitespace(
      stripTags(articleHtml.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1]),
    )
    const listingSummary = normalizeWhitespace(
      stripTags(articleHtml.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1]),
    )
    const detailUrl = makeAbsoluteUrl(
      articleHtml.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1],
      CAREERS_URL,
    )

    if (!title || !detailUrl) continue
    if (!detailUrl.startsWith(HOMEPAGE_URL)) continue
    if (seenDetailUrls.has(detailUrl)) continue
    seenDetailUrls.add(detailUrl)

    cards.push({
      title,
      listingSummary,
      detailUrl,
    })
  }

  if (cards.length > 0) {
    return cards
  }

  for (const match of String(html ?? '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const detailUrl = makeAbsoluteUrl(match[1], CAREERS_URL)
    const title = normalizeWhitespace(stripTags(match[2]))

    if (!detailUrl || !detailUrl.startsWith(HOMEPAGE_URL)) continue
    if (!/\/career\/[^/]+\/?$/i.test(detailUrl)) continue
    if (!title || /^apply now$/i.test(title)) continue
    if (seenDetailUrls.has(detailUrl)) continue

    seenDetailUrls.add(detailUrl)
    cards.push({
      title,
      listingSummary: null,
      detailUrl,
    })
  }

  return cards
}

export const extractJobFromDetailHtml = (html = '', card = {}, { scrapedAt } = {}) => {
  const lines = htmlToLines(html)
  const detailUrl = makeAbsoluteUrl(card.detailUrl || CAREERS_URL, CAREERS_URL) || CAREERS_URL
  const title = extractFirstHeading(html) || normalizeWhitespace(card.title)
  const jobId = extractLastPathSegment(detailUrl)
  const location = extractFieldValue(lines, 'Location:')

  if (!title || !jobId) return null

  return {
    title,
    company: COMPANY,
    department: null,
    location: formatLocation(location),
    city: extractCity(location),
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl: detailUrl,
    applyUrl: detailUrl,
    employmentType: extractFieldValue(lines, 'Employment Type:'),
    experienceRequired: extractFieldValue(lines, 'Experience:'),
    minimumQualification: extractFieldValue(lines, 'Qualification:'),
    minimumQualification: extractFieldValue(lines, 'Qualification:')
      || extractFieldValue(lines, 'Qulification'),
    preferredQualification: null,
    requiredSkills: [],
    postingDate: extractFieldValue(lines, 'Date Posted:'),
    closingDate: null,
    jobDescription: normalizeWhitespace([
      extractSection(lines, 'Role Summary:', [
        'Responsibilities:',
        'Employment Type:',
        'Date Posted:',
        'Location:',
        'Experience:',
        'Qualification:',
        'Apply For Job',
      ]),
      extractSection(lines, 'Desired Profile :', [
        'Job Overview',
        'Apply For Job',
      ]),
      extractSection(lines, 'Responsibilities:', [
        'Employment Type:',
        'Date Posted:',
        'Location:',
        'Experience:',
        'Qualification:',
        'Apply For Job',
      ]),
    ].filter(Boolean).join(' ')),
    remoteStatus: 'On-site',
    source: SOURCE,
    link: detailUrl,
    scrapedAt,
  }
}

export const createSriChaitanyaScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Sri Chaitanya careers page no longer matches the known public surface')
    }

    const cards = extractCareerCards(careersHtml)
    if (cards.length === 0) {
      throw new Error('The verified Sri Chaitanya careers page no longer exposes the expected same-domain detail links')
    }

    const jobs = []

    for (const card of cards) {
      const detailHtml = await fetchText(card.detailUrl)
      if (!hasOfficialJobDetailSignal(detailHtml)) {
        throw new Error(`The verified Sri Chaitanya job detail page no longer matches the known public surface: ${card.detailUrl}`)
      }

      const job = extractJobFromDetailHtml(detailHtml, card, {
        scrapedAt: (overrideNow || now)(),
      })
      if (job) {
        jobs.push({
          ...job,
          companyCareerPage: CAREERS_URL,
          companyDomain: 'srichaitanya.net',
          atsPlatform: 'official-company-careers',
        })
      }
    }

    if (jobs.length === 0) {
      throw new Error('Sri Chaitanya verified detail pages no longer return normalized jobs')
    }

    return jobs
  },
})

export const run = async (options = {}) => createSriChaitanyaScraper().run(options)

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
