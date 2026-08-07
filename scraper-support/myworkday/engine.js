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

const DEFAULT_COUNTRY_FACET_PARAMETER = 'locationCountry'
const DEFAULT_WORKDAY_DETAIL_FETCH_CONCURRENCY = 4
const DEFAULT_WORKDAY_REQUEST_TIMEOUT_MS = 20 * 1000
const WORKDAY_JOBS_API_PAGE_SIZE = 20
const WORKDAY_JOBS_API_RETRY_ATTEMPTS = 2
const WORKDAY_JOBS_API_RETRY_BASE_DELAY_MS = 1000
const WORKDAY_HOST_FAILURE_THRESHOLD = 2
const WORKDAY_HOST_CIRCUIT_COOLDOWN_MS = 5 * 60 * 1000
const WORKDAY_AUTHORITATIVE_EMPTY = Symbol.for('jobify.workday.authoritative-empty')
const WORKDAY_DETAIL_FALLBACK = Symbol.for('jobify.workday.detail-fallback')
const WORKDAY_DETAIL_FALLBACK_REASON = Symbol.for('jobify.workday.detail-fallback-reason')
const WORKDAY_COUNTRY_FACET_NORMALIZED = 'locationcountry'
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

const createAuthoritativeWorkdayEmptyResult = () => {
  const jobs = []
  Object.defineProperty(jobs, WORKDAY_AUTHORITATIVE_EMPTY, {
    value: true,
  })
  return jobs
}

const mapWithConcurrency = async (items, concurrency, mapper) => {
  const limit = Math.max(1, Number.parseInt(concurrency, 10) || 1)
  const results = new Array(items.length)
  let nextIndex = 0
  let firstError = null

  const worker = async () => {
    while (!firstError) {
      const currentIndex = nextIndex
      nextIndex += 1

      if (currentIndex >= items.length) return
      try {
        results[currentIndex] = await mapper(items[currentIndex], currentIndex)
      } catch (error) {
        firstError ||= error
        return
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  )

  if (firstError) throw firstError
  return results
}

export const resolveWorkdayDetailFetchConcurrency = (
  envValue = process.env.WORKDAY_DETAIL_FETCH_CONCURRENCY,
  configValue = null,
) => {
  const parsedEnvValue = Number.parseInt(envValue, 10)
  if (Number.isFinite(parsedEnvValue) && parsedEnvValue > 0) {
    return parsedEnvValue
  }

  const parsedConfigValue = Number.parseInt(configValue, 10)
  if (Number.isFinite(parsedConfigValue) && parsedConfigValue > 0) {
    return parsedConfigValue
  }

  return DEFAULT_WORKDAY_DETAIL_FETCH_CONCURRENCY
}

export class WorkdayUpstreamOutageError extends Error {
  constructor(message, options = {}) {
    super(message, options)
    this.name = 'WorkdayUpstreamOutageError'
    this.softFailure = true
    this.upstreamOutage = true
    this.abortRetries = true
    this.failureKind = 'network_or_timeout'
  }
}

export class WorkdayRequestTimeoutError extends Error {
  constructor(source, url, timeoutMs) {
    super(`[${source}] Workday request timed out after ${timeoutMs}ms at ${url}`)
    this.name = 'WorkdayRequestTimeoutError'
    this.softFailure = true
    this.upstreamOutage = true
    this.abortRetries = true
    this.failureKind = 'network_or_timeout'
    this.requestTimeoutMs = timeoutMs
  }
}

export class WorkdayHostCircuitOpenError extends Error {
  constructor(source, url, retryAt) {
    super(`[${source}] Workday host circuit is open for ${new URL(url).origin} until ${new Date(retryAt).toISOString()}`)
    this.name = 'WorkdayHostCircuitOpenError'
    this.softFailure = true
    this.upstreamOutage = true
    this.abortRetries = true
    this.failureKind = 'workday_host_circuit_open'
    this.retryAt = new Date(retryAt)
  }
}

const getWorkdayHostKey = (url) => new URL(url).origin

const isTransientWorkdayError = (error) => {
  if (
    error instanceof WorkdayRequestTimeoutError
    || error instanceof WorkdayUpstreamOutageError
  ) {
    return true
  }

  const status = Number(error?.jobsApiHttpStatus ?? error?.httpStatus)
  if (status === 429 || (status >= 500 && status <= 599)) return true

  const code = error?.cause?.code || error?.code
  return error instanceof TypeError
    || ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT'].includes(code)
}

export class WorkdayHostCircuitBreaker {
  constructor({
    failureThreshold = WORKDAY_HOST_FAILURE_THRESHOLD,
    cooldownMs = WORKDAY_HOST_CIRCUIT_COOLDOWN_MS,
    now = () => Date.now(),
  } = {}) {
    this.failureThreshold = Math.max(1, Number.parseInt(failureThreshold, 10) || 1)
    this.cooldownMs = Math.max(0, Number.parseInt(cooldownMs, 10) || 0)
    this.now = now
    this.hosts = new Map()
  }

  assertRequestAllowed(url, source = 'workday') {
    const key = getWorkdayHostKey(url)
    const state = this.hosts.get(key)
    if (!state?.openUntil) return

    if (state.openUntil <= this.now()) {
      this.hosts.delete(key)
      return
    }

    throw new WorkdayHostCircuitOpenError(source, url, state.openUntil)
  }

  recordFailure(url, error) {
    if (!isTransientWorkdayError(error) || error?.localTimeout === true) return

    const key = getWorkdayHostKey(url)
    const current = this.hosts.get(key) || { failures: 0, openUntil: null }
    const failures = current.failures + 1
    this.hosts.set(key, {
      failures,
      openUntil: failures >= this.failureThreshold
        ? this.now() + this.cooldownMs
        : null,
    })
  }

  recordSuccess(url) {
    this.hosts.delete(getWorkdayHostKey(url))
  }
}

const workdayHostCircuitBreaker = new WorkdayHostCircuitBreaker()

const throwIfAborted = (signal) => {
  if (!signal?.aborted) return
  throw signal.reason || new DOMException('The operation was aborted', 'AbortError')
}

const markWorkdayTransportFailure = (error) => {
  if (!isTransientWorkdayError(error)) return error

  error.softFailure = true
  error.upstreamOutage = true
  error.abortRetries = true
  error.failureKind = error.failureKind || 'network_or_timeout'
  return error
}

const markWorkdayTerminalFailure = (error) => {
  if (error && typeof error === 'object') {
    error.abortRetries = true
  }
  return error
}

const fetchWorkdayResource = async (
  url,
  options = {},
  {
    signal = null,
    timeoutMs = DEFAULT_WORKDAY_REQUEST_TIMEOUT_MS,
    source = 'workday',
  } = {},
  consumeResponse = async (response) => response,
) => {
  throwIfAborted(signal)

  const controller = new AbortController()
  const forwardAbort = () => controller.abort(signal.reason)
  let timeoutId

  if (signal) {
    signal.addEventListener('abort', forwardAbort, { once: true })
  }
  if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      controller.abort(new WorkdayRequestTimeoutError(source, url, timeoutMs))
    }, timeoutMs)
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return await consumeResponse(response)
  } catch (error) {
    if (controller.signal.aborted && controller.signal.reason) {
      throw controller.signal.reason
    }
    throw markWorkdayTransportFailure(error)
  } finally {
    clearTimeout(timeoutId)
    if (signal) {
      signal.removeEventListener('abort', forwardAbort)
    }
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

const getWorkdayApiFailureStatus = (payload = {}) => {
  if (Number.isInteger(payload.httpStatus)) {
    return payload.httpStatus
  }

  const parsed = Number.parseInt(String(payload.errorCode || '').replace(/\D+/g, ''), 10)
  return Number.isFinite(parsed) ? parsed : null
}

const buildWorkdayApiFailureError = (source, url, payload, cause = null) => {
  const error = new Error(
    `[${source}] Workday jobs API returned ${payload.errorCode} at ${url}`,
    cause ? { cause } : undefined,
  )
  const httpStatus = getWorkdayApiFailureStatus(payload)

  error.name = 'WorkdayJobsApiError'
  error.workdayJobsApiFailure = true
  error.jobsApiErrorCode = payload.errorCode
  error.jobsApiHttpStatus = httpStatus

  if (httpStatus === 429 || (httpStatus >= 500 && httpStatus <= 599)) {
    error.softFailure = true
    error.upstreamOutage = true
    error.failureKind = 'network_or_timeout'
  } else if (httpStatus >= 400 && httpStatus <= 499) {
    error.abortRetries = true
  }

  return error
}

const buildWorkdayHttpFailureError = (source, url, status) => (
  buildWorkdayApiFailureError(source, url, {
    errorCode: `HTTP_${status}`,
    httpStatus: status,
  })
)

const validateWorkdayJobsApiPayload = (payload, {
  source,
  url,
  offset,
}) => {
  const total = payload?.total
  const jobs = payload?.jobPostings
  const isValidShape = payload
    && typeof payload === 'object'
    && Number.isInteger(total)
    && total >= 0
    && Array.isArray(jobs)
  const hasImpossibleEmptyPage = isValidShape
    && jobs.length === 0
    && offset < total

  if (!isValidShape || hasImpossibleEmptyPage) {
    const error = new Error(
      `[${source}] Workday jobs API returned an invalid success payload at ${url}`,
    )
    error.name = 'WorkdayJobsApiContractError'
    error.abortRetries = true
    error.failureKind = 'parser_or_contract_error'
    throw error
  }

  return payload
}

const shouldFallbackToWorkdayDom = (error) => {
  if (error instanceof WorkdayRequestTimeoutError) {
    return false
  }

  const status = Number(error?.jobsApiHttpStatus)
  return error?.workdayJobsApiFailure === true
    && status >= 400
    && status <= 499
    && ![408, 425].includes(status)
    || (
      error?.upstreamOutage === true
      && isTransientWorkdayError(error)
    )
}

const isWorkdayCountryFacetKey = (key) => (
  String(key).replace(/_/g, '').toLowerCase() === WORKDAY_COUNTRY_FACET_NORMALIZED
)

const isWorkdayLocationFacetKey = (key) => (
  String(key).replace(/_/g, '').toLowerCase().startsWith('location')
)

const hasWorkdayCountryFacetValues = (appliedFacets = {}) => (
  Object.entries(appliedFacets).some(([key, values]) => (
    isWorkdayCountryFacetKey(key)
    && Array.isArray(values)
    && values.length > 0
  ))
)

const hasWorkdayLocationFacetValues = (appliedFacets = {}) => (
  Object.entries(appliedFacets).some(([key, values]) => (
    isWorkdayLocationFacetKey(key)
    && Array.isArray(values)
    && values.length > 0
  ))
)

const removeWorkdayCountryFacets = (appliedFacets = {}) => Object.fromEntries(
  Object.entries(appliedFacets).filter(([key]) => (
    !isWorkdayCountryFacetKey(key)
  )),
)

const removeWorkdayLocationFacets = (appliedFacets = {}) => Object.fromEntries(
  Object.entries(appliedFacets).filter(([key]) => (
    !isWorkdayLocationFacetKey(key)
  )),
)

const shouldRetryWithoutWorkdayCountryFacet = ({
  error,
  retryAttempted,
  locationCountry,
  appliedFacets,
}) => {
  if (retryAttempted || !locationCountry) return false
  if (Number(error?.jobsApiHttpStatus) !== 400) return false

  return hasWorkdayCountryFacetValues(appliedFacets)
}

const shouldRetryWithoutWorkdayLocationFacets = ({
  error,
  retryAttempted,
  appliedFacets,
}) => {
  if (retryAttempted) return false
  if (Number(error?.jobsApiHttpStatus) !== 400) return false

  return hasWorkdayLocationFacetValues(appliedFacets)
}

const probeWorkdaySearchPageForOutage = async (
  searchUrl,
  {
    signal = null,
    requestTimeoutMs = DEFAULT_WORKDAY_REQUEST_TIMEOUT_MS,
    source = 'workday',
  } = {},
) => {
  try {
    const { response, html } = await fetchWorkdayResource(
      searchUrl,
      {},
      {
        signal,
        timeoutMs: requestTimeoutMs,
        source,
      },
      async (response) => ({
        response,
        html: await response.text(),
      }),
    )

    return hasWorkdayOutageSignal({
      title: extractHtmlTitle(html),
      html,
      url: response.url,
    })
  } catch (error) {
    throwIfAborted(signal)
    if (error instanceof WorkdayRequestTimeoutError) throw error
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
  const hasCountryFilter = Array.from(url.searchParams.keys()).some(isWorkdayCountryFacetKey)

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

    if (isWorkdayCountryFacetKey(key)) {
      hasCountryFacet = true
    }

    appliedFacets[key] = [...(appliedFacets[key] || []), value]
  }

  if (!hasCountryFacet && locationCountry) {
    appliedFacets[countryFacetParameter] = [locationCountry]
  }

  return appliedFacets
}

const normalizeWorkdaySummaryText = (value) => {
  if (typeof value !== 'string') return null
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized || null
}

const isLikelyWorkdayRequisitionToken = (value) => {
  const normalized = normalizeWorkdaySummaryText(value)
  if (!normalized) return false
  if (/[,\s]/.test(normalized)) return false

  return /^(?:[A-Z]{1,6}[A-Z0-9_-]*\d[A-Z0-9_-]*|\d{5,})$/i.test(normalized)
}

const extractWorkdayLocationFromBulletFields = (bulletFields = []) => {
  if (!Array.isArray(bulletFields)) return null

  return bulletFields
    .map(normalizeWorkdaySummaryText)
    .find((value) => value && !isLikelyWorkdayRequisitionToken(value))
    || null
}

const extractWorkdayLocationFromExternalPath = (externalPath) => {
  if (!externalPath) return null

  try {
    const pathname = new URL(externalPath, 'https://example.com').pathname
    const pathParts = pathname.split('/').filter(Boolean)
    const jobIndex = pathParts.findIndex((part) => part.toLowerCase() === 'job')
    const candidate = pathParts[jobIndex + 1]
    if (!candidate) return null

    return normalizeWorkdaySummaryText(
      decodeURIComponent(candidate)
        .replace(/---/g, ' - ')
        .replace(/[_+]/g, ' ')
        .replace(/-/g, ' '),
    )
  } catch {
    return null
  }
}

const resolveWorkdaySummaryLocation = (job = {}) => (
  normalizeWorkdaySummaryText(job.locationsText)
  || extractWorkdayLocationFromBulletFields(job.bulletFields)
  || extractWorkdayLocationFromExternalPath(job.externalPath)
  || 'Unknown'
)

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

const extractLeadingCountryCode = (value = '') =>
  String(value || '').trim().match(/^([A-Z]{2,3})\s*-\s*/i)?.[1]?.toUpperCase() || null

// Keep summary-location filtering conservative: skip detail only when the
// listing is already clearly outside the public India scope.
const isClearlyOutsidePublicIndiaScope = (
  { location, locations = [] } = {},
) => {
  const summaryValues = [location, ...locations]
    .filter((value) => typeof value === 'string' && value.trim())
  const hasIndiaMarker = summaryValues.some((value) => hasExplicitIndiaMarker(value))
  const hasIndiaCountryCodePrefix = summaryValues.some((value) => ['IN', 'IND'].includes(extractLeadingCountryCode(value)))
  const hasNonIndiaCountryCodePrefix = summaryValues.some((value) => {
    const countryCode = extractLeadingCountryCode(value)
    return countryCode && !['IN', 'IND'].includes(countryCode)
  })

  if (summaryValues.length === 0) return false
  if (hasIndiaMarker) return false
  if (hasIndiaCountryCodePrefix) return false
  if (hasNonIndiaCountryCodePrefix) return true
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
  postingDate: null,
  department: null,
  requisitionId: null,
})

const createFallbackDetailPayload = (reason = null) => {
  const payload = emptyDetailPayload()
  Object.defineProperty(payload, WORKDAY_DETAIL_FALLBACK, {
    value: true,
  })
  if (reason) {
    Object.defineProperty(payload, WORKDAY_DETAIL_FALLBACK_REASON, {
      value: reason,
    })
  }
  return payload
}

const isUsingFallbackDetailPayload = (payload) => payload?.[WORKDAY_DETAIL_FALLBACK] === true

const getWorkdayDetailFallbackReason = (payload) => (
  payload?.[WORKDAY_DETAIL_FALLBACK_REASON] || null
)

const shouldDisableWorkdayDetailEnrichmentAfterFallback = (detailPayload) => {
  const reason = getWorkdayDetailFallbackReason(detailPayload)
  if (!reason) return false

  const status = Number(reason?.jobsApiHttpStatus ?? reason?.httpStatus)
  return reason instanceof WorkdayRequestTimeoutError
    || reason instanceof WorkdayHostCircuitOpenError
    || status === 403
    || status === 429
}

const maybeDisableWorkdayDetailEnrichment = (detailPayload, detailEnrichmentState, source) => {
  if (
    !isUsingFallbackDetailPayload(detailPayload)
    || detailEnrichmentState.disabled
    || !shouldDisableWorkdayDetailEnrichmentAfterFallback(detailPayload)
  ) {
    return
  }

  detailEnrichmentState.disabled = true
  if (!detailEnrichmentState.noticeLogged) {
    detailEnrichmentState.noticeLogged = true
    console.warn(`  [${source}] Workday detail requests became unstable; continuing with listing-backed data for the remaining jobs on this source.`)
  }
}

const shouldFallbackToListingDataAfterDetailFailure = (error) => {
  const status = Number(error?.jobsApiHttpStatus ?? error?.httpStatus)
  return error instanceof WorkdayRequestTimeoutError
    || error?.upstreamOutage === true
    || isTransientWorkdayError(error)
    || status === 403
}

const resolveWorkdayLocationsFromSummary = (location, detailPayload) => {
  if (detailPayload?.locations?.length > 0) return detailPayload.locations

  const summaryCity = extractCity(location)
  return summaryCity ? [summaryCity] : []
}

const shouldPublishWorkdayListingFallback = ({ location, detailPayload, locations }) => {
  if (!isUsingFallbackDetailPayload(detailPayload)) return true

  const summaryCity = extractCity(location)
  return isJobInPublicLocationScope({
    location,
    locations,
    city: summaryCity === 'Remote' ? null : summaryCity,
  })
}

const isWorkdayJobInPublicIndiaScope = ({ location, locations = [], city = null } = {}) =>
  isJobInPublicLocationScope({
    location,
    locations,
    city: city === 'Remote' ? null : city,
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
  const status = Number(error?.jobsApiHttpStatus)
  return status === 429 || (status >= 500 && status <= 599)
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
  signal = null,
  requestTimeoutMs = DEFAULT_WORKDAY_REQUEST_TIMEOUT_MS,
  circuitBreaker = workdayHostCircuitBreaker,
}) => {
  if (!bootstrapUrl) return null

  circuitBreaker.assertRequestAllowed(jobsApiUrl, source)
  try {
    const { response, html } = await fetchWorkdayResource(
      bootstrapUrl,
      {
        headers: {
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'en-US',
          'user-agent': WORKDAY_FETCH_USER_AGENT,
        },
      },
      {
        signal,
        timeoutMs: requestTimeoutMs,
        source,
      },
      async (response) => ({
        response,
        html: await response.text(),
      }),
    )

    if (!response.ok) {
      if (hasWorkdayOutageSignal({
        title: extractHtmlTitle(html),
        html,
        url: response.url,
      })) {
        throw buildWorkdayOutageError(source, bootstrapUrl)
      }

      throw buildWorkdayHttpFailureError(source, bootstrapUrl, response.status)
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
  } catch (error) {
    circuitBreaker.recordFailure(jobsApiUrl, error)
    throw error
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
  signal = null,
  requestTimeoutMs = DEFAULT_WORKDAY_REQUEST_TIMEOUT_MS,
  retryBaseDelayMs = WORKDAY_JOBS_API_RETRY_BASE_DELAY_MS,
  circuitBreaker = workdayHostCircuitBreaker,
}) => {
  throwIfAborted(signal)
  let lastError = null
  const workdaySession = session || await bootstrapWorkdayJobsApiSession({
    bootstrapUrl,
    jobsApiUrl,
    source,
    signal,
    requestTimeoutMs,
    circuitBreaker,
  })

  for (let attempt = 1; attempt <= WORKDAY_JOBS_API_RETRY_ATTEMPTS; attempt += 1) {
    try {
      throwIfAborted(signal)
      circuitBreaker.assertRequestAllowed(jobsApiUrl, source)

      const {
        response,
        contentType,
        bodyText = '',
        payload = null,
      } = await fetchWorkdayResource(
        jobsApiUrl,
        {
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
        },
        {
          signal,
          timeoutMs: requestTimeoutMs,
          source,
        },
        async (response) => {
          const contentType = response.headers?.get?.('content-type') || ''
          if (!response.ok || /text\/html/i.test(contentType)) {
            return {
              response,
              contentType,
              bodyText: await response.text(),
            }
          }

          return {
            response,
            contentType,
            payload: await response.json(),
          }
        },
      )

      if (!response.ok) {
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

        throw buildWorkdayHttpFailureError(source, jobsApiUrl, response.status)
      }

      if (/text\/html/i.test(contentType)) {
        if (hasWorkdayOutageSignal({
          title: extractHtmlTitle(bodyText),
          html: bodyText,
          url: response.url,
        })) {
          throw buildWorkdayOutageError(source, jobsApiUrl)
        }

        throw new Error(`[${source}] Expected JSON from ${jobsApiUrl} but received HTML`)
      }

      const validatedPayload = validateWorkdayJobsApiPayload(payload, {
        source,
        url: jobsApiUrl,
        offset,
      })
      circuitBreaker.recordSuccess(jobsApiUrl)
      return validatedPayload
    } catch (error) {
      throwIfAborted(signal)
      lastError = error
      circuitBreaker.recordFailure(jobsApiUrl, error)

      if (
        error?.abortRetries === true
        ||
        attempt >= WORKDAY_JOBS_API_RETRY_ATTEMPTS
        || !isRetryableWorkdayJobsApiError(error)
      ) {
        throw markWorkdayTransportFailure(error)
      }

      await delay(retryBaseDelayMs * (2 ** (attempt - 1)))
      throwIfAborted(signal)
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

export const inferWorkdayJobsApiConfig = (baseUrl) => {
  let url
  try {
    url = new URL(baseUrl)
  } catch {
    return null
  }

  const pathParts = url.pathname.split('/').filter(Boolean)
  const apiMarkerIndex = pathParts.findIndex((part, index) => (
    part === 'wday' && pathParts[index + 1] === 'cxs'
  ))

  if (apiMarkerIndex >= 0) {
    const tenant = pathParts[apiMarkerIndex + 2]
    const site = pathParts[apiMarkerIndex + 3]
    if (!tenant || !site || pathParts[apiMarkerIndex + 4] !== 'jobs') return null

    return {
      jobsApiUrl: `${url.origin}/wday/cxs/${tenant}/${site}/jobs`,
      detailUrlBase: `${url.origin}/${site}`,
    }
  }

  let tenant
  let site
  if (/\.myworkdayjobs\.com$/i.test(url.hostname)) {
    tenant = url.hostname.split('.')[0]
    site = pathParts.filter((part) => !/^[a-z]{2}-[a-z]{2}$/i.test(part)).at(-1)
  } else if (/\.myworkdaysite\.com$/i.test(url.hostname)) {
    const recruitingIndex = pathParts.findIndex((part) => part.toLowerCase() === 'recruiting')
    tenant = recruitingIndex >= 0 ? pathParts[recruitingIndex + 1] : null
    site = recruitingIndex >= 0 ? pathParts[recruitingIndex + 2] : null
  }

  if (!tenant || !site) return null

  const detailUrl = new URL(url)
  detailUrl.search = ''
  detailUrl.hash = ''
  return {
    jobsApiUrl: `${url.origin}/wday/cxs/${tenant}/${site}/jobs`,
    detailUrlBase: detailUrl.toString().replace(/\/$/, ''),
  }
}

const fetchDetailedJobPayload = async (
  jobUrl,
  source,
  session = null,
  {
    signal = null,
    requestTimeoutMs = DEFAULT_WORKDAY_REQUEST_TIMEOUT_MS,
    circuitBreaker = workdayHostCircuitBreaker,
  } = {},
) => {
  try {
    throwIfAborted(signal)
    circuitBreaker.assertRequestAllowed(jobUrl, source)
    const { response, html } = await fetchWorkdayResource(
      jobUrl,
      {
        headers: {
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'en-US',
          'user-agent': WORKDAY_FETCH_USER_AGENT,
          ...(session?.bootstrapUrl ? { referer: session.bootstrapUrl } : {}),
          ...(session?.cookieHeader ? { cookie: session.cookieHeader } : {}),
        },
      },
      {
        signal,
        timeoutMs: requestTimeoutMs,
        source,
      },
      async (response) => ({
        response,
        html: await response.text(),
      }),
    )

    if (!response.ok) {
      throw buildWorkdayHttpFailureError(source, jobUrl, response.status)
    }

    circuitBreaker.recordSuccess(jobUrl)
    return {
      locations: extractWorkdayDetailLocations(html),
      ...(await extractJobDetail({ provider: 'workday', html })),
    }
  } catch (error) {
    throwIfAborted(signal)
    circuitBreaker.recordFailure(jobUrl, error)
    if (shouldFallbackToListingDataAfterDetailFailure(error)) {
      console.warn(`  [${source}] Failed to enrich details for ${jobUrl}; keeping listing data when summary location remains safely in scope: ${error.message}`)
      return createFallbackDetailPayload(error)
    }

    if (error?.abortRetries === true) {
      throw markWorkdayTransportFailure(error)
    }

    console.warn(`  [${source}] Failed to enrich details for ${jobUrl}: ${error.message}`)
    return emptyDetailPayload()
  }
}

// Waits for the job list element to load or confirms a zero jobs count.
export const isExplicitWorkdayZeroJobsText = (value) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  return /\b0\s+(?:open\s+)?jobs?\b/i.test(text)
    || /\bno\s+(?:open\s+)?jobs?\b/i.test(text)
}

const waitForJobsToLoad = async (
  page,
  config,
  source,
  {
    signal = null,
    allowReloadRetry = true,
  } = {},
) => {
  try {
    await page.waitForSelector(
      `${SELECTORS.jobSection} ${SELECTORS.jobTitle}`,
      { timeout: config.jobListingTimeoutMs },
    )
    return true
  } catch (waitErr) {
    const jobFoundText = await page.evaluate(() => {
      const el = document.querySelector('[data-automation-id="jobFoundText"]')
      return el ? el.innerText.trim() : null
    }).catch(() => null)
    if (isExplicitWorkdayZeroJobsText(jobFoundText)) {
      console.log(`  [${source}] 0 jobs found on page (found text: "${jobFoundText}").`)
      return false
    }
    if (allowReloadRetry && typeof page?.goto === 'function' && typeof page?.url === 'function') {
      const retryUrl = page.url()
      if (retryUrl) {
        console.warn(`  [${source}] Job results did not hydrate on first load; retrying the Workday page once.`)
        await page.goto(retryUrl, { waitUntil: 'domcontentloaded' })
        await new Promise((resolve) => setTimeout(resolve, config.pageLoadDelayMs || 2000))
        throwIfAborted(signal)
        return waitForJobsToLoad(page, config, source, {
          signal,
          allowReloadRetry: false,
        })
      }
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
  signal = null,
  requestTimeoutMs = DEFAULT_WORKDAY_REQUEST_TIMEOUT_MS,
  retryBaseDelayMs = WORKDAY_JOBS_API_RETRY_BASE_DELAY_MS,
  circuitBreaker = workdayHostCircuitBreaker,
  detailCircuitBreaker = new WorkdayHostCircuitBreaker(),
  detailEnrichmentState = { disabled: false, noticeLogged: false },
}) => {
  throwIfAborted(signal)
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
  let effectiveAppliedFacets = appliedFacets
  let effectiveSearchText = config.searchText || ''
  let retriedWithoutCountryFacet = false
  let retriedWithoutLocationFacets = false

  if (!jobsApiUrl) {
    throw new Error(`[${source}] listingStrategy "jobs-api" requires config.jobsApiUrl`)
  }

  try {
    const allJobs = []
    const seenLinks = new Set()
    let offset = 0
    const searchUrl = buildWorkdaySearchUrl(config.detailUrlBase || baseUrl, locationCountry)
    const session = await bootstrapWorkdayJobsApiSession({
      bootstrapUrl: searchUrl,
      jobsApiUrl,
      source,
      signal,
      requestTimeoutMs,
      circuitBreaker,
    })

    for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
      throwIfAborted(signal)
      let payload
      try {
        payload = await fetchWorkdayJobsApiPage({
          jobsApiUrl,
          bootstrapUrl: searchUrl,
          appliedFacets: effectiveAppliedFacets,
          offset,
          searchText: effectiveSearchText,
          source,
          session,
          signal,
          requestTimeoutMs,
          retryBaseDelayMs,
          circuitBreaker,
        })
      } catch (error) {
        throwIfAborted(signal)
        if (shouldRetryWithoutWorkdayCountryFacet({
          error,
          retryAttempted: retriedWithoutCountryFacet,
          locationCountry,
          appliedFacets: effectiveAppliedFacets,
        })) {
          retriedWithoutCountryFacet = true
          effectiveAppliedFacets = removeWorkdayCountryFacets(
            buildWorkdayAppliedFacets(baseUrl, null, countryFacetParameter),
          )
          effectiveSearchText = config.searchText || 'India'
          console.log(`  [${source}] Workday jobs API rejected the generic country facet; retrying with India search text.`)

          try {
            payload = await fetchWorkdayJobsApiPage({
              jobsApiUrl,
              bootstrapUrl: searchUrl,
              appliedFacets: effectiveAppliedFacets,
              offset,
              searchText: effectiveSearchText,
              source,
              session,
              signal,
              requestTimeoutMs,
              retryBaseDelayMs,
              circuitBreaker,
            })
          } catch (retryError) {
            error = retryError
          }
        }

        if (!payload && shouldRetryWithoutWorkdayLocationFacets({
          error,
          retryAttempted: retriedWithoutLocationFacets,
          appliedFacets: effectiveAppliedFacets,
        })) {
          retriedWithoutLocationFacets = true
          effectiveAppliedFacets = removeWorkdayLocationFacets(
            buildWorkdayAppliedFacets(baseUrl, null, countryFacetParameter),
          )
          effectiveSearchText = config.searchText || 'India'
          console.log(`  [${source}] Workday jobs API rejected the remaining location facets; retrying with India search text only.`)

          try {
            payload = await fetchWorkdayJobsApiPage({
              jobsApiUrl,
              bootstrapUrl: searchUrl,
              appliedFacets: effectiveAppliedFacets,
              offset,
              searchText: effectiveSearchText,
              source,
              session,
              signal,
              requestTimeoutMs,
              retryBaseDelayMs,
              circuitBreaker,
            })
          } catch (retryError) {
            error = retryError
          }
        }

        if (payload) {
          // Continue with the recovered page payload instead of falling back to DOM.
        } else if (
          !(error instanceof WorkdayUpstreamOutageError)
          && error?.upstreamOutage !== true
          && !isTransientWorkdayError(error)
        ) {
          const outageDetected = await probeWorkdaySearchPageForOutage(searchUrl, {
            signal,
            requestTimeoutMs,
            source,
          })
          if (outageDetected) {
            throw buildWorkdayOutageError(source, searchUrl, error)
          }
        }

        if (payload) {
          // no-op
        } else {
          throw error
        }
      }
      const jobs = payload.jobPostings

      if (pageNum === 1 && jobs.length === 0) {
        console.log(`  [${source}] 0 jobs found from Workday jobs API.`)
        return createAuthoritativeWorkdayEmptyResult()
      }

      console.log(`  [${source}] Scraping page ${pageNum} — ${jobsApiUrl} (offset ${offset})`)
      console.log(`  [${source}] Page ${pageNum}: ${jobs.length} India jobs`)

      const pageCandidates = []
      for (const job of jobs) {
        const canonicalLink = buildWorkdayJobDetailUrl(job.externalPath, detailUrlBase, baseUrl)
        if (!canonicalLink || seenLinks.has(canonicalLink)) continue

        const location = resolveWorkdaySummaryLocation(job)
        if (!shouldFetchWorkdayJobDetail({ location }, config.locationPattern)) {
          continue
        }

        seenLinks.add(canonicalLink)
        pageCandidates.push({ job, canonicalLink, location })
      }

      const detailedPageJobs = await mapWithConcurrency(
        pageCandidates,
        resolveWorkdayDetailFetchConcurrency(
          process.env.WORKDAY_DETAIL_FETCH_CONCURRENCY,
          config.detailFetchConcurrency,
        ),
        async ({ job, canonicalLink, location }) => {
          throwIfAborted(signal)
          const detailPayload = detailEnrichmentState.disabled
            ? createFallbackDetailPayload()
            : await fetchDetailedJobPayload(
                canonicalLink,
                source,
                session,
                {
                  signal,
                  requestTimeoutMs,
                  circuitBreaker: detailCircuitBreaker,
                },
              )
          maybeDisableWorkdayDetailEnrichment(detailPayload, detailEnrichmentState, source)
          const detailedLocations = resolveWorkdayLocationsFromSummary(location, detailPayload)

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
            postedAt: parsePostedOn(job.postedOn || detailPayload.postingDate),
            closingDate: null,
            jobDescription: detailPayload.jobDescription,
            minimumQualification: detailPayload.minimumQualification,
            preferredQualification: detailPayload.preferredQualification,
            requiredSkills: detailPayload.requiredSkills,
            experienceRequired: detailPayload.experienceRequired,
            publicExperienceChecked: detailPayload.publicExperienceChecked,
            requisitionId: detailPayload.requisitionId,
            scrapedAt: new Date().toISOString(),
          }

          if (!isWorkdayJobInPublicIndiaScope(workdayJob)) {
            return null
          }

          if (!shouldPublishWorkdayListingFallback({
            location,
            detailPayload,
            locations: detailedLocations,
          })) {
            return null
          }

          return matchesWorkdayLocationPattern(workdayJob, config.locationPattern)
            ? workdayJob
            : null
        },
      )

      allJobs.push(...detailedPageJobs.filter(Boolean))

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
    throwIfAborted(signal)
  }
}

// Executes the Puppeteer automation pipeline for any target Workday site.
export const runWorkdayScraper = async (options) => {
  const { company, baseUrl, locationCountry, source, scraperDir } = options
  const signal = options.signal || null
  const launchBrowserImpl = options.launchBrowserImpl || launchBrowser
  const createOptimizedPageImpl = options.createOptimizedPageImpl || createOptimizedPage
  const config = loadConfig(scraperDir)
  const envRequestTimeoutMs = Number.parseInt(process.env.WORKDAY_REQUEST_TIMEOUT_MS, 10)
  const requestTimeoutMs = [
    Number(options.requestTimeoutMs),
    Number(config.requestTimeoutMs),
    envRequestTimeoutMs,
  ].find((value) => Number.isFinite(value) && value > 0)
    || DEFAULT_WORKDAY_REQUEST_TIMEOUT_MS
  const retryBaseDelayMs = [
    Number(options.retryBaseDelayMs),
    Number(config.retryBaseDelayMs),
  ].find((value) => Number.isFinite(value) && value >= 0)
    ?? WORKDAY_JOBS_API_RETRY_BASE_DELAY_MS
  const circuitBreaker = options.circuitBreaker || workdayHostCircuitBreaker
  const detailCircuitBreaker = options.detailCircuitBreaker || new WorkdayHostCircuitBreaker()
  const detailEnrichmentState = options.detailEnrichmentState || { disabled: false, noticeLogged: false }
  throwIfAborted(signal)

  const countryId = Object.prototype.hasOwnProperty.call(config, 'locationCountry')
    ? config.locationCountry
    : (locationCountry || 'c4f78be1a8f14da0ab49ce1162348a5e')
  const currentUrl = buildWorkdaySearchUrl(baseUrl, countryId)
  const inferredApiConfig = inferWorkdayJobsApiConfig(baseUrl)
  const hasExplicitJobsApiConfig = config.listingStrategy === 'jobs-api'

  if (hasExplicitJobsApiConfig) {
    try {
      return await runWorkdayJobsApiScraper({
        company,
        baseUrl,
        locationCountry: countryId,
        source,
        config,
        signal,
        requestTimeoutMs,
        retryBaseDelayMs,
        circuitBreaker,
        detailCircuitBreaker,
        detailEnrichmentState,
      })
    } catch (error) {
      throwIfAborted(signal)
      if (!shouldFallbackToWorkdayDom(error)) {
        throw markWorkdayTerminalFailure(error)
      }
      console.warn(`  [${source}] Configured Workday jobs API failed; falling back to the DOM listing.`)
    }
  }

  if (!hasExplicitJobsApiConfig && inferredApiConfig) {
    try {
      return await runWorkdayJobsApiScraper({
        company,
        baseUrl,
        locationCountry: countryId,
        source,
        config: {
          ...config,
          ...inferredApiConfig,
          listingStrategy: 'jobs-api',
        },
        signal,
        requestTimeoutMs,
        retryBaseDelayMs,
        circuitBreaker,
        detailCircuitBreaker,
        detailEnrichmentState,
      })
    } catch (error) {
      throwIfAborted(signal)
      if (!shouldFallbackToWorkdayDom(error)) {
        throw markWorkdayTerminalFailure(error)
      }
      console.warn(`  [${source}] Inferred Workday jobs API failed; falling back to the DOM listing.`)
    }
  }

  let browser
  let browserClosePromise = null
  let listingPage = null
  let outageTracker = { responseUrls: [] }
  const closeBrowser = () => {
    if (!browser) return Promise.resolve()
    if (!browserClosePromise) {
      browserClosePromise = Promise.resolve()
        .then(() => browser.close())
        .catch(() => {})
    }
    return browserClosePromise
  }
  const abortBrowser = () => {
    void closeBrowser()
  }
  signal?.addEventListener('abort', abortBrowser, { once: true })

  try {
    throwIfAborted(signal)
    browser = await launchBrowserImpl()
    throwIfAborted(signal)
    const page = await createOptimizedPageImpl(browser)
    listingPage = page
    outageTracker = createWorkdayOutageTracker(page)
    await page.goto(currentUrl, { waitUntil: 'domcontentloaded' })
    throwIfAborted(signal)
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
    throwIfAborted(signal)
    const hasJobs = await waitForJobsToLoad(page, config, source, { signal })
    if (!hasJobs) return createAuthoritativeWorkdayEmptyResult()
    const allJobs = []
    const seenLinks = new Set()
    let hasNextPage = true
    let pageNum = 1
    while (hasNextPage && pageNum <= config.maxPages) {
      throwIfAborted(signal)
      const pageUrl = page.url()
      console.log(`  [${source}] Scraping page ${pageNum} — ${pageUrl}`)
      const hasPageJobs = await waitForJobsToLoad(page, config, source, { signal })
      if (!hasPageJobs) break
      const jobs = await page
        .$eval(SELECTORS.jobSection, (section, selectors) => {
          const cardSelectors = [
            selectors.jobItem,
            '[role="listitem"]',
            '[data-automation-id="jobPostingCard"]',
            '[data-automation-id="jobPosting"]',
          ]
          const resolveJobCard = (titleEl) => {
            for (const selector of cardSelectors) {
              const candidate = titleEl.closest(selector)
              if (!candidate || !section.contains(candidate)) continue
              if (
                candidate.querySelector(selectors.jobLocation)
                || candidate.querySelector(selectors.jobPostedOn)
                || candidate.querySelector(selectors.jobClosingDate)
              ) {
                return candidate
              }
            }

            return titleEl.parentElement && section.contains(titleEl.parentElement)
              ? titleEl.parentElement
              : section
          }

          return Array.from(section.querySelectorAll(selectors.jobTitle))
            .map((titleEl) => {
              const item = resolveJobCard(titleEl)
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
      if (jobs.length === 0) {
        throw new Error('Job listings loaded but no cards could be extracted from the Workday results section')
      }
      console.log(`  [${source}] Page ${pageNum}: ${jobs.length} India jobs`)
      const pageCandidates = []
      for (const job of jobs) {
        const canonicalLink = getSafeWorkdayUrl(job.link, baseUrl)
        if (canonicalLink && !seenLinks.has(canonicalLink)) {
          if (!shouldFetchWorkdayJobDetail({ location: job.location }, config.locationPattern)) {
            continue
          }

          seenLinks.add(canonicalLink)
          pageCandidates.push({ job, canonicalLink })
        }
      }
      const detailedPageJobs = await mapWithConcurrency(
        pageCandidates,
        resolveWorkdayDetailFetchConcurrency(
          process.env.WORKDAY_DETAIL_FETCH_CONCURRENCY,
          config.detailFetchConcurrency,
        ),
        async ({ job, canonicalLink }) => {
          throwIfAborted(signal)
          const detailPayload = detailEnrichmentState.disabled
            ? createFallbackDetailPayload()
            : await fetchDetailedJobPayload(
                canonicalLink,
                source,
                null,
                {
                  signal,
                  requestTimeoutMs,
                  circuitBreaker,
                },
              )
          maybeDisableWorkdayDetailEnrichment(detailPayload, detailEnrichmentState, source)
          const detailedLocations = resolveWorkdayLocationsFromSummary(job.location, detailPayload)
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
            postedAt: parsePostedOn(job.postedOnRaw || detailPayload.postingDate),
            closingDate: parseClosingDate(job.closingDateRaw),
            jobDescription: detailPayload.jobDescription,
            minimumQualification: detailPayload.minimumQualification,
            preferredQualification: detailPayload.preferredQualification,
            requiredSkills: detailPayload.requiredSkills,
            experienceRequired: detailPayload.experienceRequired,
            publicExperienceChecked: detailPayload.publicExperienceChecked,
            requisitionId: detailPayload.requisitionId,
            scrapedAt: new Date().toISOString(),
          }

          if (!isWorkdayJobInPublicIndiaScope(workdayJob)) {
            return null
          }

          if (!shouldPublishWorkdayListingFallback({
            location: job.location,
            detailPayload,
            locations: detailedLocations,
          })) {
            return null
          }

          return matchesWorkdayLocationPattern(workdayJob, config.locationPattern)
            ? workdayJob
            : null
        },
      )
      for (const workdayJob of detailedPageJobs) {
        if (workdayJob) {
          allJobs.push(workdayJob)
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
          throwIfAborted(signal)
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
    throwIfAborted(signal)
    if (listingPage && await pageShowsWorkdayOutage(listingPage, outageTracker)) {
      throw buildWorkdayOutageError(source, currentUrl, err)
    }

    if (!hasExplicitJobsApiConfig && inferredApiConfig) {
      console.warn(`  [${source}] Workday DOM listing failed; retrying through the public jobs API.`)
      try {
        return await runWorkdayJobsApiScraper({
          company,
          baseUrl,
          locationCountry: countryId,
          source,
          config: {
            ...config,
            ...inferredApiConfig,
            listingStrategy: 'jobs-api',
          },
          signal,
          requestTimeoutMs,
          retryBaseDelayMs,
          circuitBreaker,
        })
      } catch (error) {
        throw markWorkdayTerminalFailure(error)
      }
    }

    throw markWorkdayTerminalFailure(
      new Error(`[${source}] Scraping failed at ${currentUrl} — ${err.message}`),
    )
  } finally {
    signal?.removeEventListener('abort', abortBrowser)
    await closeBrowser()
  }
}
