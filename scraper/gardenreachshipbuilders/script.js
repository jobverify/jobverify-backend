import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { GARDEN_REACH_SHIPBUILDERS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = GARDEN_REACH_SHIPBUILDERS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_APPLY_PORTAL_URLS = PROVIDER_METADATA.verifiedApplyPortalUrls

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const MONTH_INDEX = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeText = (value) => normalizeWhitespace(value) || null

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const parseHumanDate = (value) => {
  const normalized = normalizeText(value)
  if (!normalized) return null

  const match = normalized.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/i)
  if (!match) return null

  const day = Number(match[1])
  const month = MONTH_INDEX[match[2].toLowerCase()]
  const year = Number(match[3])
  if (!Number.isInteger(day) || month == null || !Number.isInteger(year)) return null

  return new Date(Date.UTC(year, month, day)).toISOString()
}

const toAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  if (!value) return null

  try {
    return new URL(String(value), baseUrl).toString()
  } catch {
    return null
  }
}

const injectAnchorUrls = (html) => String(html ?? '').replace(
  /<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi,
  (_, __, href, label) => `${label} [${toAbsoluteUrl(href) || href}]`,
)

const toLines = (html) => injectAnchorUrls(html)
  .replace(/<(br|\/p|\/div|\/section|\/article|\/li|\/main|\/h[1-6])\b[^>]*>/gi, '\n')
  .replace(/<(p|div|section|article|li|main|h[1-6])\b[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .split('\n')
  .map((line) => normalizeText(line))
  .filter(Boolean)

const toStartOfDayTimestamp = (value) => {
  if (!value) return null
  return Date.parse(`${value}T00:00:00.000Z`)
}

const buildNoticeDescription = (roleSummary) => {
  if (!Array.isArray(roleSummary) || roleSummary.length === 0) {
    return 'Official GRSE recruitment notice. Review the official notice for eligibility and application details.'
  }

  return `Official GRSE recruitment notice. Roles on the verified public surface: ${roleSummary.join('; ')}.`
}

const shouldKeepRoleLine = (line) => {
  const normalized = normalizeText(line)
  if (!normalized) return false

  return !(
    /^\d+\./.test(normalized)
    || /GRSE Employment Notification/i.test(normalized)
    || /Opening date for Online Registration/i.test(normalized)
    || /Closing date for Online Registration/i.test(normalized)
    || /Last date for online submission/i.test(normalized)
    || /APPLY ONLINE/i.test(normalized)
    || /CORRIGENDUM/i.test(normalized)
    || /Keep checking this webpage/i.test(normalized)
    || /DOWNLOAD CALL LETTER/i.test(normalized)
    || /Issuance of Call Letter/i.test(normalized)
  )
}

const parseNotificationBlock = (lines) => {
  if (!Array.isArray(lines) || lines.length === 0) return null

  const headerMatch = lines[0].match(
    /^\d+\.\s*(.*?)\s*\[EMPLOYMENT NOTIFICATION\s*-?\s*([0-9]{4}\/\d+\([A-Z]\))\]/i,
  )
  if (!headerMatch) return null

  const title = normalizeText(headerMatch[1])
  const notificationId = normalizeText(headerMatch[2])
  const applyLine = lines.find((line) => /APPLY ONLINE/i.test(line)) || ''
  const applyUrl = applyLine.match(/\[(https?:\/\/[^\]]+)\]/i)?.[1] || null
  const openingDate = parseHumanDate(
    lines.find((line) => /Opening date for Online Registration/i.test(line)),
  )
  const closingDate = parseHumanDate(
    lines.find((line) => /Closing date for Online Registration/i.test(line)),
  )
  const extendedClosingDate = parseHumanDate(
    lines.find((line) => /extended upto/i.test(line)),
  )
  const roleSummary = lines.filter(shouldKeepRoleLine)

  if (!title || !notificationId || !applyUrl || !openingDate || !closingDate) {
    return null
  }

  return {
    title,
    notificationId,
    sourceUrl: CAREERS_URL,
    applyUrl,
    openingDate,
    closingDate,
    effectiveClosingDate: extendedClosingDate || closingDate,
    roleSummary,
  }
}

export const hasOfficialHomepageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Official website of Garden Reach Shipbuilders\s*&amp;\s*Engineers Limited\s*<\/title>/i.test(page)
    && /href=["']https:\/\/www\.grse\.in\/career\/["']/i.test(page)
    && normalized.includes('WELCOME TO THE OFFICIAL WEBSITE OF GARDEN REACH SHIPBUILDERS & ENGINEERS LIMITED')
    && normalized.includes('LATEST')
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Careers\s*-\s*Official website of Garden Reach Shipbuilders and Engineers Limited/i.test(page)
    && normalized.includes('Current Job Openings')
    && normalized.includes('Engagement of Apprentices and Trainee')
    && normalized.includes('Other Positions')
    && normalized.includes('RECRUITMENT OF OFFICERS [EMPLOYMENT NOTIFICATION -2026/03(O)]')
    && normalized.includes('https://jobapply.in/grse2026/')
    && normalized.includes('https://jobapply.in/grse2025/')
}

export const extractNotifications = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('Garden Reach Shipbuilders careers page no longer matches the verified official public surface')
  }

  const lines = toLines(html)
  const blocks = []
  let currentBlock = []

  for (const line of lines) {
    if (/^\d+\.\s+/.test(line)) {
      if (currentBlock.length > 0) blocks.push(currentBlock)
      currentBlock = [line]
      continue
    }

    if (currentBlock.length > 0) {
      currentBlock.push(line)
    }
  }

  if (currentBlock.length > 0) blocks.push(currentBlock)

  return blocks.map(parseNotificationBlock).filter(Boolean)
}

export const extractActiveOpenings = (html, { asOfDate } = {}) => {
  const notices = extractNotifications(html)
  const asOfTimestamp = toStartOfDayTimestamp(asOfDate || new Date().toISOString().slice(0, 10))

  return notices
    .filter((notice) => {
      const openingTimestamp = Date.parse(notice.openingDate)
      const closingTimestamp = Date.parse(notice.effectiveClosingDate)

      return Number.isFinite(asOfTimestamp)
        && Number.isFinite(openingTimestamp)
        && Number.isFinite(closingTimestamp)
        && openingTimestamp <= asOfTimestamp
        && closingTimestamp >= asOfTimestamp
    })
    .map((notice) => ({
      title: `${notice.title} [Employment Notification ${notice.notificationId}]`,
      company: COMPANY,
      department: null,
      location: 'India',
      city: null,
      state: null,
      country: 'India',
      jobId: `${SOURCE}-${slugify(notice.notificationId)}`,
      requisitionId: notice.notificationId,
      sourceUrl: notice.sourceUrl,
      applyUrl: notice.applyUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: notice.openingDate,
      closingDate: notice.effectiveClosingDate,
      jobDescription: buildNoticeDescription(notice.roleSummary),
      remoteStatus: 'On-site',
    }))
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createGardenReachShipbuildersScraper = ({
  now = () => new Date().toISOString(),
  asOfDate = new Date().toISOString().slice(0, 10),
} = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Garden Reach Shipbuilders verified homepage changed materially')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Garden Reach Shipbuilders verified careers surface changed materially')
    }

    return extractActiveOpenings(careersHtml, { asOfDate }).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: (overrideNow || now)(),
    }))
  },
})

export const run = async (options = {}) => createGardenReachShipbuildersScraper(options).run(options)

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
