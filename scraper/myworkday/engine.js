/**
 * @file Reusable, configurable scraping engine for Workday career sites.
 * @module scraper/myworkday/engine
 */
import { launchBrowser, createOptimizedPage } from '../utils/browser.js'
import { loadConfig } from '../utils/loadConfig.js'
import { normalizeCity } from '../utils/cityNormalizer.js'
import { extractJobDetail } from '../detailExtractors/index.js'
import { isGroupedLocationLabel } from '../../src/utils/jobLocations.js'
import { isJobInPublicLocationScope } from '../../src/utils/publicJobLocationScope.js'
import { extractWorkdayDetailLocations } from './locationDetails.js'

const SELECTORS = {
  cookieAccept: '[data-automation-id="legalNoticeAcceptButton"]',
  jobSection: 'section[data-automation-id="jobResults"]',
  jobList: 'ul[role="list"]',
  jobItem: 'li',
  jobTitle: '[data-automation-id="jobTitle"]',
  jobLocation: '[data-automation-id="locations"] dd',
  jobPostedOn: '[data-automation-id="postedOn"] dd',
  jobClosingDate: '[data-automation-id="timeLeftToApply"] dd',
  nextButton: 'button[aria-label="next"]',
}

const DEFAULT_COUNTRY_FACET_PARAMETER = 'Location_Country'
const WORKDAY_JOBS_API_PAGE_SIZE = 20
const WORKDAY_JOBS_API_RETRY_ATTEMPTS = 3
const WORKDAY_JOBS_API_RETRY_BASE_DELAY_MS = 1000
const WORKDAY_FETCH_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'
const WORKDAY_OUTAGE_TEXT_PATTERNS = [
  /workday is currently unavailable/i,
  /community\.workday\.com\/maintenance-page/i,
]

const WORKDAY_OUTAGE_URL_PATTERNS = [
  /community\.workday\.com\/maintenance-page/i,
  /\/wday\/drs\/outage\b/i,
]

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export class WorkdayUpstreamOutageError extends Error {
  constructor(message, options = {}) {
    super(message, options)
    this.name = 'WorkdayUpstreamOutageError'
    this.softFailure = true
    this.upstreamOutage = true
  }
}

export const hasWorkdayOutageSignal = ({
  title = '',
  html = '',
  url = '',
  responseUrls = [],
} = {}) => {
  const textHaystack = [title, html]
    .filter((value) => typeof value === 'string' && value.trim())
    .join(' ')
  const urlHaystack = [url, ...responseUrls]
    .filter((value) => typeof value === 'string' && value.trim())
    .join(' ')

  return WORKDAY_OUTAGE_TEXT_PATTERNS.some((pattern) => pattern.test(textHaystack))
    || WORKDAY_OUTAGE_URL_PATTERNS.some((pattern) => pattern.test(urlHaystack))
}

const extractHtmlTitle = (html) => html.match(/<title>([^<]+)<\/title>/i)?.[1] || ''

const buildWorkdayOutageError = (source, url, cause = null) => (
  new WorkdayUpstreamOutageError(
    `[${source}] Workday is currently unavailable upstream at ${url}`,
    cause ? { cause } : undefined,
  )
)

const parseWorkdayApiErrorPayload = (bodyText) => {
  try {
    const payload = JSON.parse(bodyText)
    const errorCode = typeof payload?.errorCode === 'string' ? payload.errorCode : ''
    const httpStatus = Number(payload?.httpStatus)

    if (/^HTTP_\d{3}$/i.test(errorCode)) {
      return { errorCode, httpStatus }
    }

    if (Number.isInteger(httpStatus) && httpStatus >= 400) {
      return { errorCode: `HTTP_${httpStatus}`, httpStatus }
    }
  } catch {
    return null
  }

  return null
}

const buildWorkdayApiFailureError = (source, url, payload, cause = null) => (
  new WorkdayUpstreamOutageError(
    `[${source}] Workday jobs API returned ${payload.errorCode} at ${url}`,
    cause ? { cause } : undefined,
  )
)

const probeWorkdaySearchPageForOutage = async (searchUrl) => {
  try {
    const response = await fetch(searchUrl)
    const html = await response.text()

    return hasWorkdayOutageSignal({
      title: extractHtmlTitle(html),
      html,
      url: response.url,
    })
  } catch {
    return false
  }
}

const createWorkdayOutageTracker = (page) => {
  const responseUrls = []

  page.on('response', (response) => {
    const url = response.url()
    if (hasWorkdayOutageSignal({ url })) {
      responseUrls.push(url)
    }
  })

  return { responseUrls }
}

const pageShowsWorkdayOutage = async (page, tracker) => {
  const title = await page.title().catch(() => '')
  const html = await page.content().catch(() => '')

  return hasWorkdayOutageSignal({
    title,
    html,
    url: page.url(),
    responseUrls: tracker?.responseUrls || [],
  })
}

export const buildWorkdaySearchUrl = (baseUrl, locationCountry) => {
  const url = new URL(baseUrl)
  const hasCountryFilter = Array.from(url.searchParams.keys()).some((key) => {
    const normalized = String(key).replace(/_/g, '').toLowerCase()
    return normalized === 'locationcountry'
  })

  if (!hasCountryFilter && locationCountry != null && locationCountry !== '') {
    url.searchParams.set('locationCountry', locationCountry)
  }

  return url.toString()
}

export const buildWorkdayAppliedFacets = (
  baseUrl,
  locationCountry,
  countryFacetParameter = DEFAULT_COUNTRY_FACET_PARAMETER,
) => {
  const url = new URL(baseUrl)
  const appliedFacets = {}
  let hasCountryFacet = false

  for (const [key, value] of url.searchParams.entries()) {
    if (!value) continue

    const normalized = String(key).replace(/_/g, '').toLowerCase()
    const facetKey = normalized === 'locationcountry' ? countryFacetParameter : key
    if (facetKey === countryFacetParameter) {
      hasCountryFacet = true
    }

    appliedFacets[facetKey] = [...(appliedFacets[facetKey] || []), value]
  }

  if (!hasCountryFacet && locationCountry) {
    appliedFacets[countryFacetParameter] = [locationCountry]
  }

  return appliedFacets
}

// Returns the start of "today" in IST as a UTC-midnight Date.
const startOfTodayIST = () => {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const nowIST = new Date(Date.now() + IST_OFFSET_MS)
  return new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate()))
}

// Parses a date string and returns UTC midnight of that calendar date.
const toUTCMidnight = (dateStr) => {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}

// Parses relative/absolute "Posted On" strings into Date objects.
const parsePostedOn = (raw) => {
  if (!raw) return null
  const text = raw.trim().toLowerCase()
  const today = startOfTodayIST()
  const daysAgo = (n) => {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - n)
    return d
  }
  if (/\btoday\b/.test(text)) return daysAgo(0)
  if (/\byesterday\b/.test(text)) return daysAgo(1)
  const relativeMatch = text.match(/(\d+)\s+days?\s+ago/)
  if (relativeMatch) return daysAgo(parseInt(relativeMatch[1], 10))
  if (/30\+/.test(text)) return daysAgo(30)
  const cleaned = raw.replace(/^posted\s+/i, '').trim()
  return toUTCMidnight(cleaned)
}

// Parses absolute closing date strings into Date objects.
const parseClosingDate = (raw) => {
  if (!raw) return null
  const text = raw.trim().toLowerCase()
  if (/no\s+end\s+date|no\s+closing|open/i.test(text)) return null
  const cleaned = raw.replace(/^(ends?|closes?|end\s+date[:\s]*)\s*/i, '').trim()
  return toUTCMidnight(cleaned)
}

// Extracts clean city name or remote keywords from locations.
export const extractCity = (location) => {
  if (!location || location === 'Unknown') return null;
  const loc = location.trim();
  let cityCandidate;
  if (/remote/i.test(loc) || /^virtual\b/i.test(loc)) {
    cityCandidate = 'Remote';
  } else {
    const areaMatch = loc.match(/^(.+?)\s+Area\b/i);
    if (areaMatch) {
      cityCandidate = areaMatch[1].trim();
    } else {
      const commaParts = loc.split(',');
      if (commaParts.length > 1) {
        cityCandidate = /^india$/i.test(commaParts[0].trim())
          ? commaParts[1].trim()
          : commaParts[0].trim();
      } else {
        cityCandidate = loc.replace(/\s*India\s*$/i, '').trim() || loc;
      }
    }
  }
  return normalizeCity(cityCandidate);
};

export const matchesWorkdayLocationPattern = (
  { location, locations = [] } = {},
  locationPattern,
) => {
  if (!locationPattern) return true

  const regex = new RegExp(locationPattern, 'i')
  return [location, ...locations]
    .filter((value) => typeof value === 'string' && value.trim())
    .some((value) => regex.test(value))
}

const hasExplicitIndiaMarker = (value = '') => (
  /(?:^|[\s,(])(?:india|ind)(?:$|[\s,)(-])/i.test(String(value || '').trim())
)

// Keep summary-location filtering conservative: skip detail only when the
// listing is already clearly outside the public India scope.
const isClearlyOutsidePublicIndiaScope = (
  { location, locations = [] } = {},
) => {
  const summaryValues = [location, ...locations]
    .filter((value) => typeof value === 'string' && value.trim())
  const hasIndiaMarker = summaryValues.some((value) => hasExplicitIndiaMarker(value))

  if (summaryValues.length === 0) return false
  if (hasIndiaMarker) return false
  if (summaryValues.some((value) => /remote/i.test(String(value)) && String(value).includes(','))) {
    return true
  }

  const extractedCity = extractCity(location)
  const summaryCity = extractedCity === 'Remote' ? null : extractedCity

  if (isJobInPublicLocationScope({
    location,
    locations,
    city: summaryCity,
  })) {
    return false
  }

  return summaryValues.some((value) => {
    const summary = String(value).trim()
    if (/remote/i.test(summary)) return true
    if (summary.includes(',')) return true
    if (/\barea\b/i.test(summary)) return true
    return false
  })
}

export const shouldFetchWorkdayJobDetail = (
  { location, locations = [] } = {},
  locationPattern,
) => {
  if (!location || location === 'Unknown') return true
  if (isGroupedLocationLabel(location)) return true

  if (locationPattern) {
    return matchesWorkdayLocationPattern({ location, locations }, locationPattern)
  }

  return !isClearlyOutsidePublicIndiaScope({ location, locations })
}

// Extracts alpha-numeric job IDs from detail hyperlinks.
const extractJobId = (link) => {
  const match = link.match(/_([A-Z]{1,5}\d+)(?:\?|$)/)
  return match ? match[1] : null
}

const getSafeWorkdayUrl = (value, baseUrl) => {
  try {
    const base = new URL(baseUrl)
    const url = new URL(value, baseUrl)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    return url.hostname === base.hostname ? url.href.split('?')[0] : null
  } catch {
    return null
  }
}

const emptyDetailPayload = () => ({
  locations: [],
  jobDescription: null,
  minimumQualification: null,
  preferredQualification: null,
  requiredSkills: [],
  experienceRequired: null,
  department: null,
  requisitionId: null,
})

const buildWorkdayJobDetailUrl = (externalPath, detailUrlBase, baseUrl) => {
  if (!externalPath) return null

  const safeBase = detailUrlBase ? detailUrlBase.replace(/\/$/, '') : null
  const candidate = safeBase && externalPath.startsWith('/')
    ? `${safeBase}${externalPath}`
    : new URL(externalPath, detailUrlBase || baseUrl).href

  return getSafeWorkdayUrl(candidate, baseUrl)
}

const isRetryableWorkdayJobsApiError = (error) => {
  if (error instanceof TypeError) return true

  const code = error?.cause?.code || error?.code
  return ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT'].includes(code)
}

const getSetCookieHeaders = (headers) => {
  if (!headers) return []
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie()
  }

  const singleCookie = headers.get?.('set-cookie')
  return singleCookie ? [singleCookie] : []
}

const buildCookieHeader = (setCookies = []) => (
  setCookies
    .map((value) => String(value).split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ')
)

const extractCookieValue = (setCookies = [], cookieName) => (
  setCookies
    .map((value) => value.match(new RegExp(`^${cookieName}=([^;]+)`))?.[1])
    .find(Boolean)
    || null
)

const bootstrapWorkdayJobsApiSession = async ({
  bootstrapUrl,
  jobsApiUrl,
  source = 'workday',
}) => {
  if (!bootstrapUrl) return null

  const response = await fetch(bootstrapUrl, {
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-US',
      'user-agent': WORKDAY_FETCH_USER_AGENT,
    },
  })
  const html = await response.text().catch(() => '')

  if (!response.ok) {
    if (hasWorkdayOutageSignal({
      title: extractHtmlTitle(html),
      html,
      url: response.url,
    })) {
      throw buildWorkdayOutageError(source, bootstrapUrl)
    }

    throw new Error(`HTTP ${response.status} for ${bootstrapUrl}`)
  }

  if (hasWorkdayOutageSignal({
    title: extractHtmlTitle(html),
    html,
    url: response.url,
  })) {
    throw buildWorkdayOutageError(source, bootstrapUrl)
  }

  const setCookies = getSetCookieHeaders(response.headers)
  return {
    bootstrapUrl,
    origin: new URL(jobsApiUrl).origin,
    cookieHeader: buildCookieHeader(setCookies),
    csrfToken: extractCookieValue(setCookies, 'CALYPSO_CSRF_TOKEN'),
  }
}

export const fetchWorkdayJobsApiPage = async ({
  jobsApiUrl,
  bootstrapUrl = null,
  appliedFacets,
  offset,
  limit = WORKDAY_JOBS_API_PAGE_SIZE,
  searchText = '',
  source = 'workday',
  session = null,
}) => {
  let lastError = null
  const workdaySession = session || await bootstrapWorkdayJobsApiSession({
    bootstrapUrl,
    jobsApiUrl,
    source,
  })

  for (let attempt = 1; attempt <= WORKDAY_JOBS_API_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(jobsApiUrl, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'accept-language': 'en-US',
          'content-type': 'application/json',
          'user-agent': WORKDAY_FETCH_USER_AGENT,
          ...(workdaySession?.origin ? { origin: workdaySession.origin } : {}),
          ...(workdaySession?.bootstrapUrl ? { referer: workdaySession.bootstrapUrl } : {}),
          ...(workdaySession?.csrfToken
            ? { 'x-calypso-csrf-token': workdaySession.csrfToken }
            : {}),
          ...(workdaySession?.cookieHeader ? { cookie: workdaySession.cookieHeader } : {}),
        },
        body: JSON.stringify({
          appliedFacets,
          limit,
          offset,
          searchText,
        }),
      })
      const contentType = response.headers?.get?.('content-type') || ''

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '')
        const workdayApiFailure = /json/i.test(contentType)
          ? parseWorkdayApiErrorPayload(bodyText)
          : null

        if (workdayApiFailure) {
          throw buildWorkdayApiFailureError(source, jobsApiUrl, workdayApiFailure)
        }

        if (hasWorkdayOutageSignal({
          title: extractHtmlTitle(bodyText),
          html: bodyText,
          url: response.url,
        })) {
          throw buildWorkdayOutageError(source, jobsApiUrl)
        }

        throw new Error(`HTTP ${response.status} for ${jobsApiUrl}`)
      }

      if (/text\/html/i.test(contentType)) {
        const html = await response.text().catch(() => '')
        if (hasWorkdayOutageSignal({
          title: extractHtmlTitle(html),
          html,
          url: response.url,
        })) {
          throw buildWorkdayOutageError(source, jobsApiUrl)
        }

        throw new Error(`[${source}] Expected JSON from ${jobsApiUrl} but received HTML`)
      }

      return response.json()
    } catch (error) {
      lastError = error

      if (
        attempt >= WORKDAY_JOBS_API_RETRY_ATTEMPTS
        || !isRetryableWorkdayJobsApiError(error)
      ) {
        throw error
      }

      await delay(WORKDAY_JOBS_API_RETRY_BASE_DELAY_MS * (2 ** (attempt - 1)))
    }
  }

  throw lastError
}

export const shouldContinueWorkdayJobsApiPagination = ({
  jobsCount,
  offsetAfterPage,
  payloadTotal,
  pageSize = WORKDAY_JOBS_API_PAGE_SIZE,
}) => {
  if (jobsCount < pageSize) return false
  if (payloadTotal > 0) return offsetAfterPage < payloadTotal
  return true
}

const extractDetailedJobPayload = async (page, jobUrl, config, source) => {
  try {
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('body', {
      timeout: config.jobListingTimeoutMs,
    }).catch(() => null)
    await new Promise((resolve) => setTimeout(resolve, config.pageLoadDelayMs || 1000))
    const html = await page.content()
    return {
      locations: extractWorkdayDetailLocations(html),
      ...(await extractJobDetail({ provider: 'workday', html })),
    }
  } catch (error) {
    console.warn(`  [${source}] Failed to enrich details for ${jobUrl}: ${error.message}`)
    return emptyDetailPayload()
  }
}

// Waits for the job list element to load or confirms a zero jobs count.
const waitForJobsToLoad = async (page, config, source) => {
  try {
    await page.waitForSelector(SELECTORS.jobList, { timeout: config.jobListingTimeoutMs })
    return true
  } catch (waitErr) {
    const jobFoundText = await page.evaluate(() => {
      const el = document.querySelector('[data-automation-id="jobFoundText"]')
      return el ? el.innerText.trim() : null
    }).catch(() => null)
    if (jobFoundText && (jobFoundText.includes('0') || /no\s+jobs/i.test(jobFoundText))) {
      console.log(`  [${source}] 0 jobs found on page (found text: "${jobFoundText}").`)
      return false
    }
    throw new Error(`Job results did not load: ${waitErr.message}`)
  }
}

const runWorkdayJobsApiScraper = async ({
  company,
  baseUrl,
  locationCountry,
  source,
  config,
}) => {
  const countryFacetParameter =
    config.countryFacetParameter || DEFAULT_COUNTRY_FACET_PARAMETER
  const appliedFacets = buildWorkdayAppliedFacets(
    baseUrl,
    locationCountry,
    countryFacetParameter,
  )
  const jobsApiUrl = config.jobsApiUrl
  const detailUrlBase = config.detailUrlBase || baseUrl
  const maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY

  if (!jobsApiUrl) {
    throw new Error(`[${source}] listingStrategy "jobs-api" requires config.jobsApiUrl`)
  }

  let browser
  try {
    browser = await launchBrowser()
    const detailPage = await createOptimizedPage(browser)
    const allJobs = []
    const seenLinks = new Set()
    let offset = 0
    const searchUrl = buildWorkdaySearchUrl(baseUrl, locationCountry)
    const session = await bootstrapWorkdayJobsApiSession({
      bootstrapUrl: searchUrl,
      jobsApiUrl,
      source,
    })

    for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
      let payload
      try {
        payload = await fetchWorkdayJobsApiPage({
          jobsApiUrl,
          bootstrapUrl: searchUrl,
          appliedFacets,
          offset,
          searchText: config.searchText || '',
          source,
          session,
        })
      } catch (error) {
        if (!(error instanceof WorkdayUpstreamOutageError)) {
          const outageDetected = await probeWorkdaySearchPageForOutage(searchUrl)
          if (outageDetected) {
            throw buildWorkdayOutageError(source, searchUrl, error)
          }
        }

        throw error
      }
      const jobs = Array.isArray(payload.jobPostings) ? payload.jobPostings : []

      if (pageNum === 1 && jobs.length === 0) {
        console.log(`  [${source}] 0 jobs found from Workday jobs API.`)
        return []
      }

      console.log(`  [${source}] Scraping page ${pageNum} — ${jobsApiUrl} (offset ${offset})`)
      console.log(`  [${source}] Page ${pageNum}: ${jobs.length} India jobs`)

      for (const job of jobs) {
        const canonicalLink = buildWorkdayJobDetailUrl(job.externalPath, detailUrlBase, baseUrl)
        if (!canonicalLink || seenLinks.has(canonicalLink)) continue

        const location = job.locationsText || 'Unknown'
        if (!shouldFetchWorkdayJobDetail({ location }, config.locationPattern)) {
          continue
        }

        seenLinks.add(canonicalLink)
        const detailPayload = await extractDetailedJobPayload(detailPage, canonicalLink, config, source)
        const detailedLocations = detailPayload.locations

        const workdayJob = {
          jobId: extractJobId(canonicalLink),
          title: job.title,
          company,
          department: detailPayload.department,
          location,
          city: detailedLocations[0] || extractCity(location),
          locations: detailedLocations,
          link: canonicalLink,
          source,
          postedAt: parsePostedOn(job.postedOn),
          closingDate: null,
          jobDescription: detailPayload.jobDescription,
          minimumQualification: detailPayload.minimumQualification,
          preferredQualification: detailPayload.preferredQualification,
          requiredSkills: detailPayload.requiredSkills,
          experienceRequired: detailPayload.experienceRequired,
          requisitionId: detailPayload.requisitionId,
          scrapedAt: new Date().toISOString(),
        }

        if (matchesWorkdayLocationPattern(workdayJob, config.locationPattern)) {
          allJobs.push(workdayJob)
        }
      }

      offset += jobs.length
      if (!shouldContinueWorkdayJobsApiPagination({
        jobsCount: jobs.length,
        offsetAfterPage: offset,
        payloadTotal: payload.total || 0,
      })) {
        break
      }
    }

    return allJobs
  } finally {
    if (browser) await browser.close()
  }
}

// Executes the Puppeteer automation pipeline for any target Workday site.
export const runWorkdayScraper = async (options) => {
  const { company, baseUrl, locationCountry, source, scraperDir } = options
  const config = loadConfig(scraperDir)
  const countryId = Object.prototype.hasOwnProperty.call(config, 'locationCountry')
    ? config.locationCountry
    : (locationCountry || 'c4f78be1a8f14da0ab49ce1162348a5e')
  const currentUrl = buildWorkdaySearchUrl(baseUrl, countryId)

  if (config.listingStrategy === 'jobs-api') {
    return runWorkdayJobsApiScraper({
      company,
      baseUrl,
      locationCountry: countryId,
      source,
      config,
    })
  }

  let browser
  let listingPage = null
  let outageTracker = { responseUrls: [] }
  try {
    browser = await launchBrowser()
    const page = await createOptimizedPage(browser)
    listingPage = page
    outageTracker = createWorkdayOutageTracker(page)
    const detailPage = await createOptimizedPage(browser)
    await page.goto(currentUrl, { waitUntil: 'domcontentloaded' })
    try {
      const cookieBtn = await page.waitForSelector(SELECTORS.cookieAccept, {
        timeout: config.cookieBannerTimeoutMs,
      })
      await cookieBtn.click()
      await new Promise((r) => setTimeout(r, config.cookieBannerTimeoutMs))
    } catch {
      try {
        const fallbackBtn = await page.$(SELECTORS.cookieAccept)
        if (fallbackBtn) {
          await fallbackBtn.click()
          await new Promise((r) => setTimeout(r, config.cookieBannerTimeoutMs))
          console.log(`  [${source}] Cookie banner dismissed via fallback.`)
        } else {
          console.log(`  [${source}] No cookie banner found; proceeding.`)
        }
      } catch (fallbackErr) {
        console.error(`  [${source}] Cookie fallback failed:`, fallbackErr.message)
      }
    }
    const hasJobs = await waitForJobsToLoad(page, config, source)
    if (!hasJobs) return []
    const allJobs = []
    const seenLinks = new Set()
    let hasNextPage = true
    let pageNum = 1
    while (hasNextPage && pageNum <= config.maxPages) {
      const pageUrl = page.url()
      console.log(`  [${source}] Scraping page ${pageNum} — ${pageUrl}`)
      const hasPageJobs = await waitForJobsToLoad(page, config, source)
      if (!hasPageJobs) break
      const jobs = await page
        .$eval(SELECTORS.jobSection, (section, selectors) => {
          const list = section.querySelector(selectors.jobList)
          if (!list) return []
          return Array.from(list.querySelectorAll(selectors.jobItem))
            .map((item) => {
              const titleEl = item.querySelector(selectors.jobTitle)
              const locationEl = item.querySelector(selectors.jobLocation)
              const postedOnEl = item.querySelector(selectors.jobPostedOn)
              const closingDateEl = item.querySelector(selectors.jobClosingDate)
              if (!titleEl) return null
              return {
                title: titleEl.innerText.trim(),
                link: titleEl.href,
                location: locationEl ? locationEl.innerText.trim() : 'Unknown',
                postedOnRaw: postedOnEl ? postedOnEl.innerText.trim() : null,
                closingDateRaw: closingDateEl ? closingDateEl.innerText.trim() : null,
              }
            })
            .filter((job) => job !== null)
        }, SELECTORS)
        .catch(() => [])
      console.log(`  [${source}] Page ${pageNum}: ${jobs.length} India jobs`)
      for (const job of jobs) {
        const canonicalLink = getSafeWorkdayUrl(job.link, baseUrl)
        if (canonicalLink && !seenLinks.has(canonicalLink)) {
          if (!shouldFetchWorkdayJobDetail({ location: job.location }, config.locationPattern)) {
            continue
          }

          seenLinks.add(canonicalLink)
          const detailPayload = await extractDetailedJobPayload(detailPage, canonicalLink, config, source)
          const detailedLocations = isGroupedLocationLabel(job.location)
            ? detailPayload.locations
            : detailPayload.locations
          const workdayJob = {
            jobId: extractJobId(job.link),
            title: job.title,
            company,
            department: detailPayload.department,
            location: job.location,
            city: detailedLocations[0] || extractCity(job.location),
            locations: detailedLocations,
            link: canonicalLink,
            source,
            postedAt: parsePostedOn(job.postedOnRaw),
            closingDate: parseClosingDate(job.closingDateRaw),
            jobDescription: detailPayload.jobDescription,
            minimumQualification: detailPayload.minimumQualification,
            preferredQualification: detailPayload.preferredQualification,
            requiredSkills: detailPayload.requiredSkills,
            experienceRequired: detailPayload.experienceRequired,
            requisitionId: detailPayload.requisitionId,
            scrapedAt: new Date().toISOString(),
          }

          if (matchesWorkdayLocationPattern(workdayJob, config.locationPattern)) {
            allJobs.push(workdayJob)
          }
        }
      }
      const nextBtn = await page.$(SELECTORS.nextButton)
      if (nextBtn) {
        const isDisabled = await page.evaluate(
          (el) => el.disabled || el.getAttribute('aria-disabled') === 'true',
          nextBtn,
        )
        if (!isDisabled) {
          await Promise.all([
            page.evaluate((el) => el.click(), nextBtn),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: config.jobListingTimeoutMs }).catch(() => { }),
          ])
          await new Promise((r) => setTimeout(r, config.pageLoadDelayMs || 2000))
          pageNum++
        } else {
          console.log(`  [${source}] Next button disabled. End of results.`)
          hasNextPage = false
        }
      } else {
        console.log(`  [${source}] No next button. End of results.`)
        hasNextPage = false
      }
    }
    return allJobs
  } catch (err) {
    if (listingPage && await pageShowsWorkdayOutage(listingPage, outageTracker)) {
      throw buildWorkdayOutageError(source, currentUrl, err)
    }

    throw new Error(`[${source}] Scraping failed at ${currentUrl} — ${err.message}`)
  } finally {
    if (browser) await browser.close()
  }
}
