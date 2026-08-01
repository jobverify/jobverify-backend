import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREER_PAGE_URL = 'https://www.stonex.com/en/about/careers/jobs/'
export const ICIMS_HOST = 'https://english-stonex.icims.com'

const COMPANY_NAME = 'StoneX India'
const SOURCE = 'stonexindia'
const DEFAULT_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
}
const DETAIL_SECTION_STOP_LABELS = [
  'Overview',
  'Responsibilities',
  'Qualifications',
  'Options',
  'Apply for this job online',
  'Email this job to a friend',
  'Share',
  'Refer',
]

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined
  }

  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#39;|&#x27;|&apos;/gi, '\'')
  .replace(/&#34;|&quot;/gi, '"')
  .replace(/&#8211;|&#x2013;|&ndash;/gi, '-')
  .replace(/&#8212;|&#x2014;|&mdash;/gi, '-')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&nbsp;|&#160;/gi, ' ')

const normalizeWhitespace = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim() || null

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(div|dt|dd|h[1-6]|li|p|section|span|ul|ol)>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const unique = (values) => [...new Set(values.filter(Boolean))]

const escapeRegex = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const htmlToLines = (html) => decodeHtmlEntities(String(html ?? ''))
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<\/?(?:article|div|dl|dt|dd|h[1-6]|li|main|ol|p|section|span|ul)[^>]*>/gi, '\n')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .split(/\n+/)
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const toAbsoluteUrl = (value, base = CAREER_PAGE_URL) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(
      normalized,
      /^\/jobs\//i.test(normalized) ? ICIMS_HOST : base,
    ).toString()
  } catch {
    return normalized
  }
}

const normalizeCity = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/^IN[-,\s]+/i, '')
    .split(/,|\(|\s-\s/)[0],
)

const buildIndiaLocation = (value) => {
  const city = normalizeCity(value)
  return {
    city,
    location: city ? `${city}, India` : null,
  }
}

const extractJobPathInfo = (value = '') => {
  const match = String(value ?? '').match(/\/jobs\/(\d+)\/([^/?#]+)\/job/i)
  if (!match) return { jobId: null, slug: null }

  return {
    jobId: normalizeWhitespace(match[1]),
    slug: normalizeWhitespace(match[2]),
  }
}

const extractLineAfterLabel = (lines, label) => {
  const index = lines.findIndex((line) => new RegExp(`^${escapeRegex(label)}$`, 'i').test(line))
  return index >= 0 ? normalizeWhitespace(lines[index + 1]) : null
}

const extractSectionLines = (lines, label, stopLabels = []) => {
  const startIndex = lines.findIndex((line) => new RegExp(`^${escapeRegex(label)}$`, 'i').test(line))
  if (startIndex === -1) return []

  const collected = []
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (stopLabels.some((stopLabel) => new RegExp(`^${escapeRegex(stopLabel)}$`, 'i').test(line))) {
      break
    }
    collected.push(line)
  }

  return collected
}

const extractDescriptionFields = (lines) => {
  const sanitizeSectionLines = (sectionLines) => sectionLines.filter((line) => !/^(apply|share|refer|email this job)/i.test(line))

  const overviewLines = extractSectionLines(lines, 'Overview', DETAIL_SECTION_STOP_LABELS)
  const responsibilityLines = sanitizeSectionLines(
    extractSectionLines(lines, 'Responsibilities', DETAIL_SECTION_STOP_LABELS),
  )
  const qualificationLines = sanitizeSectionLines(
    extractSectionLines(lines, 'Qualifications', DETAIL_SECTION_STOP_LABELS),
  )

  return {
    jobDescription: normalizeWhitespace([
      overviewLines.join(' '),
      responsibilityLines.join(' '),
      qualificationLines.join(' '),
    ].filter(Boolean).join(' ')),
    requiredSkills: unique(qualificationLines),
  }
}

const extractApplyUrl = (html = '', listing = {}) => {
  const applyMatch = String(html ?? '').match(
    /<a[^>]+href=["']([^"']*apply=yes[^"']*)["'][^>]*(?:class=["'][^"']*iCIMS_ApplyOnlineButton[^"']*["']|title=["']Apply for this job online["'])/i,
  ) || String(html ?? '').match(
    /<a[^>]+(?:class=["'][^"']*iCIMS_ApplyOnlineButton[^"']*["']|title=["']Apply for this job online["'])[^>]+href=["']([^"']+)["']/i,
  )

  const rawUrl = toAbsoluteUrl(applyMatch?.[1], ICIMS_HOST)
  if (!rawUrl) return listing.applyUrl || listing.sourceUrl || null

  try {
    const parsed = new URL(rawUrl)
    const canonical = new URL(parsed.pathname, parsed.origin)

    canonical.searchParams.set('apply', 'yes')
    if (parsed.searchParams.get('hashed')) {
      canonical.searchParams.set('hashed', parsed.searchParams.get('hashed'))
    }
    canonical.searchParams.set('mode', parsed.searchParams.get('mode') || 'apply')

    return canonical.toString()
  } catch {
    return rawUrl
  }
}

const buildListingRecord = (title, linkHref, blockLines) => {
  const { jobId, slug } = extractJobPathInfo(linkHref)
  const locationLine = blockLines.find((line) => /^IN[-,\s]/i.test(line) || /,\s*India\b/i.test(line))
  if (!jobId || !slug || !title || !locationLine || !/^IN[-,\s]/i.test(locationLine)) return null

  const requisitionLine = blockLines.find((line) => /(?:req(?:uisition)?\s*id|job id)\s*:/i.test(line))
  const requisitionId = normalizeWhitespace(
    requisitionLine?.replace(/^.*?(?:req(?:uisition)?\s*id|job id)\s*:\s*/i, ''),
  )
  const { city, location } = buildIndiaLocation(locationLine)

  const filteredLines = blockLines.filter((line) => (
    line !== title
    && line !== locationLine
    && line !== requisitionLine
    && !/^(apply|share|refer|email this job)/i.test(line)
  ))

  const summaryLines = filteredLines.length >= 3 ? filteredLines.slice(0, -2) : filteredLines.slice(0, 1)
  const department = filteredLines.length >= 2 ? filteredLines.at(-2) : null
  const employmentType = filteredLines.length >= 2 ? filteredLines.at(-1) : null

  return {
    title,
    company: COMPANY_NAME,
    department: normalizeWhitespace(department),
    location,
    city,
    country: 'India',
    jobId,
    requisitionId,
    sourceUrl: buildDetailUrl({ jobId, slug }),
    applyUrl: buildDetailUrl({ jobId, slug }),
    employmentType: normalizeWhitespace(employmentType),
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: normalizeWhitespace(summaryLines.join(' ')),
  }
}

export const defaultFetchText = async (url, {
  fetchImpl = fetch,
  timeoutMs = 15000,
} = {}) => {
  const response = await fetchImpl(url, {
    headers: DEFAULT_HEADERS,
    signal: createTimeoutSignal(timeoutMs),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const buildCareerPageUrl = () => CAREER_PAGE_URL

export const buildDetailUrl = ({ jobId, slug }) => {
  const normalizedJobId = normalizeWhitespace(jobId)
  const normalizedSlug = normalizeWhitespace(slug)
  return normalizedJobId && normalizedSlug
    ? `${ICIMS_HOST}/jobs/${normalizedJobId}/${normalizedSlug}/job`
    : null
}

export const buildDetailFetchUrl = ({ jobId, slug }) => {
  const detailUrl = buildDetailUrl({ jobId, slug })
  if (!detailUrl) return null

  const url = new URL(detailUrl)
  url.searchParams.set('in_iframe', '1')
  return url.toString()
}

export const hasOfficialJobsPageSignal = (html = '') => {
  const source = String(html ?? '')
  return /\bStoneX\b/i.test(source)
    && /\/jobs\/\d+\/[^"'?\s<>]+\/job/i.test(source)
}

export const extractJobCards = (html = '') => {
  const source = String(html ?? '')
  const linkPattern = /<a[^>]+href=["']([^"']*\/jobs\/\d+\/[^"'?#\s<>]+\/job(?:\?[^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/gi
  const matches = [...source.matchAll(linkPattern)]

  return matches
    .map((match, index) => {
      const nextIndex = matches[index + 1]?.index ?? source.length
      const blockHtml = source.slice(match.index ?? 0, nextIndex)
      const blockLines = htmlToLines(blockHtml)
      return buildListingRecord(
        stripTags(match[2]),
        match[1],
        blockLines,
      )
    })
    .filter(Boolean)
}

export const extractJobDetail = (html = '', listing = {}) => {
  const lines = htmlToLines(html)
  const locationLine = extractLineAfterLabel(lines, 'Job Locations') || listing.location
  const { city, location } = buildIndiaLocation(locationLine)
  const { jobDescription, requiredSkills } = extractDescriptionFields(lines)
  const { jobId, slug } = extractJobPathInfo(listing.sourceUrl)
  const title = stripTags(
    String(html ?? '').match(/<h1[^>]*class=["'][^"']*iCIMS_Header[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1],
  ) || lines[0] || listing.title || null

  return {
    title,
    company: listing.company || COMPANY_NAME,
    department: extractLineAfterLabel(lines, 'Category (Portal Searching)') || listing.department || null,
    location: listing.location || location,
    city: listing.city || city,
    country: listing.country || 'India',
    jobId: listing.jobId || jobId,
    requisitionId: extractLineAfterLabel(lines, 'Requisition ID') || listing.requisitionId || null,
    sourceUrl: listing.sourceUrl || buildDetailUrl({ jobId, slug }),
    applyUrl: extractApplyUrl(html, listing),
    employmentType: extractLineAfterLabel(lines, 'Position Type (Portal Searching)') || listing.employmentType || null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills,
    postingDate: null,
    closingDate: null,
    jobDescription: jobDescription || listing.jobDescription || null,
  }
}

export const createStoneXIndiaScraper = ({
  fetchText = defaultFetchText,
  maxJobs = null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText: overrideFetchText,
    maxJobs: overrideMaxJobs = maxJobs,
  } = {}) {
    const fetchTextImpl = overrideFetchText || fetchText
    const listingHtml = await fetchTextImpl(buildCareerPageUrl())

    if (!hasOfficialJobsPageSignal(listingHtml)) {
      throw new Error('StoneX careers page no longer matches the verified official public jobs surface')
    }

    const jobs = []
    const seenJobIds = new Set()

    for (const listing of extractJobCards(listingHtml)) {
      if (!listing.jobId || seenJobIds.has(listing.jobId)) continue
      seenJobIds.add(listing.jobId)

      const { jobId, slug } = extractJobPathInfo(listing.sourceUrl)
      let job = listing

      try {
        const detailHtml = await fetchTextImpl(buildDetailFetchUrl({ jobId, slug }))
        job = extractJobDetail(detailHtml, listing)
      } catch {
        job = listing
      }

      jobs.push({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: now(),
      })

      if (overrideMaxJobs && jobs.length >= overrideMaxJobs) {
        break
      }
    }

    return jobs
  },
})

export const run = async (options = {}) => createStoneXIndiaScraper().run(options)

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
