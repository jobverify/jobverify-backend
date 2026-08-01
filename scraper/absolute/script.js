import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'absolute'
export const COMPANY = 'Absolute'
export const OFFICIAL_BRAND_NAME = 'Absolute Security'
export const VERIFIED_AT = '2026-07-14'
export const HOMEPAGE_URL = 'https://www.absolute.com/'
export const CAREERS_URL = 'https://www.absolute.com/company/careers/'
export const JOB_BOARD_URL = 'https://jobs.jobvite.com/absolute/'
export const DETAIL_URL_PATTERN = 'https://jobs.jobvite.com/absolute/job/{jobvite_id}'

export const PROVIDER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  officialBrandName: OFFICIAL_BRAND_NAME,
  adapter: 'script',
  modulePath: '../absolute/script.js',
  companyCareerPage: CAREERS_URL,
  officialCareersHandoffUrl: JOB_BOARD_URL,
  atsPlatform: 'jobvite',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-careers-handoff-plus-single-jobvite-board',
  extractionStrategy:
    'verified-official-homepage+verified-official-careers-page+jobvite-open-positions-board+india-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'absolute.com',
  verifiedOn: VERIFIED_AT,
  verifiedSurfaceSummary:
    'Verified https://www.absolute.com/, https://www.absolute.com/company/careers/, and https://jobs.jobvite.com/absolute/ on July 14, 2026. Absolute now brands publicly as Absolute Security, and its official first-party careers page hands applicants to the public Jobvite board where India openings were visible in Bangalore and Delhi.',
  dryRunFile: 'absolute/jobs.json',
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const FETCH_TIMEOUT_MS = 15000

const createFetchTimeoutSignal = (timeoutMs = FETCH_TIMEOUT_MS) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return undefined

  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/\u00a0/g, ' ')

const stripTags = (value) => decodeHtmlEntities(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/p>/gi, '\n')
  .replace(/<\/li>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')

const normalizeWhitespace = (value) => stripTags(value)
  .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n[ \t]+/g, '\n')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n+/g, '\n')
  .trim()

const firstMatch = (value, patterns) => {
  for (const pattern of patterns) {
    const match = String(value ?? '').match(pattern)
    const normalized = normalizeWhitespace(match?.[1])
    if (normalized) return normalized
  }

  return null
}

const toAbsoluteUrl = (value, baseUrl = JOB_BOARD_URL) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null

  const [city] = normalized.split(',')
  return city?.trim() || null
}

const extractExperienceRequired = (value) => {
  const normalized = normalizeWhitespace(value)
  const match = normalized.match(/\b\d+\s*(?:-\s*\d+|\+)?\s*years\b/i)
  return match ? match[0].replace(/\s+/g, ' ') : null
}

const extractRequiredSkills = (html) => {
  const skills = []

  for (const match of String(html ?? '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
    const skill = normalizeWhitespace(match[1])
    if (skill) skills.push(skill)
  }

  return skills
}

const buildDetailUrl = (jobviteId) => DETAIL_URL_PATTERN.replace('{jobvite_id}', jobviteId)

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)
  const hasLegacyOrCurrentHeroSignal =
    /Absolute Security Cyber Resilience Platform/i.test(normalized)
    || (
      /Detect\.\s*Remediate\.\s*Rehydrate\.\s*Recover\.\s*Autonomously\b/i.test(normalized)
      && /THE AUTONOMOUS CYBER RESILIENCE PLATFORM/i.test(normalized)
      && /We Stop Downtime/i.test(normalized)
    )

  return /<title>\s*Stop Downtime (?:&|&amp;) Business Disruption \| Absolute Security\s*<\/title>/i.test(page)
    && hasLegacyOrCurrentHeroSignal
    && /href=["'](?:https:\/\/www\.absolute\.com)?\/company\/careers\/?["']/i.test(page)
    && /Absolute Security/i.test(normalized)
}

export const extractJobBoardUrl = (html) => {
  const raw = firstMatch(html, [
    /href=["'](https:\/\/jobs\.jobvite\.com\/absolute\/?)["']/i,
  ])

  return raw ? toAbsoluteUrl(raw, JOB_BOARD_URL) : null
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Careers \| Absolute Security\s*<\/title>/i.test(page)
    && /we'?re growing/i.test(normalized)
    && extractJobBoardUrl(page) === JOB_BOARD_URL
}

export const hasOfficialJobBoardSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /Open Positions/i.test(normalized)
    && /Powered by Jobvite/i.test(normalized)
    && /Absolute provides persistent endpoint security/i.test(normalized)
    && /href=["'][^"']*\/absolute\/job\/[^"']+["']/i.test(page)
}

export const extractJobBoardListings = (html) => {
  const listings = []

  for (const sectionMatch of String(html ?? '').matchAll(
    /<section[^>]*class=["'][^"']*\bcategory\b[^"']*["'][^>]*>([\s\S]*?)<\/section>/gi,
  )) {
    const sectionHtml = sectionMatch[1]
    const department = firstMatch(sectionHtml, [
      /<h3[^>]*>([\s\S]*?)<\/h3>/i,
    ])

    for (const rowMatch of sectionHtml.matchAll(
      /<div[^>]*class=["'][^"']*\bjob-row\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
    )) {
      const rowHtml = rowMatch[1]
      const href = firstMatch(rowHtml, [
        /<a[^>]*href=["']([^"']+)["']/i,
      ])
      const title = firstMatch(rowHtml, [
        /<a[^>]*>([\s\S]*?)<\/a>/i,
      ])
      const location = firstMatch(rowHtml, [
        /<span[^>]*class=["'][^"']*\bjob-location\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
      ])

      if (!href || !title || !location || !/,\s*India$/i.test(location)) continue

      const detailUrl = toAbsoluteUrl(href)
      const jobId = detailUrl?.match(/\/job\/([^/?#]+)/i)?.[1] ?? null
      if (!detailUrl || !jobId) continue

      listings.push({
        title,
        department,
        location,
        city: extractCity(location),
        country: 'India',
        detailUrl,
        jobId,
        requisitionId: jobId,
      })
    }
  }

  for (const tableMatch of String(html ?? '').matchAll(
    /<h3[^>]*class=["'][^"']*\bh2\b[^"']*["'][^>]*>([\s\S]*?)<\/h3>\s*<table[^>]*class=["'][^"']*\bjv-job-list\b[^"']*["'][^>]*>([\s\S]*?)<\/table>/gi,
  )) {
    const department = normalizeWhitespace(tableMatch[1])
    const tableHtml = tableMatch[2]

    for (const rowMatch of tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const rowHtml = rowMatch[1]
      const nameCell = rowHtml.match(
        /<td[^>]*class=["'][^"']*\bjv-job-list-name\b[^"']*["'][^>]*>([\s\S]*?)<\/td>/i,
      )?.[1]
      const locationCell = rowHtml.match(
        /<td[^>]*class=["'][^"']*\bjv-job-list-location\b[^"']*["'][^>]*>([\s\S]*?)<\/td>/i,
      )?.[1]
      const href = firstMatch(nameCell, [
        /<a[^>]*href=["']([^"']+)["']/i,
      ])
      const title = firstMatch(nameCell, [
        /<a[^>]*>([\s\S]*?)<\/a>/i,
      ])
      const location = normalizeWhitespace(locationCell).replace(/\s*,\s*/g, ', ')

      if (!href || !title || !location || !/,\s*India$/i.test(location)) continue

      const detailUrl = toAbsoluteUrl(href)
      const jobId = detailUrl?.match(/\/job\/([^/?#]+)/i)?.[1] ?? null
      if (!detailUrl || !jobId) continue

      listings.push({
        title,
        department,
        location,
        city: extractCity(location),
        country: 'India',
        detailUrl,
        jobId,
        requisitionId: jobId,
      })
    }
  }

  return listings
}

const extractDescriptionSection = (html) => {
  const source = String(html ?? '')
  const match = source.match(
    /<h3[^>]*>\s*Description\s*<\/h3>([\s\S]*?)(?:<p[^>]*>\s*Powered by Jobvite\s*<\/p>|<\/main>|<\/body>)/i,
  )

  return match?.[1] ?? ''
}

export const extractJobDetail = (html, listing = {}) => {
  const source = String(html ?? '')
  const descriptionHtml = extractDescriptionSection(source)
  const description = normalizeWhitespace(descriptionHtml)
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const detailUrl = listing.detailUrl || buildDetailUrl(listing.jobId)

  return {
    title: firstMatch(source, [
      /<h2[^>]*>([\s\S]*?)<\/h2>/i,
    ]) || listing.title || null,
    company: COMPANY,
    department: firstMatch(source, [
      /<p[^>]*class=["'][^"']*\bjob-meta\b[^"']*["'][^>]*>([A-Za-z][A-Za-z\s,&-]+)\s+[A-Za-z][\s\S]*?India<\/p>/i,
    ]) || listing.department || null,
    location: listing.location || null,
    city: listing.city || null,
    country: listing.country || 'India',
    jobId: listing.jobId || null,
    requisitionId: listing.requisitionId || listing.jobId || null,
    sourceUrl: detailUrl,
    applyUrl: detailUrl,
    employmentType: null,
    experienceRequired: extractExperienceRequired(description),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: extractRequiredSkills(descriptionHtml),
    postingDate: null,
    closingDate: null,
    jobDescription: description,
  }
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: createFetchTimeoutSignal(),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const createAbsoluteScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Absolute verified official homepage no longer matches the trusted first-party surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Absolute verified careers handoff no longer matches the trusted first-party surface')
    }

    const boardUrl = extractJobBoardUrl(careersHtml)
    if (boardUrl !== JOB_BOARD_URL) {
      throw new Error('Absolute verified careers handoff no longer resolves to the trusted Jobvite board')
    }

    const boardHtml = await fetchText(boardUrl)
    if (!hasOfficialJobBoardSignal(boardHtml)) {
      throw new Error('Absolute verified Jobvite board no longer matches the trusted public jobs surface')
    }

    const listings = extractJobBoardListings(boardHtml)
    const jobs = []

    for (const listing of listings) {
      const detailHtml = await fetchText(listing.detailUrl)
      jobs.push(extractJobDetail(detailHtml, listing))
    }

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createAbsoluteScraper(options).run()

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
