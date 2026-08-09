import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createBrowserFetchSession } from '../../scraper-support/shared/browserFetch.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'
import NUTANIX_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = NUTANIX_CATALOG.source
export const COMPANY = NUTANIX_CATALOG.companyName
export const OFFICIAL_CAREERS_URL = NUTANIX_CATALOG.companyCareerPage
export const JOBVITE_HOME_URL = NUTANIX_CATALOG.officialCareersHandoffUrl
export const JOB_LISTINGS_URL = NUTANIX_CATALOG.jobListingsPageUrl
export const DETAIL_URL_PATTERN = 'https://jobs.jobvite.com/nutanix/job/{jobvite_id}'
export const VERIFIED_AT = NUTANIX_CATALOG.verifiedOn
export const PROVIDER_METADATA = NUTANIX_CATALOG

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const INDIA_SIGNAL_PATTERN =
  /\b(india|bangalore|bengaluru|pune|mumbai|delhi|gurugram|gurgaon|noida|hyderabad|chennai)\b/i

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/\u00a0/g, ' ')
  .replace(/Â/g, '')
  .replace(/â€™/g, "'")
  .replace(/â€œ|â€/g, '"')
  .replace(/â€“|â€”|âˆ’/g, '-')

const stripTags = (value) => decodeHtmlEntities(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/p>/gi, '\n')
  .replace(/<\/li>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')

const normalizeWhitespace = (value) => stripTags(value)
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

const toAbsoluteUrl = (value, baseUrl = JOBVITE_HOME_URL) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const buildDetailUrl = (jobviteId) => DETAIL_URL_PATTERN.replace('{jobvite_id}', jobviteId)

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  if (/^\d+\s+locations?$/i.test(normalized)) return null

  const city = normalizeCity(normalized.split(',')[0] || normalized)
  return /\bindia\b/i.test(normalized)
    ? normalized.replace(/\s*,\s*/g, ', ')
    : `${city}, India`
}

const isIndiaSignal = (value) => INDIA_SIGNAL_PATTERN.test(normalizeWhitespace(value) || '')

const extractExperienceRequired = (value) => {
  const normalized = normalizeWhitespace(value)
  const match = normalized.match(/\b\d+\+?(?:\s*-\s*\d+)?\s*(?:years?|Years?|yrs?)\b/)
  return match ? match[0].replace(/\s+/g, ' ') : null
}

const extractRequiredSkills = (html) => [...String(html ?? '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => normalizeWhitespace(match[1]))
  .filter(Boolean)

const extractMetaHtml = (html) => {
  const match = String(html ?? '').match(
    /<p[^>]*class=["'][^"']*\bjv-job-detail-meta\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i,
  )
  return match?.[1] ?? ''
}

const parseMetaText = (metaHtml) => normalizeWhitespace(
  String(metaHtml ?? '').replace(/<span[^>]*class=["'][^"']*\bjv-inline-separator\b[^"']*["'][^>]*><\/span>/gi, ' | '),
)

const extractMetaLocations = (metaText) => [...String(metaText ?? '').matchAll(/([A-Za-z][A-Za-z .'-]+,\s*India)/gi)]
  .map((match) => normalizeWhitespace(match[1]).replace(/\s*,\s*/g, ', '))
  .filter(Boolean)

const extractRequisitionId = (metaText, fallback) =>
  firstMatch(metaText, [
    /Req\.Num\.:\s*([A-Za-z0-9-]+)/i,
  ]) || fallback || null

const extractDepartment = (metaText, fallback) => {
  const segments = String(metaText ?? '')
    .split('|')
    .map((segment) => normalizeWhitespace(segment))
    .filter(Boolean)

  const candidate = segments.find((segment) => !isIndiaSignal(segment) && !/^Req\.Num\.:/i.test(segment))
  return candidate || fallback || null
}

const extractDescriptionSection = (html) => {
  const source = String(html ?? '')
  const match = source.match(
    /<div[^>]*class=["'][^"']*\bjv-job-detail-description\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*(?:<div class="eoe">|<div class="jv-job-detail-bottom-actions">|<\/article>)/i,
  )

  return match?.[1] ?? ''
}

export const hasOfficialCareersSurfaceSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)
  const hasLegacySignal =
    /careers\.nutanix\.com/i.test(page)
    && /\b(search all jobs|open vacancies|our people power nutanix)\b/i.test(normalized)
  const hasCurrentBoardSignal =
    /<title>\s*Find your place at Nutanix\.\s*\|\s*Nutanix Careers\s*<\/title>/i.test(page)
    && /class=["'][^"']*\bjs-template-jobBoard\b/i.test(page)
    && /Job Seeker Alert: Fraudulent Activity/i.test(normalized)
    && /Current Openings|Life At Nutanix/i.test(normalized)

  return hasLegacySignal || hasCurrentBoardSignal
}

export const isCloudflareChallengePage = (html) => {
  const page = String(html ?? '')
  return /<title>\s*Just a moment\.\.\.\s*<\/title>/i.test(page)
    && /Enable JavaScript and cookies to continue/i.test(page)
    && /careers\.nutanix\.com/i.test(page)
}

export const hasJobviteHomeSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Nutanix Careers\s*<\/title>/i.test(page)
    && /Powered by Jobvite/i.test(normalized)
    && /href=["']https:\/\/careers\.nutanix\.com\/en\/jobs\/["']/i.test(page)
    && /Life At Nutanix/i.test(normalized)
}

export const extractOfficialCareersUrlFromJobviteHome = (html) => {
  const raw = firstMatch(html, [
    /href=["'](https:\/\/careers\.nutanix\.com\/en\/jobs\/)["']/i,
  ])

  return raw || null
}

export const hasJobListingsSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /Featured Jobs/i.test(normalized)
    && /Open Positions/i.test(normalized)
    && /href=["'][^"']*\/nutanix\/job\/[^"']+["']/i.test(page)
}

export const extractJobListings = (html) => {
  const listings = []

  for (const sectionMatch of String(html ?? '').matchAll(
    /<h3[^>]*class=["'][^"']*\bh2\b[^"']*["'][^>]*>([\s\S]*?)<\/h3>\s*<table[^>]*class=["'][^"']*\bjv-job-list\b[^"']*["'][^>]*>([\s\S]*?)<\/table>/gi,
  )) {
    const department = normalizeWhitespace(sectionMatch[1])
    const tableHtml = sectionMatch[2]

    for (const rowMatch of tableHtml.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)) {
      const rowHtml = rowMatch[1]
      const href = firstMatch(rowHtml, [
        /<a[^>]*href=["']([^"']+)["']/i,
      ])
      const title = firstMatch(rowHtml, [
        /<a[^>]*>([\s\S]*?)<\/a>/i,
      ])
      const rawLocation = firstMatch(rowHtml, [
        /<td[^>]*class=["'][^"']*\bjv-job-list-location\b[^"']*["'][^>]*>([\s\S]*?)<\/td>/i,
      ])

      if (!href || !title) continue
      if (!isIndiaSignal(title) && !isIndiaSignal(rawLocation)) continue

      const detailUrl = toAbsoluteUrl(href, JOBVITE_HOME_URL)
      const jobId = detailUrl?.match(/\/job\/([^/?#]+)/i)?.[1] ?? null
      if (!detailUrl || !jobId) continue

      const location = normalizeLocation(rawLocation)
      listings.push({
        title,
        department,
        location,
        city: location ? normalizeCity(location.split(',')[0]) : null,
        country: 'India',
        detailUrl,
        jobId,
        requisitionId: jobId,
      })
    }
  }

  return listings
}

export const extractJobDetail = (html, listing = {}) => {
  const source = String(html ?? '')
  const metaHtml = extractMetaHtml(source)
  const metaText = parseMetaText(metaHtml)
  const detailUrl = listing.detailUrl || buildDetailUrl(listing.jobId)
  const descriptionHtml = extractDescriptionSection(source)
  const description = normalizeWhitespace(descriptionHtml)
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const metaLocations = extractMetaLocations(metaText)
  const location = metaLocations.length
    ? metaLocations.join(' | ')
    : (listing.location || null)
  const city = metaLocations.length
    ? normalizeCity(metaLocations[0].split(',')[0])
    : (listing.city || null)
  const applyUrl = toAbsoluteUrl(firstMatch(source, [
    /<a[^>]*class=["'][^"']*\bjv-button-apply\b[^"']*["'][^>]*href=["']([^"']+)["']/i,
  ]), JOBVITE_HOME_URL) || detailUrl

  return {
    title: firstMatch(source, [
      /<h2[^>]*class=["'][^"']*\bjv-header\b[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i,
      /<h2[^>]*>([\s\S]*?)<\/h2>/i,
    ]) || listing.title || null,
    company: COMPANY,
    department: extractDepartment(metaText, listing.department),
    location,
    city,
    country: metaLocations.length ? 'India' : (listing.country || 'India'),
    jobId: listing.jobId || null,
    requisitionId: extractRequisitionId(metaText, listing.requisitionId || listing.jobId),
    sourceUrl: detailUrl,
    applyUrl,
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

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  redirect: 'follow',
  attempts: 3,
  baseDelayMs: 2000,
  timeoutMs: 20000,
  label: SOURCE,
})

const isBrowserFallbackError = (error) =>
  /HTTP (?:403|429)\b|fetch failed|timed out|timeout|could not connect|und_err_connect_timeout|ssl\/tls secure channel|econnreset|unable to/i
    .test(String(error?.message ?? error ?? ''))

const buildBlockedPublicSurfaceError = (surfaceLabel, error) => {
  const upstreamError = new Error(
    `Nutanix verified ${surfaceLabel} remains blocked after HTTP fallback`,
    { cause: error },
  )
  upstreamError.softFailure = true
  upstreamError.upstreamOutage = true
  upstreamError.failureKind = 'network_or_timeout'
  upstreamError.abortRetries = true
  return upstreamError
}

export const createNutanixScraper = ({
  now: defaultNow = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, fetchBrowserText, now = defaultNow } = {}) {
    let browserSession = null

    const getBrowserSession = async () => {
      if (!browserSession) {
        browserSession = await createBrowserFetchSession({ userAgent: USER_AGENT })
      }

      return browserSession
    }

    const browserTextFetcher = fetchBrowserText || (async (url) => {
      const session = await getBrowserSession()
      return session.fetchText(url)
    })

    const fetchPageText = async (url, surfaceLabel) => {
      try {
        return await fetchText(url)
      } catch (error) {
        if (!isBrowserFallbackError(error)) {
          throw error
        }

        try {
          return await browserTextFetcher(url)
        } catch (browserError) {
          if (isBrowserFallbackError(browserError)) {
            throw buildBlockedPublicSurfaceError(surfaceLabel, browserError)
          }
          throw browserError
        }
      }
    }

    try {
      const officialHtml = await fetchPageText(OFFICIAL_CAREERS_URL, 'official careers page')
      if (!isCloudflareChallengePage(officialHtml) && !hasOfficialCareersSurfaceSignal(officialHtml)) {
        throw new Error('Nutanix verified official careers page no longer matches the trusted surface')
      }

      const jobviteHomeHtml = await fetchPageText(JOBVITE_HOME_URL, 'Jobvite home bridge')
      if (!hasJobviteHomeSignal(jobviteHomeHtml)) {
        throw new Error('Nutanix verified Jobvite home no longer matches the trusted public jobs bridge')
      }

      if (extractOfficialCareersUrlFromJobviteHome(jobviteHomeHtml) !== OFFICIAL_CAREERS_URL) {
        throw new Error('Nutanix Jobvite home no longer points back to the verified official current openings page')
      }

      const listingsHtml = await fetchPageText(JOB_LISTINGS_URL, 'Jobvite listings page')
      if (!hasJobListingsSignal(listingsHtml)) {
        throw new Error('Nutanix verified Jobvite listings no longer match the trusted public jobs surface')
      }

      const listings = extractJobListings(listingsHtml)
      const jobs = []

      for (const listing of listings) {
        const detailHtml = await fetchPageText(listing.detailUrl, `Jobvite detail page for ${listing.title || listing.jobId}`)
        jobs.push(extractJobDetail(detailHtml, listing))
      }

      return jobs.map((job) => ({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: now(),
      }))
    } finally {
      if (browserSession) {
        await browserSession.close()
      }
    }
  },
})

export const run = async (options = {}) => createNutanixScraper(options).run(options)

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
