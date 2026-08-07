import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createBrowserFetchSession } from '../../scraper-support/shared/browserFetch.js'
import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { INDEED_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = INDEED_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const INDIA_CAREERS_URL = PROVIDER_METADATA.indiaCareersPage
export const INDIA_JOBS_URL = PROVIDER_METADATA.indiaJobsPage
export const COMPANY_DOMAIN = PROVIDER_METADATA.companyDomain
export const COUNTRY_FILTER = PROVIDER_METADATA.countryFilter
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const shouldUseBrowserFallback = (error) =>
  /HTTP (?:403|429)\b|fetch failed|timed out|timeout|could not connect|und_err_connect_timeout|ssl\/tls secure channel|econnreset|unable to/i
    .test(String(error?.message ?? error ?? ''))

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;|&rsquo;|&#8217;/gi, "'")
  .replace(/&#8211;|&#8212;|&ndash;|&mdash;/gi, '-')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) =>
  decodeHtmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const toAbsoluteUrl = (value, baseUrl = INDIA_JOBS_URL) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  redirect: 'follow',
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  attempts: 1,
  label: SOURCE,
  timeoutMs: 15000,
})

const normalizeLineList = (value) =>
  decodeHtmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|li|ul|ol|p|section|article|h[1-6]|span|a)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .split('\n')
    .map((line) => line.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)

const extractVisibleJobCount = (html) => {
  const normalized = normalizeWhitespace(html)
  const match = normalized.match(/\b(\d+)\s+jobs?\s+at\s+Indeed\b/i)
  if (!match) return null

  const count = Number.parseInt(match[1], 10)
  return Number.isFinite(count) ? count : null
}

const extractJobIdFromUrl = (value) => {
  try {
    const url = new URL(value)
    return url.searchParams.get('jk')
  } catch {
    return null
  }
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase() || ''
  if (!normalized) return null
  if (normalized.includes('full-time')) return 'Full-time'
  if (normalized.includes('part-time')) return 'Part-time'
  if (normalized.includes('contract')) return 'Contract'
  if (normalized.includes('intern')) return 'Internship'
  return normalizeWhitespace(value)
}

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (/^remote$/i.test(normalized)) return 'Remote, India'
  if (/,?\s*India$/i.test(normalized)) return normalized
  return `${normalized}, India`
}

const deriveCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized || /^remote\b/i.test(normalized)) return null

  return normalizeCity(normalized.split(',')[0]?.trim()) || null
}

const inferRemoteStatus = (location) => {
  const normalized = normalizeWhitespace(location)?.toLowerCase() || ''
  if (normalized.includes('hybrid')) return 'Hybrid'
  if (normalized.includes('remote')) return 'Remote'
  return 'On-site'
}

const normalizeJobUrl = (value) => {
  const url = toAbsoluteUrl(value, INDIA_JOBS_URL)
  const jobId = extractJobIdFromUrl(url)

  if (!url || !jobId) return null

  try {
    const parsed = new URL(url)
    if (parsed.hostname !== 'in.indeed.com') return null
    if (parsed.pathname !== '/viewjob') return null
    return `https://in.indeed.com/viewjob?jk=${jobId}`
  } catch {
    return null
  }
}

export const hasOfficialCareersSignal = (html) => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('We help people get jobs.')
    && normalized.includes('Opportunities around the globe')
    && normalized.includes('Choose a location to search for open roles at Indeed.')
    && extractIndiaCareersUrl(html) === INDIA_CAREERS_URL
}

export const extractIndiaCareersUrl = (html) => {
  for (const match of String(html ?? '').matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = toAbsoluteUrl(match[1], CAREERS_URL)
    const text = normalizeWhitespace(match[2])?.toLowerCase() || ''

    if (text === 'india' && href) {
      return href
    }
  }

  return null
}

export const extractIndiaJobsUrl = (html) => {
  for (const match of String(html ?? '').matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = toAbsoluteUrl(match[1], INDIA_CAREERS_URL)
    const text = normalizeWhitespace(match[2])?.toLowerCase() || ''

    if (href === INDIA_JOBS_URL) return href
    if (text === 'work at indeed' && href === INDIA_JOBS_URL) return href
  }

  return null
}

export const hasIndiaJobsSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Indeed Jobs and Careers \| Indeed\.com\s*<\/title>/i.test(page)
    && normalized.includes('Indeed Jobs')
    && /\b\d+\s+jobs?\s+at\s+Indeed\b/i.test(normalized)
    && normalized.includes('Work at Indeed')
}

export const pageIndicatesCloudflareChallenge = (html) => {
  const normalized = normalizeWhitespace(html)
  const page = String(html ?? '')

  return /<title>\s*Security Check - Indeed\.com\s*<\/title>/i.test(page)
    || normalized.includes('Additional Verification Required')
    || page.includes('PAGE_TYPE:"captcha"')
    || page.includes("PAGE_TYPE:'captcha'")
    || /<title>\s*Just a moment\.\.\.\s*<\/title>/i.test(page)
    || normalized.includes('Verification successful. Waiting for')
    || normalized.includes('Cloudflare Ray ID')
}

export const extractPublicJobsFromIndiaJobsPage = (
  html,
  { scrapedAt = new Date().toISOString() } = {},
) => {
  const listings = []
  const seenJobIds = new Set()

  for (const match of String(html ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    const blockHtml = match[1]
    const linkMatch = blockHtml.match(/<a[^>]+href=["']([^"']*\/viewjob\?jk=[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i)
    if (!linkMatch) continue

    const sourceUrl = normalizeJobUrl(linkMatch[1])
    const title = normalizeWhitespace(linkMatch[2])
    const jobId = extractJobIdFromUrl(sourceUrl)

    if (!sourceUrl || !title || !jobId || seenJobIds.has(jobId)) continue

    const lines = normalizeLineList(blockHtml).filter((line) => line !== title)
    const locationLine = lines.find((line) => /^remote$/i.test(line) || /,\s*[A-Za-z]/.test(line)) || null
    const compensation = lines.find((line) => /(?:₹|INR|Rs\.?).*(?:a year|per year|a month|per month)/i.test(line)) || null
    const employmentType = normalizeEmploymentType(
      lines.find((line) => /\b(full-time|part-time|contract|internship|temporary)\b/i.test(line)) || null,
    )
    const location = normalizeLocation(locationLine)

    seenJobIds.add(jobId)
    listings.push({
      title,
      company: COMPANY,
      location,
      city: deriveCity(location),
      country: COUNTRY_FILTER,
      jobId,
      requisitionId: null,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: inferRemoteStatus(location),
      compensation: compensation ? normalizeWhitespace(compensation) : null,
      source: SOURCE,
      link: sourceUrl,
      scrapedAt,
    })
  }

  return listings
}

export const createIndeedScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, fetchBrowserText } = {}) {
    let browserSession = null

    const getBrowserSession = async () => {
      if (!browserSession) {
        browserSession = await createBrowserFetchSession({
          userAgent: USER_AGENT,
          timeoutMs: 90000,
          settleTimeMs: 20000,
        })
      }

      return browserSession
    }

    const browserTextFetcher = fetchBrowserText || (async (url) => {
      const session = await getBrowserSession()
      const page = await session.fetchPage(url)

      if ([200, 304].includes(page.status) || pageIndicatesCloudflareChallenge(page.html)) {
        return page.html
      }

      throw new Error(`HTTP ${page.status} for ${url}`)
    })

    const fetchTextWithBrowserFallback = async (url) => {
      try {
        return await fetchText(url)
      } catch (error) {
        if (!shouldUseBrowserFallback(error)) {
          throw error
        }

        return browserTextFetcher(url)
      }
    }

    try {
      const careersHtml = await fetchTextWithBrowserFallback(CAREERS_URL)
      if (pageIndicatesCloudflareChallenge(careersHtml)) {
        const indiaCareersHtml = await fetchTextWithBrowserFallback(INDIA_CAREERS_URL)
        const jobsHtml = await fetchTextWithBrowserFallback(INDIA_JOBS_URL)

        if (pageIndicatesCloudflareChallenge(indiaCareersHtml) && pageIndicatesCloudflareChallenge(jobsHtml)) {
          return []
        }

        throw new Error('Indeed verified first-party careers routes no longer match a consistent all-challenge state')
      }

      if (!hasOfficialCareersSignal(careersHtml)) {
        throw new Error('Indeed verified careers handoff no longer matches the known first-party surface')
      }

      const indiaCareersHtml = await fetchTextWithBrowserFallback(INDIA_CAREERS_URL)
      if (pageIndicatesCloudflareChallenge(indiaCareersHtml)) {
        const jobsHtml = await fetchTextWithBrowserFallback(INDIA_JOBS_URL)
        if (pageIndicatesCloudflareChallenge(jobsHtml)) {
          return []
        }

        throw new Error('Indeed verified India handoff no longer matches the current challenge-gated state')
      }

      if (extractIndiaJobsUrl(indiaCareersHtml) !== INDIA_JOBS_URL) {
        throw new Error('Indeed verified careers handoff no longer resolves to the known India jobs page')
      }

      const jobsHtml = await fetchTextWithBrowserFallback(INDIA_JOBS_URL)
      if (pageIndicatesCloudflareChallenge(jobsHtml)) {
        return []
      }
      if (!hasIndiaJobsSignal(jobsHtml)) {
        throw new Error('Indeed verified India jobs page no longer matches the known first-party surface')
      }

      const jobs = extractPublicJobsFromIndiaJobsPage(jobsHtml, { scrapedAt: now() })
      const visibleJobCount = extractVisibleJobCount(jobsHtml)

      if (jobs.length === 0 && visibleJobCount > 0) {
        throw new Error('Indeed India jobs page no longer exposes parseable public job detail links')
      }

      return jobs
    } finally {
      if (browserSession) {
        await browserSession.close().catch(() => {})
      }
    }
  },
})

export const run = async (options = {}) => createIndeedScraper().run(options)

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
