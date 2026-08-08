import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'panaceamedicaltechnologiespvtltd'
export const COMPANY = 'Panacea Medical Technologies Pvt. Ltd.'
export const VERIFIED_ON = '2026-08-07'
export const HOMEPAGE_URL = 'https://www.panaceamedical.in/'
export const JOIN_US_URL = 'https://www.panaceamedical.in/join-us/'
export const CAREERS_URL = 'https://www.panaceamedical.in/careers/'
export const APPLY_BASE_URL = 'https://www.panaceamedical.in/apply/'
export const COMPANY_DOMAIN = 'panaceamedical.in'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const HOMEPAGE_ERROR =
  'Panacea Medical Technologies official homepage no longer matches the verified first-party surface'
const JOIN_US_ERROR =
  'Panacea Medical Technologies Join Us page no longer matches the verified first-party careers handoff'
const CAREERS_ERROR =
  'Panacea Medical Technologies careers board no longer matches the verified first-party job board surface'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;|&#038;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&ndash;|&#8211;|&#x2013;/gi, '-')
  .replace(/&mdash;|&#8212;|&#x2014;/gi, '-')
  .replace(/ÔÇô|â€“/g, '-')
  .replace(/â€™/g, "'")

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(String(value ?? ''))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
) || ''

const htmlToLines = (html) => decodeHtmlEntities(
  String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|li|h[1-6]|a|span|strong|em|ul|ol)>/gi, '\n')
    .replace(/<(p|div|section|article|li|h[1-6]|a|span|strong|em|ul|ol)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)
  .replace(/\r/g, '')
  .split('\n')
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const dedupeLines = (lines = []) => {
  const unique = []

  for (const line of lines) {
    if (line && unique[unique.length - 1] !== line) {
      unique.push(line)
    }
  }

  return unique
}

const toTitleKey = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim() || null

const toAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, baseUrl).toString()
  } catch {
    return null
  }
}

const extractHrefFromTag = (tag = '', baseUrl = CAREERS_URL) =>
  toAbsoluteUrl(tag.match(/\bhref=["']([^"']+)["']/i)?.[1] || null, baseUrl)

const extractMetaContent = (html, itemprop) =>
  normalizeWhitespace(
    String(html ?? '').match(
      new RegExp(`<meta\\b[^>]*itemprop=["']${itemprop}["'][^>]*content=["']([^"']+)["']`, 'i'),
    )?.[1] || null,
  )

const extractApplyJobId = (url) => {
  try {
    return normalizeWhitespace(new URL(url).searchParams.get('job_id'))
  } catch {
    return null
  }
}

const extractSectionLines = (lines, startPattern, endPatterns) => {
  const startIndex = lines.findIndex((line) => startPattern.test(line))
  if (startIndex === -1) return []

  let endIndex = lines.length
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (endPatterns.some((pattern) => pattern.test(lines[index]))) {
      endIndex = index
      break
    }
  }

  return dedupeLines(lines.slice(startIndex + 1, endIndex))
}

const parseLocation = (value) => {
  const location = normalizeWhitespace(value)
  if (!location) {
    return { location: 'India', city: null, state: null, locations: ['India'] }
  }

  if (
    /^(?:all(?:\s+over)?\s+india|north location)$/i.test(location)
    || /^\d+\s*(?:-|to)\s*\d+\s*years?$/i.test(location)
  ) {
    return { location: 'India', city: null, state: null, locations: ['India', location] }
  }

  if (/\/|,/.test(location)) {
    return { location, city: null, state: null, locations: [location] }
  }

  if (/\bMalur\b/i.test(location)) {
    return { location, city: 'Malur', state: 'Karnataka', locations: [location] }
  }

  if (/\bBengaluru\b/i.test(location)) {
    return { location, city: 'Bengaluru', state: 'Karnataka', locations: [location] }
  }

  if (/\bBangalore\b/i.test(location)) {
    return { location, city: 'Bangalore', state: 'Karnataka', locations: [location] }
  }

  if (/\bHyderabad\b/i.test(location)) {
    return { location, city: 'Hyderabad', state: 'Telangana', locations: [location] }
  }

  if (/\bJaipur\b/i.test(location)) {
    return { location, city: 'Jaipur', state: 'Rajasthan', locations: [location] }
  }

  if (/\bPune\b/i.test(location)) {
    return { location, city: 'Pune', state: 'Maharashtra', locations: [location] }
  }

  return { location, city: null, state: null, locations: [location] }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /Panacea Medical Technologies Pvt\. Ltd\./i.test(text)
    && /Defeating Cancer/i.test(text)
    && /Join Us/i.test(text)
    && /href=["']https:\/\/www\.panaceamedical\.in\/join-us\/["']/i.test(page)
    && /All Rights Reserved/i.test(text)
}

export const hasOfficialJoinUsSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*Join Us[^<]*Panacea Medical Technologies Careers\s*<\/title>/i.test(page)
    && /Engineering Medicine\./i.test(text)
    && /Changing Lives\./i.test(text)
    && /Browse All Open Positions/i.test(text)
    && /href=["']https:\/\/www\.panaceamedical\.in\/careers\/["']/i.test(page)
}

export const hasOfficialJobsBoardSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*Jobs[^<]*Panacea Careers\s*<\/title>/i.test(page)
    && /\bopen positions found\b/i.test(text)
    && /Sort by:/i.test(text)
    && /pmt-job-card/i.test(page)
}

export const extractJobsListPageUrls = (html) => {
  const urls = new Set([CAREERS_URL])

  for (const match of String(html ?? '').matchAll(/href=["']([^"']*\/careers\/page\/\d+\/)["']/gi)) {
    const url = toAbsoluteUrl(match[1], CAREERS_URL)
    if (url) {
      urls.add(url)
    }
  }

  return [...urls]
}

export const extractJobSummaries = (html) => {
  const cards = [...String(html ?? '').matchAll(
    /<article\b[^>]*class=["'][^"']*pmt-job-card[^"']*["'][^>]*>[\s\S]*?<\/article>/gi,
  )]

  return cards.map((match) => {
    const card = match[0]
    const titleMatch = card.match(
      /<a\b([^>]*)class=["'][^"']*\bpmt-job-card__title\b[^"']*["']([^>]*)>([\s\S]*?)<\/a>/i,
    )
    const titleTag = titleMatch ? `${titleMatch[0]}` : ''
    const applyMatch = card.match(
      /<a\b([^>]*)aria-label=["'][^"']*Apply for[^"']*["']([^>]*)>([\s\S]*?)<\/a>/i,
    )
    const applyTag = applyMatch ? `${applyMatch[0]}` : ''
    const badgeMatches = [...card.matchAll(
      /<span\b[^>]*class=["'][^"']*pmt-badge[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
    )]
    const metaMatches = [...card.matchAll(
      /<span\b[^>]*class=["'][^"']*pmt-job-card__meta-item[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
    )]

    return {
      listingJobId: normalizeWhitespace(card.match(/\bid=["']job-(\d+)["']/i)?.[1] || null),
      title: stripTags(titleMatch?.[3] || ''),
      detailUrl: extractHrefFromTag(titleTag, CAREERS_URL),
      applyUrl: extractHrefFromTag(applyTag, CAREERS_URL),
      employmentType: stripTags(badgeMatches[0]?.[1] || '')
        || normalizeWhitespace(extractMetaContent(card, 'employmentType')?.replace(/_/g, ' ')),
      workMode: stripTags(badgeMatches[1]?.[1] || ''),
      location: stripTags(metaMatches[0]?.[1] || ''),
      department: stripTags(metaMatches[1]?.[1] || ''),
      experienceRequired: stripTags(metaMatches[2]?.[1] || ''),
      postingRelative: stripTags(
        card.match(/<span\b[^>]*class=["'][^"']*pmt-job-card__days[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] || '',
      ),
      postingDate: extractMetaContent(card, 'datePosted'),
      closingDate: extractMetaContent(card, 'validThrough'),
    }
  }).filter((job) => job.title && job.detailUrl && job.applyUrl)
}

export const extractJobDetail = (html) => {
  const lines = htmlToLines(html)
  if (!lines.includes('Job Overview')) {
    return {}
  }

  const detailTitle = normalizeWhitespace(
    String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || null,
  )?.replace(/\s*[-]\s*Panacea Careers\s*$/i, '')

  const aboutLines = extractSectionLines(lines, /^About the Role$/i, [
    /^Key Responsibilities$/i,
    /^Qualifications & Requirements$/i,
    /^Benefits & Perks$/i,
    /^Share This Job$/i,
    /^Ready to Apply\?$/i,
    /^Job Overview$/i,
  ])
  const responsibilityLines = extractSectionLines(lines, /^Key Responsibilities$/i, [
    /^Qualifications & Requirements$/i,
    /^Benefits & Perks$/i,
    /^Share This Job$/i,
    /^Ready to Apply\?$/i,
    /^Job Overview$/i,
  ])
  const qualificationLines = extractSectionLines(lines, /^Qualifications & Requirements$/i, [
    /^Benefits & Perks$/i,
    /^Share This Job$/i,
    /^Ready to Apply\?$/i,
    /^Job Overview$/i,
  ])

  const overviewStart = lines.indexOf('Job Overview')
  const overviewEnd = lines.findIndex((line, index) =>
    index > overviewStart && /^Need Help\?$|^Similar Positions$|^Fraud Alert$|^Connect with Panacea$/i.test(line))
  const overviewLines = overviewStart === -1
    ? []
    : lines.slice(overviewStart + 1, overviewEnd === -1 ? lines.length : overviewEnd)

  const fields = {}
  const labels = new Set([
    'Job Code / Ref',
    'Open Positions',
    'Posted',
    'Deadline',
    'Employment Type',
    'Department',
    'Location',
    'Experience',
    'Education',
    'Work Mode',
  ])

  for (let index = 0; index < overviewLines.length - 1; index += 1) {
    const label = overviewLines[index]
    if (!labels.has(label)) continue
    fields[label] = overviewLines[index + 1]
    index += 1
  }

  return {
    detailTitle,
    jobId: normalizeWhitespace(fields['Job Code / Ref']),
    openPositions: normalizeWhitespace(fields['Open Positions']),
    postingRelative: normalizeWhitespace(fields.Posted),
    closingStatus: normalizeWhitespace(fields.Deadline),
    employmentType: normalizeWhitespace(fields['Employment Type']),
    department: normalizeWhitespace(fields.Department),
    location: normalizeWhitespace(fields.Location),
    experienceRequired: normalizeWhitespace(fields.Experience),
    minimumQualification: normalizeWhitespace(fields.Education) || qualificationLines[0] || null,
    workMode: normalizeWhitespace(fields['Work Mode']),
    requiredSkills: qualificationLines.length > 0 ? qualificationLines : responsibilityLines,
    jobDescription: normalizeWhitespace([
      ...aboutLines,
      ...responsibilityLines,
      ...qualificationLines,
    ].join(' ')),
  }
}

export const createPanaceaMedicalTechnologiesScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error(HOMEPAGE_ERROR)
    }

    const joinUsHtml = await fetchText(JOIN_US_URL)
    if (!hasOfficialJoinUsSignal(joinUsHtml)) {
      throw new Error(JOIN_US_ERROR)
    }

    const firstJobsPageHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialJobsBoardSignal(firstJobsPageHtml)) {
      throw new Error(CAREERS_ERROR)
    }

    const jobPageUrls = extractJobsListPageUrls(firstJobsPageHtml)
    const summaries = []

    for (const url of jobPageUrls) {
      const pageHtml = url === CAREERS_URL ? firstJobsPageHtml : await fetchText(url)
      if (!hasOfficialJobsBoardSignal(pageHtml)) {
        throw new Error(CAREERS_ERROR)
      }
      summaries.push(...extractJobSummaries(pageHtml))
    }

    const uniqueSummaries = [...new Map(
      summaries.map((job) => [job.applyUrl || job.listingJobId || job.detailUrl, job]),
    ).values()]

    if (uniqueSummaries.length === 0) {
      throw new Error(CAREERS_ERROR)
    }

    const jobs = []

    for (const summary of uniqueSummaries) {
      let detail = {}

      if (summary.detailUrl) {
        const detailHtml = await fetchText(summary.detailUrl)
        detail = extractJobDetail(detailHtml)
        if (detail.detailTitle && toTitleKey(detail.detailTitle) !== toTitleKey(summary.title)) {
          detail = {}
        }
      }

      const locationFields = parseLocation(detail.location || summary.location)
      const jobId = detail.jobId || extractApplyJobId(summary.applyUrl) || summary.listingJobId || summary.detailUrl

      jobs.push({
        title: summary.title,
        company: COMPANY,
        department: detail.department || summary.department || null,
        location: locationFields.location,
        locations: locationFields.locations,
        city: locationFields.city,
        state: locationFields.state,
        country: 'India',
        jobId,
        requisitionId: jobId,
        sourceUrl: summary.detailUrl,
        applyUrl: summary.applyUrl,
        employmentType: detail.employmentType || summary.employmentType || null,
        experienceRequired: detail.experienceRequired || summary.experienceRequired || null,
        minimumQualification: detail.minimumQualification || null,
        preferredQualification: null,
        requiredSkills: detail.requiredSkills || [],
        postingDate: summary.postingDate,
        closingDate: summary.closingDate,
        jobDescription: detail.jobDescription || normalizeWhitespace([
          summary.department,
          summary.location,
          summary.experienceRequired,
        ].filter(Boolean).join(' - ')),
        source: SOURCE,
        link: summary.applyUrl || summary.detailUrl,
        scrapedAt: (overrideNow || now)(),
        companyCareerPage: CAREERS_URL,
        companyDomain: COMPANY_DOMAIN,
        atsPlatform: 'official-first-party-careers-portal',
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createPanaceaMedicalTechnologiesScraper().run(options)

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
