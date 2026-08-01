import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getValidIndiaCityForJob } from '../../src/utils/publicJobLocationScope.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'coinbase'
export const COMPANY = 'Coinbase'
export const CAREERS_URL = 'https://www.coinbase.com/careers/positions'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) =>
  normalizeWhitespace(
    String(value ?? '')
      .replace(/<(br|\/p|\/div|\/section|\/article|\/li|\/ul|\/ol|\/h[1-6])\b[^>]*>/gi, '\n')
      .replace(/<(p|div|section|article|li|ul|ol|h[1-6])\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )

const extractTextLines = (value) =>
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/section|\/article|\/li|\/ul|\/ol|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<(p|div|section|article|li|ul|ol|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)

const normalizeLocationLabel = (value) => normalizeWhitespace(value)

const inferRemoteStatus = (value) => {
  const normalized = normalizeLocationLabel(value)?.toLowerCase() || ''
  if (!normalized) return 'On-site'
  if (normalized.includes('hybrid')) return 'Hybrid'
  if (normalized.includes('remote')) return 'Remote'
  return 'On-site'
}

const looksLikeIndiaLocation = (value) => Boolean(
  getValidIndiaCityForJob({ location: normalizeLocationLabel(value) }),
)

const deriveCity = (location) => {
  const scopedCity = getValidIndiaCityForJob({ location })
  if (scopedCity) return scopedCity

  const firstToken = normalizeLocationLabel(location)?.split(',')[0]?.trim()
  return normalizeCity(firstToken || location)
}

const extractJobIdFromUrl = (value) => {
  const match = normalizeCoinbaseJobUrl(value)?.match(/\/(\d+)$/)
  return match ? Number.parseInt(match[1], 10) : null
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Positions\s*-\s*Careers\s*-\s*Coinbase\s*<\/title>/i.test(page)
    && /<h1[^>]*>\s*Open positions\s*<\/h1>/i.test(page)
    && /Submit a general application/i.test(page)
}

export const normalizeCoinbaseJobUrl = (value) => {
  if (!value) return null

  try {
    const url = new URL(value, CAREERS_URL)
    const normalizedHost = url.hostname.replace(/^www\./i, '').toLowerCase()
    const pathnameMatch = url.pathname.replace(/\/+$/, '').match(/^\/careers\/positions\/(\d+)$/i)

    if (normalizedHost !== 'coinbase.com' || !pathnameMatch) return null

    return `https://www.coinbase.com/careers/positions/${pathnameMatch[1]}`
  } catch {
    return null
  }
}

const extractSectionBlocks = (html) => {
  const sections = [...String(html ?? '').matchAll(/<section\b[^>]*>([\s\S]*?)<\/section>/gi)]
    .map((match) => match[1])

  return sections.length > 0 ? sections : [String(html ?? '')]
}

const extractSectionDepartment = (sectionHtml) =>
  stripTags(sectionHtml.match(/<h[2-6][^>]*>([\s\S]*?)<\/h[2-6]>/i)?.[1])

export const extractIndiaJobCardsFromCareersPage = (html) => {
  const jobs = []

  for (const sectionHtml of extractSectionBlocks(html)) {
    const department = extractSectionDepartment(sectionHtml)

    for (const match of String(sectionHtml).matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      const [, href, anchorHtml] = match
      const lines = extractTextLines(anchorHtml)
      const title = lines[0] || null
      const location = lines.slice(1).find(Boolean) || null
      const sourceUrl = normalizeCoinbaseJobUrl(href)
      const isIndiaRole = looksLikeIndiaLocation(location)

      if (isIndiaRole && !sourceUrl) {
        throw new Error('Coinbase careers page no longer exposes the verified first-party Coinbase detail URLs')
      }

      if (!title || !location || !sourceUrl || !isIndiaRole) continue

      jobs.push({
        title,
        location,
        department,
        sourceUrl,
        jobId: extractJobIdFromUrl(sourceUrl),
      })
    }
  }

  return jobs
}

const extractDetailTitle = (html) => stripTags(
  String(html ?? '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1],
)

const extractDetailLocation = (html) => stripTags(
  String(html ?? '').match(/<h1[^>]*>[\s\S]*?<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>/i)?.[1],
)

const extractRequisitionId = (html) =>
  normalizeWhitespace(
    String(html ?? '').match(/Job ID#:\s*(?:<\/span>\s*<span[^>]*>)?([^<\n]+)/i)?.[1],
  )

const extractGreenhouseApplyUrl = (html) =>
  normalizeWhitespace(
    String(html ?? '').match(
      /<a[^>]+href=["'](https:\/\/(?:job-boards\.)?greenhouse\.io\/[^"']+)["'][^>]*>\s*Apply now\s*<\/a>/i,
    )?.[1],
  )

const extractJobDescription = (html) => {
  const sectionHtml = String(html ?? '').match(
    /<section[^>]+data-role=["']job-description["'][^>]*>([\s\S]*?)<\/section>/i,
  )?.[1]

  if (sectionHtml) return stripTags(sectionHtml)

  const fallbackHtml = String(html ?? '').match(
    /Apply now\s*<\/a>([\s\S]*?)Job ID#:/i,
  )?.[1]

  return stripTags(fallbackHtml)
}

const hasOfficialJobDetailSignal = (html) => {
  const page = String(html ?? '')

  return /Coinbase/i.test(page)
    && /Back to jobs/i.test(page)
    && /Apply now/i.test(page)
    && /Job ID#:/i.test(page)
}

const extractJobDetail = (html, listing = {}) => {
  if (!hasOfficialJobDetailSignal(html)) {
    throw new Error('Coinbase job detail page no longer matches the verified first-party Coinbase job detail contract')
  }

  const title = extractDetailTitle(html) || listing.title
  const location = extractDetailLocation(html) || listing.location
  const requisitionId = extractRequisitionId(html)
  const greenhouseApplyUrl = extractGreenhouseApplyUrl(html)
  const jobDescription = extractJobDescription(html)

  if (!title || !location || !requisitionId || !greenhouseApplyUrl) {
    throw new Error('Coinbase job detail page no longer matches the verified first-party Coinbase job detail contract')
  }

  return {
    title,
    location,
    requisitionId,
    greenhouseApplyUrl,
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

export const createCoinbaseScraper = ({
  maxJobs = null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Coinbase careers page no longer matches the verified official Coinbase careers surface')
    }

    const listings = extractIndiaJobCardsFromCareersPage(careersHtml)
    const selectedListings = Number.isFinite(maxJobs) ? listings.slice(0, maxJobs) : listings

    const jobs = []
    for (const listing of selectedListings) {
      const detail = extractJobDetail(await fetchText(listing.sourceUrl), listing)
      const remoteStatus = inferRemoteStatus(detail.location)

      jobs.push({
        title: detail.title,
        company: COMPANY,
        location: detail.location,
        city: deriveCity(detail.location),
        country: 'India',
        link: listing.sourceUrl,
        applyUrl: listing.sourceUrl,
        sourceUrl: listing.sourceUrl,
        source: SOURCE,
        jobId: listing.jobId,
        requisitionId: detail.requisitionId,
        department: listing.department,
        employmentType: null,
        experienceRequired: null,
        jobDescription: detail.jobDescription,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        remoteStatus,
        scrapedAt: now(),
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createCoinbaseScraper(options).run(options)

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
