/**
 * @file Reusable, configurable scraping engine for Workday career sites.
 * @module scraper/myworkday/engine
 */
import { setTimeout as sleep } from 'node:timers/promises'
import { workdayRequestScheduler } from './requestScheduler.js'
import { loadConfig } from '../utils/loadConfig.js'
import { normalizeCity } from '../utils/cityNormalizer.js'
import { extractJobDetail } from '../detailExtractors/index.js'
import { extractWorkdayJobDetail } from '../detailExtractors/workday.js'
import { toPlainText } from '../detailExtractors/shared.js'
import { parseRetryAfterHeader } from '../utils/fetch.js'
import { isGroupedLocationLabel } from '../../src/utils/jobLocations.js'
import { isJobInPublicLocationScope } from '../../src/utils/publicJobLocationScope.js'
import { extractWorkdayDetailLocations } from './locationDetails.js'
import { parseWorkdayNativeLifecycleDate } from './nativeLifecycleDates.js'
import { attachInventoryEvidence } from '../utils/inventoryEvidence.js'
import {
  currentWorkdayBoardReceipt, explicitWorkdayCountryScope, hasRecognizedWorkdayCountry, hashWorkdayProof,
  workdayInventoryIdentity, WORKDAY_COUNTRY_INVENTORY_PROOF,
} from './countryInventoryProof.js'
import {
  nativeDetailReceiptKey, readNativeDetailReceipt, rememberNativeDetailReceipt,
  NativeDetailRecoveryPendingError, NATIVE_DETAIL_SCOPE_PASS_MS, nativeDetailPassBudget, currentNativeDetailRecovery,
} from '../utils/nativeDetailRecovery.js'

const DEFAULT_COUNTRY_FACET_PARAMETER = 'locationCountry'
const DEFAULT_WORKDAY_DETAIL_FETCH_CONCURRENCY = 4
const DEFAULT_WORKDAY_DETAIL_ENRICHMENT_BUDGET_MS = 30 * 1000
const MAX_DEFAULT_WORKDAY_DETAIL_ENRICHMENT_BUDGET_MS = 120 * 1000
const DEFAULT_WORKDAY_REQUEST_TIMEOUT_MS = 20 * 1000
const DEFAULT_WORKDAY_RATE_LIMIT_RETRY_DELAY_MS = 5 * 1000
const WORKDAY_JOBS_API_PAGE_SIZE = 20
const WORKDAY_JOBS_API_RETRY_ATTEMPTS = 3
const WORKDAY_JOBS_API_RETRY_BASE_DELAY_MS = 1000
const WORKDAY_HOST_FAILURE_THRESHOLD = 2
const WORKDAY_HOST_CIRCUIT_COOLDOWN_MS = 5 * 60 * 1000
const WORKDAY_DETAIL_FALLBACK = Symbol.for('jobverify.workday.detail-fallback')
const WORKDAY_DETAIL_FALLBACK_REASON = Symbol.for('jobverify.workday.detail-fallback-reason')
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

const delay = async (ms, signal) => {
  try {
    await sleep(ms, undefined, { signal: signal || undefined })
  } catch (error) {
    throw signal?.aborted ? signal.reason : error
  }
}

const logRecoverableWorkdayNotice = (message) => {
  // PowerShell rewrites stderr from native commands into NativeCommandError blocks.
  console.log(message)
}

const createWorkdayEmptyResult = ({
  boardIdentityVerified,
  hasIndiaCountryFacet,
  pagesFetched,
  reportedTotal,
  surface,
}) => {
  const verified = boardIdentityVerified === true && hasIndiaCountryFacet === true
  return attachInventoryEvidence([], {
    status: verified ? 'verified-empty' : 'unverified',
    surface,
    firstParty: true,
    listingComplete: true,
    pagesFetched,
    reportedTotal,
    indiaFacetCount: 0,
    verifiedAt: new Date().toISOString(),
    reason: verified
      ? 'validated-workday-india-empty'
      : 'workday-board-identity-or-india-facet-unverified',
  })
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
    requestScheduler = workdayRequestScheduler,
    kind = 'listing',
  } = {},
  consumeResponse = async (response) => response,
) => {
  throwIfAborted(signal)

  const release = await requestScheduler.acquire(url, { signal, kind })
  const controller = new AbortController()
  if (signal?.aborted) controller.abort(signal.reason)
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
    if (response.status === 429) {
      requestScheduler.recordRateLimit(url,
        parseRetryAfterHeader(response.headers?.get?.('retry-after'))
          ?? DEFAULT_WORKDAY_RATE_LIMIT_RETRY_DELAY_MS)
    }
    return await consumeResponse(response)
  } catch (error) {
    if (controller.signal.aborted && controller.signal.reason) {
      throw controller.signal.reason
    }
    throw markWorkdayTransportFailure(error)
  } finally {
    release()
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

const applyWorkdayRetryDelayHint = (
  error,
  {
    httpStatus = Number(error?.jobsApiHttpStatus ?? error?.httpStatus),
    responseHeaders = null,
  } = {},
) => {
  if (httpStatus !== 429) return error

  const retryDelayMs = parseRetryAfterHeader(responseHeaders?.get?.('retry-after'))
    ?? DEFAULT_WORKDAY_RATE_LIMIT_RETRY_DELAY_MS
  error.retryDelayMs = retryDelayMs
  return error
}

const resolveWorkdayRetryDelayMs = (
  error,
  attempt,
  baseDelayMs = WORKDAY_JOBS_API_RETRY_BASE_DELAY_MS,
) => Math.max(
  baseDelayMs * (2 ** Math.max(0, attempt - 1)),
  Number(error?.retryDelayMs) || 0,
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
    applyWorkdayRetryDelayHint(error, { httpStatus })
  } else if (httpStatus >= 400 && httpStatus <= 499) {
    error.abortRetries = true
  }

  return error
}

const buildWorkdayHttpFailureError = (
  source,
  url,
  status,
  responseHeaders = null,
) => applyWorkdayRetryDelayHint(
  buildWorkdayApiFailureError(source, url, {
    errorCode: `HTTP_${status}`,
    httpStatus: status,
  }),
  {
    httpStatus: status,
    responseHeaders,
  },
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
    requestScheduler = workdayRequestScheduler,
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
        requestScheduler,
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
  if (/\d+\s*\+/.test(text)) return null
  const cleaned = raw.replace(/^posted\s+/i, '').trim()
  return toUTCMidnight(cleaned)
}

const resolveWorkdayPostingDate = (detailPostingDate, listingPostedOn) => {
  const raw = detailPostingDate || listingPostedOn
  if (!raw) return { raw: null, date: null, precision: null, exact: false }
  try {
    return parseWorkdayNativeLifecycleDate(raw)
  } catch {
    // Only native CXS fields are mandatory strict dates. Existing page/listing
    // labels can express relative days or a lower bound instead of a clock.
    return { raw: null, date: parsePostedOn(raw), exact: false,
      precision: /\d+\s*\+/.test(raw) ? 'relative-lower-bound' : 'relative-day' }
  }
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
      const normalizedWholeLocation = normalizeCity(loc);
      if (
        normalizedWholeLocation
        && !/^india$/i.test(normalizedWholeLocation)
        && normalizedWholeLocation !== loc
      ) {
        return normalizedWholeLocation;
      }

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
  /\bindia\b/i.test(String(value || '').trim())
)

const extractLeadingCountryCode = (value = '') =>
  String(value || '').trim().match(/^([A-Z]{2,3})\s*[-,.]\s*/i)?.[1]?.toUpperCase() || null

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
    // Employer office labels can identify a country without a leading code.
    if (/\b(?:USA|United States(?: of America)?)\b/i.test(summary)) return true
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

// Workday's native external URL can omit the listing's leading locale. Only
// that segment is optional; the exact origin, board and role path still bind it.
const matchesWorkdayNativeRoleUrl = (value, canonicalLink) => {
  if (typeof value !== 'string') return false
  try {
    const native = new URL(value), listing = new URL(canonicalLink)
    if (native.protocol !== 'https:' || listing.protocol !== 'https:'
      || native.origin !== listing.origin || native.username || native.password
      || native.search || native.hash || listing.search || listing.hash) return false
    const rolePath = url => url.pathname.replace(/^\/[a-z]{2}-[a-z]{2}(?=\/)/i, '')
    return rolePath(native) === rolePath(listing)
  } catch { return false }
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
  detailEnrichmentState.failureReason = getWorkdayDetailFallbackReason(detailPayload)
  if (!detailEnrichmentState.noticeLogged) {
    detailEnrichmentState.noticeLogged = true
    logRecoverableWorkdayNotice(`  [${source}] Workday detail requests became unstable; continuing with listing-backed data for the remaining jobs on this source.`)
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
  return isWorkdayJobInPublicIndiaScope({
    location,
    locations,
    city: summaryCity === 'Remote' ? null : summaryCity,
  })
}

const isWorkdayJobInPublicIndiaScope = ({ location, locations = [], city = null } = {}) => {
  const locationValues = [location, ...locations]
    .filter((value) => typeof value === 'string' && value.trim())
  if (locationValues.some((value) => hasExplicitIndiaMarker(value)
    || ['IN', 'IND'].includes(extractLeadingCountryCode(value)))) {
    return true
  }
  return isJobInPublicLocationScope({
    location,
    locations,
    city: city === 'Remote' ? null : city,
  })
}

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

const shouldCountWorkdayHostCircuitFailure = (error) => {
  const status = Number(error?.jobsApiHttpStatus ?? error?.httpStatus)
  if (status === 429) return false
  return isTransientWorkdayError(error)
}

const didWorkdayHostCircuitOpen = (circuitBreaker, url, source) => {
  try {
    circuitBreaker.assertRequestAllowed(url, source)
    return false
  } catch (error) {
    if (error?.name === 'WorkdayHostCircuitOpenError') {
      return true
    }
    throw error
  }
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
  retryBaseDelayMs = WORKDAY_JOBS_API_RETRY_BASE_DELAY_MS,
  circuitBreaker = workdayHostCircuitBreaker,
  requestScheduler = workdayRequestScheduler,
}) => {
  if (!bootstrapUrl) return null

  let lastError = null

  for (let attempt = 1; attempt <= WORKDAY_JOBS_API_RETRY_ATTEMPTS; attempt += 1) {
    throwIfAborted(signal)
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
          requestScheduler,
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

        throw buildWorkdayHttpFailureError(
          source,
          bootstrapUrl,
          response.status,
          response.headers,
        )
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
      throwIfAborted(signal)
      lastError = error
      const retryableError = isRetryableWorkdayJobsApiError(error)
      const countTowardHostCircuit = shouldCountWorkdayHostCircuitFailure(error)

      if (retryableError && countTowardHostCircuit) {
        circuitBreaker.recordFailure(jobsApiUrl, error)
        if (didWorkdayHostCircuitOpen(circuitBreaker, jobsApiUrl, source)) {
          throw markWorkdayTransportFailure(error)
        }
      }

      if (
        error?.abortRetries === true
        || attempt >= WORKDAY_JOBS_API_RETRY_ATTEMPTS
        || !retryableError
      ) {
        if (!retryableError && countTowardHostCircuit) {
          circuitBreaker.recordFailure(jobsApiUrl, error)
        }
        throw markWorkdayTransportFailure(error)
      }

      await delay(resolveWorkdayRetryDelayMs(error, attempt, retryBaseDelayMs), signal)
    }
  }

  throw lastError
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
  requestScheduler = workdayRequestScheduler,
  requireProofResponse = false,
}) => {
  throwIfAborted(signal)
  let lastError = null
  const workdaySession = session || await bootstrapWorkdayJobsApiSession({
    bootstrapUrl,
    jobsApiUrl,
    source,
    signal,
    requestTimeoutMs,
    retryBaseDelayMs,
    circuitBreaker,
    requestScheduler,
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
          requestScheduler,
        },
        async (response) => {
          const contentType = response.headers?.get?.('content-type') || ''
          if (requireProofResponse && response.ok && (response.url !== jobsApiUrl
            || !/^application\/(?:[\w.-]+\+)?json(?:\s*;|$)/i.test(contentType))) {
            throw buildWorkdayIncompleteListingError(source, 'complete-board response URL or JSON content type is invalid')
          }
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
          throw applyWorkdayRetryDelayHint(
            buildWorkdayApiFailureError(source, jobsApiUrl, workdayApiFailure),
            {
              httpStatus: getWorkdayApiFailureStatus(workdayApiFailure),
              responseHeaders: response.headers,
            },
          )
        }

        if (hasWorkdayOutageSignal({
          title: extractHtmlTitle(bodyText),
          html: bodyText,
          url: response.url,
        })) {
          throw buildWorkdayOutageError(source, jobsApiUrl)
        }

        throw buildWorkdayHttpFailureError(
          source,
          jobsApiUrl,
          response.status,
          response.headers,
        )
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
      const retryableError = isRetryableWorkdayJobsApiError(error)
      const countTowardHostCircuit = shouldCountWorkdayHostCircuitFailure(error)

      if (retryableError && countTowardHostCircuit) {
        circuitBreaker.recordFailure(jobsApiUrl, error)
        if (didWorkdayHostCircuitOpen(circuitBreaker, jobsApiUrl, source)) {
          throw markWorkdayTransportFailure(error)
        }
      }

      if (
        error?.abortRetries === true
        ||
        attempt >= WORKDAY_JOBS_API_RETRY_ATTEMPTS
        || !retryableError
      ) {
        if (!retryableError && countTowardHostCircuit) {
          circuitBreaker.recordFailure(jobsApiUrl, error)
        }
        throw markWorkdayTransportFailure(error)
      }

      await delay(resolveWorkdayRetryDelayMs(error, attempt, retryBaseDelayMs), signal)
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
  if (payloadTotal > 0) return offsetAfterPage < payloadTotal
  return jobsCount >= pageSize
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
    logRecoverableWorkdayNotice(`  [${source}] Failed to enrich details for ${jobUrl}: ${error.message}`)
    const detailPayload = emptyDetailPayload()
    Object.defineProperty(detailPayload, WORKDAY_DETAIL_FALLBACK_REASON, { value: error })
    return detailPayload
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

export const buildWorkdayDetailApiUrl = (jobUrl, jobsApiUrl) => {
  try {
    const job = new URL(jobUrl), api = new URL(jobsApiUrl)
    const jobPath = job.pathname.match(/\/job\/.+$/)?.[0]
    if (job.origin !== api.origin || !/^https:$/.test(api.protocol)
      || !/\/wday\/cxs\/[^/]+\/[^/]+\/jobs$/.test(api.pathname) || !jobPath) return null
    api.pathname = api.pathname.replace(/\/jobs$/, '') + jobPath
    api.search = ''; api.hash = ''
    return api.href
  } catch { return null }
}

const extractWorkdayNativeDateMetadata = posting => {
  const startDate = parseWorkdayNativeLifecycleDate(posting?.startDate, { field: 'startDate' })
  const endDate = parseWorkdayNativeLifecycleDate(posting?.endDate, { field: 'endDate' })
  if (!startDate.date && !endDate.date) return {}
  return {
    ...(startDate.raw && { postingDate: startDate.raw }),
    closingDate: endDate.raw,
    sourceDateProvenance: 'workday-cxs-jobPostingInfo',
    sourceRawDates: { startDate: startDate.raw, endDate: endDate.raw },
    postingDatePrecision: startDate.precision, closingDatePrecision: endDate.precision,
    sourcePostingDateIsExact: startDate.exact, sourceClosingDateIsExact: endDate.exact,
  }
}

export const extractWorkdayStructuredDetail = payload => {
  const posting = payload?.jobPostingInfo
  const nativeDates = extractWorkdayNativeDateMetadata(posting)
  if (typeof posting?.jobDescription !== 'string') return null
  const sourceDescription = toPlainText(posting.jobDescription)
  if (!sourceDescription) return null
  const detail = extractWorkdayJobDetail(`<section data-automation-id="jobPostingDescription"><div>${posting.jobDescription}</div></section>`)
  const locationRecords = [resolveWorkdayCxsPrimaryLocation(posting), ...(Array.isArray(posting.additionalLocations) ? posting.additionalLocations : [])]
    .map((value, index) => ({
      label: typeof value === 'string' ? value.trim() : value?.descriptor?.trim(),
      countryScope: resolveWorkdayCxsPrimaryCountryScope(index === 0
        ? { ...posting, country: value?.country || posting.country }
        : { country: value?.country || (value === resolveWorkdayRequisitionLocationBinding(posting)?.publicLocation
          ? posting.jobRequisitionLocation.country : null) }),
    }))
    .filter(({ label }) => label && !isGroupedLocationLabel(label))
  const locations = [...new Set(locationRecords.map(({ label }) => label))]
  // A generic Remote label must not override the API's authoritative country.
  // Keep India secondary addresses even when the primary country is foreign.
  const hasCountryScope = locationRecords.some(({ countryScope }) => countryScope)
  const indiaScopeLocations = hasCountryScope ? [...new Set(locationRecords.flatMap(({ label, countryScope }) => {
    if (countryScope === 'foreign') return []
    if (countryScope === 'india') return [hasExplicitIndiaMarker(label) ? label : `${label}, India`]
    return !/^remote$/i.test(label) && isWorkdayJobInPublicIndiaScope({ location: label }) ? [label] : []
  }))] : null
  return { ...detail, sourceDescription, jobDescription: sourceDescription,
    locations, indiaScopeLocations, requisitionId: posting.jobReqId || detail.requisitionId,
    ...nativeDates,
    publicExperienceChecked: true }
}

const fetchDetailedJobPayload = async (
  jobUrl,
  source,
  session = null,
  {
    signal = null,
    requestTimeoutMs = DEFAULT_WORKDAY_REQUEST_TIMEOUT_MS,
    circuitBreaker = workdayHostCircuitBreaker,
    requestScheduler = workdayRequestScheduler,
    jobsApiUrl = null,
    nativePayload = undefined,
    onNativePayload = null,
    validateNativePayload = null,
  } = {},
) => {
  let nativeDates = {}
  try {
    throwIfAborted(signal)
    circuitBreaker.assertRequestAllowed(jobUrl, source)
    // The public SEO page often flattens ATS bullets into one paragraph.
    // Keep the complete structured employer text as the classification source.
    const structuredUrl = buildWorkdayDetailApiUrl(jobUrl, jobsApiUrl)
    if (structuredUrl) {
      try {
        if (nativePayload !== undefined) {
          validateNativePayload?.(nativePayload)
          nativeDates = extractWorkdayNativeDateMetadata(nativePayload?.jobPostingInfo)
          const structured = extractWorkdayStructuredDetail(nativePayload)
          if (structured) return structured
        } else {
          const { response, bodyText } = await fetchWorkdayResource(structuredUrl, {
            headers: { accept: 'application/json', 'user-agent': WORKDAY_FETCH_USER_AGENT,
              ...(session?.bootstrapUrl ? { referer: session.bootstrapUrl } : {}),
              ...(session?.cookieHeader ? { cookie: session.cookieHeader } : {}) },
          }, { signal, timeoutMs: requestTimeoutMs, source, requestScheduler, kind: 'detail' },
          async response => ({ response, bodyText: await response.text() }))
          if (response.status === 429 || response.status >= 500) throw buildWorkdayHttpFailureError(source, structuredUrl, response.status, response.headers)
          const payload = response.ok ? JSON.parse(bodyText) : null
          validateNativePayload?.(payload)
          nativeDates = extractWorkdayNativeDateMetadata(payload?.jobPostingInfo)
          const structured = extractWorkdayStructuredDetail(payload)
          if (structured || nativeDates.sourceDateProvenance) onNativePayload?.(payload)
          if (structured) { circuitBreaker.recordSuccess(jobUrl); return structured }
        }
      } catch (error) {
        throwIfAborted(signal)
        if (['WORKDAY_NATIVE_DATE_INVALID', 'WORKDAY_NATIVE_ROLE_MISMATCH'].includes(error?.code)) throw error
        const status = Number(error?.jobsApiHttpStatus ?? error?.httpStatus)
        if (status === 429 || status >= 500) throw error
        // Missing, blocked, or malformed API descriptions use the existing page path.
      }
    }
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
        requestScheduler,
        kind: 'detail',
      },
      async (response) => ({
        response,
        html: await response.text(),
      }),
    )

    if (!response.ok) {
      throw buildWorkdayHttpFailureError(source, jobUrl, response.status, response.headers)
    }

    circuitBreaker.recordSuccess(jobUrl)
    return {
      locations: extractWorkdayDetailLocations(html),
      ...(await extractJobDetail({ provider: 'workday', html })),
      ...nativeDates,
    }
  } catch (error) {
    throwIfAborted(signal)
    if (['WORKDAY_NATIVE_DATE_INVALID', 'WORKDAY_NATIVE_ROLE_MISMATCH'].includes(error?.code)) throw error
    circuitBreaker.recordFailure(jobUrl, error)
    if (shouldFallbackToListingDataAfterDetailFailure(error)) {
      logRecoverableWorkdayNotice(`  [${source}] Failed to enrich details for ${jobUrl}; keeping listing data when summary location remains safely in scope: ${error.message}`)
      return Object.assign(createFallbackDetailPayload(error), nativeDates)
    }

    if (error?.abortRetries === true) {
      throw markWorkdayTransportFailure(error)
    }

    logRecoverableWorkdayNotice(`  [${source}] Failed to enrich details for ${jobUrl}: ${error.message}`)
    return { ...emptyDetailPayload(), ...nativeDates }
  }
}

const buildWorkdayIncompleteListingError = (source, reason, classification = {}) => {
  const error = new Error('[' + source + '] Workday listing is incomplete: ' + reason)
  error.name = 'WorkdayIncompleteListingError'
  error.abortRetries = true
  error.failureKind = classification.failureKind || 'parser_or_contract_error'
  if (classification.softFailure === true) error.softFailure = true
  if (classification.upstreamOutage != null) {
    error.upstreamOutage = classification.upstreamOutage === true
  }
  return error
}

const resolveSelectedWorkdayCountryFacetTotal = (payload, appliedFacets, searchText) => {
  if (String(searchText || '').trim()) return null
  const selectedFacets = Object.entries(appliedFacets || {})
    .filter(([, values]) => Array.isArray(values) && values.length > 0)
  if (selectedFacets.length !== 1) return null
  const [[facetKey, selectedIds]] = selectedFacets
  if (!isWorkdayCountryFacetKey(facetKey) || selectedIds.length !== 1) return null
  const selectedId = String(selectedIds[0])

  const findSelectedCount = (value, countryFacet = false) => {
    if (Array.isArray(value)) {
      return value.reduce((max, item) => Math.max(max, findSelectedCount(item, countryFacet) ?? -1), -1)
    }
    if (!value || typeof value !== 'object') return null
    const insideCountryFacet = countryFacet || isWorkdayCountryFacetKey(value.facetParameter)
    if (insideCountryFacet && String(value.id || '') === selectedId) {
      const count = Number(value.count)
      if (Number.isInteger(count) && count >= 0) return count
    }
    const counts = Object.values(value)
      .map((item) => findSelectedCount(item, insideCountryFacet))
      .filter((count) => count != null)
    return counts.length ? Math.max(...counts) : null
  }

  return findSelectedCount(payload?.facets)
}

const buildWorkdayIncompleteScopeError = (source, jobUrl, cause) => {
  const error = new Error('[' + source + '] Workday cannot establish India scope for ' + jobUrl + ' without complete job locations', { cause })
  error.name = 'WorkdayIncompleteScopeError'
  error.softFailure = true
  error.abortRetries = true
  error.failureKind = 'incomplete_location_scope'
  return error
}

const resolveWorkdayCxsPrimaryLocation = (info = {}) => (
  info.location == null || (typeof info.location === 'string' && !info.location.trim())
    ? info.jobRequisitionLocation?.descriptor
    : info.location
)

// The requisition office has its own country and may differ from all public
// posting locations. Only an explicitly listed office can be published.
const resolveWorkdayRequisitionLocationBinding = (info = {}) => {
  const nested = info.jobRequisitionLocation
  if (!info.country || !nested?.country || typeof info.location !== 'string'
    || typeof nested.descriptor !== 'string' || !Array.isArray(info.additionalLocations)) return null
  const countryLabels = country => (typeof country === 'string'
    ? [country] : [country?.descriptor, country?.alpha2Code])
    .filter(value => typeof value === 'string' && value.trim())
    .map(value => value.trim().toLowerCase())
  const officeKey = (label, countries) => {
    let key = typeof label === 'string' ? label.trim().toLowerCase() : ''
    for (const country of countries.flatMap(countryLabels)) {
      if (key.endsWith(', ' + country)) key = key.slice(0, -(country.length + 2)).trim()
    }
    return key
  }
  const nestedKey = officeKey(nested.descriptor, [nested.country])
  if (!nestedKey || !info.location.trim() || /^unknown$/i.test(nestedKey)
    || isGroupedLocationLabel(nested.descriptor) || !countryLabels(info.country).length
    || !countryLabels(nested.country).length
    || nestedKey === officeKey(info.location, [info.country, nested.country])) return null
  const matches = info.additionalLocations.filter(location => officeKey(location, [nested.country]) === nestedKey)
  return { publicLocation: matches.length === 1 ? matches[0] : null }
}

const resolveWorkdayCxsPrimaryCountryScope = (info = {}) => {
  const nestedCountry = resolveWorkdayRequisitionLocationBinding(info) ? null : info.jobRequisitionLocation?.country
  const countryValues = [
    typeof info.country === 'string' ? info.country : null,
    info.country?.descriptor,
    info.country?.alpha2Code,
    typeof nestedCountry === 'string' ? nestedCountry : null,
    nestedCountry?.descriptor,
    nestedCountry?.alpha2Code,
  ].filter((value) => typeof value === 'string' && value.trim())
  const hasIndia = countryValues.some((value) => /^(?:india|in|ind)$/i.test(value.trim()))
  const hasForeign = countryValues.some((value) => {
    const country = value.trim()
    return !/^(?:india|in|ind|unknown|multiple countries?)$/i.test(country)
      && (/^[A-Z]{2}$/i.test(country) || /^[\p{L}][\p{L}\s.'()-]+$/u.test(country))
  })
  if (hasIndia === hasForeign) return null
  return hasIndia ? 'india' : 'foreign'
}

// The HTML can expose only a foreign primary address for a multi-location role.
// CXS supplies the additional locations needed to decide whether India is included.
const fetchWorkdayScopePayload = async ({
  candidate, jobsApiUrl, source, session, signal, requestTimeoutMs,
  retryBaseDelayMs, circuitBreaker, requestScheduler, countryProof = false,
}) => {
  const jobPath = new URL(candidate.canonicalLink).pathname.match(/\/job\/.+$/)?.[0]
  if (!jobPath) throw buildWorkdayIncompleteScopeError(source, candidate.canonicalLink)
  const detailApiUrl = new URL(jobsApiUrl)
  detailApiUrl.pathname = detailApiUrl.pathname.replace(/\/jobs\/?$/, '') + jobPath
  detailApiUrl.search = ''

  try {
    for (let attempt = 1; attempt <= WORKDAY_JOBS_API_RETRY_ATTEMPTS; attempt += 1) {
      throwIfAborted(signal)
      circuitBreaker.assertRequestAllowed(detailApiUrl.href, source)
      try {
        const { response, payload } = await fetchWorkdayResource(
          detailApiUrl.href,
          {
            headers: {
              accept: 'application/json',
              'accept-language': 'en-US',
              'user-agent': WORKDAY_FETCH_USER_AGENT,
              ...(session?.bootstrapUrl ? { referer: session.bootstrapUrl } : {}),
              ...(session?.cookieHeader ? { cookie: session.cookieHeader } : {}),
            },
          },
          { signal, timeoutMs: requestTimeoutMs, source, requestScheduler, kind: 'listing' },
          async (response) => ({
            response,
            payload: response.ok ? await response.json() : (await response.text(), null),
          }),
        )
        if (!response.ok) {
          throw buildWorkdayHttpFailureError(source, detailApiUrl.href, response.status, response.headers)
        }
        if (countryProof && (response.url !== detailApiUrl.href
          || !/^application\/(?:[\w.-]+\+)?json(?:\s*;|$)/i.test(response.headers?.get?.('content-type') || ''))) {
          throw new Error('Native Workday country detail response URL or JSON content type is invalid')
        }

        const info = payload?.jobPostingInfo
        const locations = [resolveWorkdayCxsPrimaryLocation(info), ...(Array.isArray(info?.additionalLocations) ? info.additionalLocations : [])]
        const expectedCount = Number(candidate.location.match(/^(\d+)\s+locations?$/i)?.[1]) || 1
        if (
          !info || (info.additionalLocations != null && !Array.isArray(info.additionalLocations))
          || locations.some((value) => typeof value !== 'string' || !value.trim()
            || isGroupedLocationLabel(value) || /^unknown$/i.test(value.trim()))
        ) {
          throw new Error('CXS job location payload is missing or ambiguous')
        }
        const normalizedLocations = locations.map((value) => value.trim())
        if (normalizedLocations.length < expectedCount) {
          throw new Error('CXS supplied ' + normalizedLocations.length + ' of ' + expectedCount + ' job locations')
        }
        circuitBreaker.recordSuccess(detailApiUrl.href)
        return payload
      } catch (error) {
        throwIfAborted(signal)
        if (shouldCountWorkdayHostCircuitFailure(error)) circuitBreaker.recordFailure(detailApiUrl.href, error)
        if (error?.abortRetries === true || attempt >= WORKDAY_JOBS_API_RETRY_ATTEMPTS || !isRetryableWorkdayJobsApiError(error)) throw error
        await delay(resolveWorkdayRetryDelayMs(error, attempt, retryBaseDelayMs), signal)
      }
    }
  } catch (error) {
    throwIfAborted(signal)
    throw buildWorkdayIncompleteScopeError(source, candidate.canonicalLink, error)
  }
}

const workdayLocationEvidenceKey = value => String(value || '').trim().toLowerCase()
// City-only secondary labels do not carry the primary location's country.
// These known non-India cities can be excluded independently; unknown campus
// labels still require current native country evidence from this board.
const WORKDAY_NON_INDIA_CITY_LABELS = new Set([
  'launceston', 'brisbane', 'perth', 'townsville', 'adelaide', 'melbourne',
])

// Bind countries to the office they describe. Opaque labels may reuse only
// matching office-country evidence from this run.
const buildWorkdayLocationCountryEvidence = candidates => {
  const evidence = new Map()
  for (const candidate of candidates) {
    const info = candidate.scopePayload?.jobPostingInfo
    const binding = resolveWorkdayRequisitionLocationBinding(info)
    const secondary = binding?.publicLocation
    const bindings = [{ label: resolveWorkdayCxsPrimaryLocation(info),
      countries: [info.country, ...(binding ? [] : [info.jobRequisitionLocation?.country])].filter(Boolean) }]
    if (secondary) bindings.push({ label: secondary, countries: [info.jobRequisitionLocation.country] })
    candidate.scopeCountryConflict = false
    for (const binding of bindings) {
      const { countries } = binding
      const scope = resolveWorkdayCxsPrimaryCountryScope({ country: countries[0], jobRequisitionLocation: { country: countries[1] } })
      const fields = countries.map(country => typeof country === 'string'
        ? { [/^[a-z]{2}$/i.test(country.trim()) ? 'code' : 'name']: workdayLocationEvidenceKey(country) }
        : Object.fromEntries([['code', 'alpha2Code'], ['name', 'descriptor'], ['id', 'id']]
          .flatMap(([key, property]) => typeof country[property] === 'string' && country[property].trim()
            ? [[key, workdayLocationEvidenceKey(country[property])]] : [])))
      const countryScopes = countries.map(country => resolveWorkdayCxsPrimaryCountryScope({ country })).filter(Boolean)
      const conflict = new Set(countryScopes).size > 1 || fields.some((country, index) => fields.slice(index + 1).some(other => (
        !['code', 'id'].some(key => country[key] && country[key] === other[key])
        && ['code', 'name', 'id'].some(key => country[key] && other[key] && country[key] !== other[key])
      )))
      candidate.scopeCountryConflict ||= conflict
      if (!scope && !conflict) continue
      const identifiers = new Set(fields.flatMap(country => Object.entries(country).map(([key, value]) => key + ':' + value)))
      if (!identifiers.size) continue
      const label = workdayLocationEvidenceKey(binding.label)
      const previous = evidence.get(label)
      if (!previous) evidence.set(label, { scope, identifiers, conflict })
      else {
        const strongConflict = ['code:', 'id:'].some(prefix => {
          const oldValues = [...previous.identifiers].filter(value => value.startsWith(prefix))
          const newValues = [...identifiers].filter(value => value.startsWith(prefix))
          return oldValues.length > 0 && newValues.length > 0 && !newValues.some(value => previous.identifiers.has(value))
        })
        if (conflict || strongConflict || previous.scope !== scope || ![...identifiers].some(value => previous.identifiers.has(value))) previous.conflict = true
        for (const value of identifiers) previous.identifiers.add(value)
      }
    }
  }
  return evidence
}

const resolveWorkdayScopeLocations = (candidate, countryEvidence, source, countryProof = false) => {
  try {
    if (candidate.scopeCountryConflict) throw new Error('CXS primary country fields conflict')
    const info = candidate.scopePayload.jobPostingInfo
    const locations = [...new Set([resolveWorkdayCxsPrimaryLocation(info), ...(info.additionalLocations || [])].map(value => value.trim()))]
    const primaryScope = resolveWorkdayCxsPrimaryCountryScope(info)
    const scopes = locations.map((location, index) => {
      const known = countryEvidence.get(workdayLocationEvidenceKey(location))
      if (countryProof && known?.conflict) throw new Error('CXS location has conflicting current primary-country evidence: ' + location)
      if (countryProof && index === 0 && primaryScope && explicitWorkdayCountryScope(location)
        && primaryScope !== explicitWorkdayCountryScope(location)) throw new Error('CXS location and country fields conflict: ' + location)
      if (index === 0 && primaryScope) return primaryScope
      if (known?.conflict) throw new Error('CXS location has conflicting current primary-country evidence: ' + location)
      if (known) return known.scope
      if (countryProof) return explicitWorkdayCountryScope(location)
      if (isWorkdayJobInPublicIndiaScope({ location })) return 'india'
      if (WORKDAY_NON_INDIA_CITY_LABELS.has(workdayLocationEvidenceKey(location))) return 'foreign'
      if (isClearlyOutsidePublicIndiaScope({ location })) return 'foreign'
      return null
    })
    if (!scopes.includes('india') && !scopes.every(scope => scope === 'foreign')) {
      throw new Error('CXS job locations do not establish India or foreign scope: '
        + locations.filter((_location, index) => !scopes[index]).join(' / '))
    }
    const scopedLocations = locations.map((location, index) => scopes[index] === 'india' && !isWorkdayJobInPublicIndiaScope({ location })
      ? location + ', India' : location)
    return { locations: scopedLocations, countryScopes: scopes,
      indiaLocations: scopedLocations.filter((_location, index) => scopes[index] === 'india') }
  } catch (error) {
    throw buildWorkdayIncompleteScopeError(source, candidate.canonicalLink, error)
  }
}

const runWorkdayJobsApiScraper = async ({
  company,
  baseUrl,
  locationCountry,
  source,
  config,
  boardIdentityVerified = false,
  signal = null,
  requestTimeoutMs = DEFAULT_WORKDAY_REQUEST_TIMEOUT_MS,
  retryBaseDelayMs = WORKDAY_JOBS_API_RETRY_BASE_DELAY_MS,
  circuitBreaker = workdayHostCircuitBreaker,
  requestScheduler = workdayRequestScheduler,
  detailCircuitBreaker = new WorkdayHostCircuitBreaker(),
  detailEnrichmentState = { disabled: false, noticeLogged: false },
  detailEnrichmentBudgetMs = null,
  nativeDetailRecovery = null,
}) => {
  throwIfAborted(signal)
  const countryProof = config.inventoryScope === 'complete-board-country-proof'
  const countryFacetParameter =
    config.countryFacetParameter || DEFAULT_COUNTRY_FACET_PARAMETER
  const appliedFacets = countryProof ? {} : buildWorkdayAppliedFacets(
    baseUrl,
    locationCountry,
    countryFacetParameter,
  )
  const jobsApiUrl = config.jobsApiUrl
  const detailUrlBase = config.detailUrlBase || baseUrl
  // The shared maxPages setting limits DOM traversal; it must not truncate an
  // authoritative Workday API snapshot. An explicit API cap fails closed.
  const maxPages = Number.isInteger(config.workdayMaxPages) && config.workdayMaxPages > 0
    ? config.workdayMaxPages
    : Number.POSITIVE_INFINITY
  let effectiveAppliedFacets = appliedFacets
  let effectiveSearchText = countryProof ? '' : config.searchText || ''
  let retriedWithoutCountryFacet = false
  let retriedWithoutLocationFacets = false

  if (!jobsApiUrl) {
    throw new Error(`[${source}] listingStrategy "jobs-api" requires config.jobsApiUrl`)
  }

  try {
    const allJobs = []
    const allCandidates = []
    const initialInventory = new Map()
    let boardReceipt = null
    if (countryProof) {
      try {
        const { response, html } = await fetchWorkdayResource(
          config.officialCareersUrl,
          { headers: { accept: 'text/html,application/xhtml+xml', 'user-agent': WORKDAY_FETCH_USER_AGENT }, cache: 'no-store' },
          { signal, timeoutMs: requestTimeoutMs, source, requestScheduler },
          async response => ({ response, html: await response.text() }),
        )
        boardReceipt = currentWorkdayBoardReceipt({ officialCareersUrl: config.officialCareersUrl,
          boardUrl: baseUrl, response, html })
        // The configured API must belong to the board the corporate page names.
        const inferred = inferWorkdayJobsApiConfig(baseUrl)
        if (!inferred || inferred.jobsApiUrl !== jobsApiUrl) throw new Error('Workday API does not match the corporate-bound tenant and site')
      } catch (error) {
        throwIfAborted(signal)
        throw buildWorkdayIncompleteScopeError(source, config.officialCareersUrl || baseUrl, error)
      }
    }
    const seenLinks = new Set()
    const seenApiRecords = new Set()
    let reportedTotal = 0
    let pagesFetched = 0
    let offset = 0
    const searchUrl = countryProof
      ? (config.detailUrlBase || baseUrl).split(/[?#]/)[0]
      : buildWorkdaySearchUrl(config.detailUrlBase || baseUrl, locationCountry)
    const session = await bootstrapWorkdayJobsApiSession({
      bootstrapUrl: searchUrl,
      jobsApiUrl,
      source,
      signal,
      requestTimeoutMs,
      retryBaseDelayMs,
      circuitBreaker,
      requestScheduler,
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
          requestScheduler,
          requireProofResponse: countryProof,
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
              requestScheduler,
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
              requestScheduler,
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
            requestScheduler,
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
      pagesFetched += 1
      const jobs = payload.jobPostings
      if (countryProof && pagesFetched > 1 && payload.total !== reportedTotal) {
        throw buildWorkdayIncompleteListingError(source, 'complete-board total changed during enumeration')
      }
      reportedTotal = Math.max(reportedTotal, Number(payload.total) || 0)
      const selectedCountryFacetTotal = resolveSelectedWorkdayCountryFacetTotal(
        payload,
        effectiveAppliedFacets,
        effectiveSearchText,
      )
      if (selectedCountryFacetTotal > reportedTotal) {
        throw buildWorkdayIncompleteListingError(
          source,
          'selected country facet reports ' + selectedCountryFacetTotal
            + ' jobs but the API total is ' + reportedTotal,
          {
            softFailure: true,
            upstreamOutage: false,
            failureKind: 'upstream_inventory_unavailable',
          },
        )
      }
      const uniqueBeforePage = seenApiRecords.size

      if (!countryProof && pageNum === 1 && jobs.length === 0) {
        console.log(`  [${source}] 0 jobs found from Workday jobs API.`)
        return createWorkdayEmptyResult({
          boardIdentityVerified,
          hasIndiaCountryFacet: hasWorkdayCountryFacetValues(effectiveAppliedFacets),
          pagesFetched,
          reportedTotal,
          surface: jobsApiUrl,
        })
      }

      console.log(`  [${source}] Scraping page ${pageNum} - ${jobsApiUrl} (offset ${offset})`)
      console.log(`  [${source}] Page ${pageNum}: ${jobs.length} job records`)

      for (const job of jobs) {
        const canonicalLink = buildWorkdayJobDetailUrl(job.externalPath, detailUrlBase, baseUrl)
        if (countryProof) {
          const apiBoard = new URL(jobsApiUrl).pathname.match(/^\/wday\/cxs\/([^/]+)\/([^/]+)\/jobs$/)
          const expectedRolePath = '/' + apiBoard?.[2] + job.externalPath
          const actualRolePath = canonicalLink && new URL(canonicalLink).pathname.replace(/^\/[a-z]{2}-[a-z]{2}(?=\/)/i, '')
          if (!apiBoard || typeof job.title !== 'string' || !job.title.trim()
            || typeof job.externalPath !== 'string' || !/^\/job\/.+_[^/]+$/.test(job.externalPath)
            || !canonicalLink || actualRolePath !== expectedRolePath || initialInventory.has(canonicalLink)) {
            throw buildWorkdayIncompleteListingError(source, 'complete-board role identity is missing, duplicate, or outside this board')
          }
          initialInventory.set(canonicalLink, workdayInventoryIdentity(job))
        }
        seenApiRecords.add(canonicalLink || JSON.stringify(job))
        if (!canonicalLink || seenLinks.has(canonicalLink)) continue

        const location = resolveWorkdaySummaryLocation(job)
        if (countryProof ? explicitWorkdayCountryScope(location) === 'foreign'
          : !shouldFetchWorkdayJobDetail({ location }, config.locationPattern)) {
          continue
        }

        seenLinks.add(canonicalLink)
        allCandidates.push({ job, canonicalLink, location,
          receiptKey: nativeDetailReceiptKey('workday', source, jobsApiUrl, canonicalLink, job.title, location, job.postedOn, job.bulletFields),
        })
      }

      if (jobs.length > 0 && seenApiRecords.size === uniqueBeforePage) {
        throw buildWorkdayIncompleteListingError(source, 'API page ' + pageNum + ' repeated previously seen jobs')
      }
      offset += jobs.length
      const hasMore = offset < reportedTotal || shouldContinueWorkdayJobsApiPagination({
        jobsCount: jobs.length,
        offsetAfterPage: offset,
        payloadTotal: reportedTotal,
      })
      if (jobs.length === 0 || !hasMore) {
        if (seenApiRecords.size < reportedTotal) {
          throw buildWorkdayIncompleteListingError(source, 'received ' + seenApiRecords.size + ' unique jobs of ' + reportedTotal + ' reported jobs')
        }
        break
      }
      if (pageNum === maxPages) {
        throw buildWorkdayIncompleteListingError(source, 'reached the ' + maxPages + '-page API limit')
      }
    }

    // Required geography checks use the source deadline. Resolve these before
    // optional HTML enrichment starts its separate, shorter budget.
    const scopeCandidates = allCandidates.filter(({ location }) => countryProof
      ? explicitWorkdayCountryScope(location) !== 'india'
      : !isWorkdayJobInPublicIndiaScope({ location, city: extractCity(location) }))
    const matchesNativeRole = (payload, candidate) => {
      const info = payload?.jobPostingInfo
      const listingUrl = new URL(candidate.canonicalLink)
      const postingPath = listingUrl.pathname
      const nativeId = postingPath.match(/_([^/]+)$/)?.[1]
      const reqId = typeof info?.jobReqId === 'string' ? info.jobReqId.trim() : null
      const canonicalMatches = typeof info?.externalUrl === 'string'
        && matchesWorkdayNativeRoleUrl(info.externalUrl, candidate.canonicalLink)
      const nativePostingMatches = info?.jobPostingId === postingPath.split('/').at(-1)
      const repeatedPosting = reqId && nativeId?.startsWith(reqId + '-')
        && /^\d+$/.test(nativeId.slice(reqId.length + 1)) && (canonicalMatches || nativePostingMatches)
      return Boolean(info && nativeId && reqId && (reqId === nativeId || repeatedPosting)
        && (info.externalUrl == null || canonicalMatches)
        && (!countryProof || canonicalMatches && info.jobPostingSiteId === new URL(jobsApiUrl).pathname.split('/').at(-2))
        && typeof info.title === 'string' && typeof candidate.job.title === 'string'
        && info.title.trim() === candidate.job.title.trim())
    }
    const validateNativeRole = (payload, candidate) => {
      const info = payload?.jobPostingInfo
      if (countryProof && !matchesNativeRole(payload, candidate)) {
        throw buildWorkdayIncompleteScopeError(source, candidate.canonicalLink,
          new Error('Native Workday detail lacks the matching requisition, title, site, or canonical same-board URL'))
      }
      if (countryProof && [info?.country, info?.jobRequisitionLocation?.country]
        .some(country => !hasRecognizedWorkdayCountry(country))) {
        throw buildWorkdayIncompleteScopeError(source, candidate.canonicalLink,
          new Error('Native Workday country fields are unrecognized or conflicting'))
      }
      if (!info) return
      const nativeId = new URL(candidate.canonicalLink).pathname.match(/_([^/]+)$/)?.[1]
      const reqId = typeof info.jobReqId === 'string' ? info.jobReqId.trim() : null
      const reqMatches = reqId && (reqId === nativeId || nativeId?.startsWith(reqId + '-')
        && /^\d+$/.test(nativeId.slice(reqId.length + 1)))
      if (info.jobReqId != null && !reqMatches
        || info.title != null && (typeof info.title !== 'string' || info.title.trim() !== candidate.job.title?.trim())
        || info.externalUrl != null && !matchesWorkdayNativeRoleUrl(info.externalUrl, candidate.canonicalLink)) {
        throw Object.assign(new Error(`[${source}] Native Workday detail identity conflicts with ${candidate.canonicalLink}`), {
          name: 'WorkdayNativeRoleMismatchError', code: 'WORKDAY_NATIVE_ROLE_MISMATCH',
          abortRetries: true, failureKind: 'parser_or_contract_error',
        })
      }
    }
    const scopeController = new AbortController()
    const scopeSignal = nativeDetailRecovery
      ? (signal ? AbortSignal.any([signal, scopeController.signal]) : scopeController.signal) : signal
    const scopeTimer = nativeDetailRecovery && scopeCandidates.length
      ? setTimeout(() => scopeController.abort(new NativeDetailRecoveryPendingError(scopeCandidates.length)),
        nativeDetailPassBudget(nativeDetailRecovery, NATIVE_DETAIL_SCOPE_PASS_MS)) : null
    try {
      await mapWithConcurrency(
        scopeCandidates,
        resolveWorkdayDetailFetchConcurrency(process.env.WORKDAY_DETAIL_FETCH_CONCURRENCY, config.detailFetchConcurrency),
        async (candidate) => {
          const cached = countryProof ? null : readNativeDetailReceipt(nativeDetailRecovery, candidate.receiptKey)
          if (cached && matchesNativeRole(cached.payload, candidate)) {
            candidate.scopePayload = cached.payload
            candidate.scopeFetchedAt = cached.fetchedAt
            candidate.fromRecovery = true
            return
          }
          if (scopeController.signal.aborted) return
          try {
            candidate.scopePayload = await fetchWorkdayScopePayload({
              candidate, jobsApiUrl, source, session, signal: scopeSignal, requestTimeoutMs,
              retryBaseDelayMs, circuitBreaker: detailCircuitBreaker, requestScheduler,
              countryProof,
            })
            if (countryProof) validateNativeRole(candidate.scopePayload, candidate)
            candidate.scopeFetchedAt = Date.now()
            if (matchesNativeRole(candidate.scopePayload, candidate)) {
              rememberNativeDetailReceipt(nativeDetailRecovery, candidate.receiptKey, candidate.scopePayload, candidate.scopeFetchedAt)
            }
          } catch (error) {
            throwIfAborted(signal)
            if (!scopeController.signal.aborted) throw error
          }
        },
      )
    } finally { clearTimeout(scopeTimer) }
    const pendingScopeCount = scopeCandidates.filter(candidate => !candidate.scopePayload).length
    if (pendingScopeCount) {
      nativeDetailRecovery.pending += pendingScopeCount
      throw new NativeDetailRecoveryPendingError(pendingScopeCount)
    }
    // In proof mode every receipt is identity-bound before its country can
    // affect another role's secondary office.
    if (countryProof) for (const candidate of scopeCandidates) validateNativeRole(candidate.scopePayload, candidate)
    const countryEvidence = buildWorkdayLocationCountryEvidence(scopeCandidates)
    for (const candidate of scopeCandidates) {
      validateNativeRole(candidate.scopePayload, candidate)
      const scope = resolveWorkdayScopeLocations(candidate, countryEvidence, source, countryProof)
      candidate.scopeLocations = scope.locations
      candidate.scopeIndiaLocations = scope.indiaLocations
      candidate.scopeCountryScopes = scope.countryScopes
    }

    // Finish listing before optional enrichment so a slow detail page cannot
    // prevent later job IDs from being included in the snapshot.
    // Only the implicit allowance scales with remaining native detail work.
    // Cached required-scope descriptions need no extra requests. Explicit
    // option/config/env budgets, including zero, retain their exact limits.
    const pendingDetailCount = allCandidates.filter(candidate => (
      (!candidate.scopeIndiaLocations || candidate.scopeIndiaLocations.length > 0)
      && !extractWorkdayStructuredDetail(candidate.scopePayload)
    )).length
    const pacedStartIntervalMs = Number.isFinite(requestScheduler?.minIntervalMs)
      ? Math.max(0, requestScheduler.minIntervalMs) : 0
    const effectiveDetailBudgetMs = nativeDetailPassBudget(nativeDetailRecovery, detailEnrichmentBudgetMs ?? Math.min(
      MAX_DEFAULT_WORKDAY_DETAIL_ENRICHMENT_BUDGET_MS,
      DEFAULT_WORKDAY_DETAIL_ENRICHMENT_BUDGET_MS + pendingDetailCount * pacedStartIntervalMs,
    ))
    const detailController = new AbortController()
    const budgetError = new Error(`[${source}] Workday detail enrichment budget exhausted`)
    budgetError.name = 'WorkdayDetailBudgetExceededError'
    const detailSignal = signal
      ? AbortSignal.any([signal, detailController.signal])
      : detailController.signal
    const detailBudgetTimer = setTimeout(() => detailController.abort(budgetError), effectiveDetailBudgetMs)
    if (effectiveDetailBudgetMs === 0) detailController.abort(budgetError)

    try {
      const detailedJobs = await mapWithConcurrency(
        allCandidates,
        resolveWorkdayDetailFetchConcurrency(
          process.env.WORKDAY_DETAIL_FETCH_CONCURRENCY,
          config.detailFetchConcurrency,
        ),
        async (candidate) => {
          const { job, canonicalLink, location, scopeLocations, scopeIndiaLocations, scopePayload } = candidate
          throwIfAborted(signal)
          if (scopeIndiaLocations && scopeIndiaLocations.length === 0) return null
          if (scopeLocations && !isWorkdayJobInPublicIndiaScope({ location, locations: scopeLocations })) return null
          const cached = scopePayload || countryProof ? null : readNativeDetailReceipt(nativeDetailRecovery, candidate.receiptKey)
          const cachedPayload = cached && matchesNativeRole(cached.payload, candidate) ? cached.payload : null
          let verifiedNativePayload = scopePayload && matchesNativeRole(scopePayload, candidate) ? scopePayload : cachedPayload
          let verifiedAt = candidate.scopeFetchedAt || (cachedPayload ? cached.fetchedAt : null)
          let fromRecovery = candidate.fromRecovery || Boolean(cachedPayload)
          let detailPayload = extractWorkdayStructuredDetail(scopePayload || cachedPayload)
          if (detailPayload) {
            // The required native scope phase already verified these addresses,
            // including India secondaries whose labels lack a country name.
            if (scopePayload) detailPayload = { ...detailPayload, locations: scopeLocations,
              indiaScopeLocations: scopeIndiaLocations }
          } else if (detailEnrichmentState.disabled || detailController.signal.aborted) {
            detailPayload = createFallbackDetailPayload(detailEnrichmentState.disabled
              ? detailEnrichmentState.failureReason : detailController.signal.reason)
          } else {
            try {
              detailPayload = await fetchDetailedJobPayload(
                canonicalLink,
                source,
                session,
                {
                  signal: detailSignal,
                  requestTimeoutMs,
                  circuitBreaker: detailCircuitBreaker,
                  requestScheduler,
                  jobsApiUrl,
                  nativePayload: scopePayload,
                  validateNativePayload: payload => validateNativeRole(payload, candidate),
                  onNativePayload: payload => {
                    if (matchesNativeRole(payload, candidate)) {
                      verifiedNativePayload = payload
                      verifiedAt = Date.now()
                      rememberNativeDetailReceipt(nativeDetailRecovery, candidate.receiptKey, payload, verifiedAt)
                    }
                  },
                },
              )
            } catch (error) {
              throwIfAborted(signal)
              if (error !== budgetError) throw error
              detailPayload = createFallbackDetailPayload(error)
            }
          }
          // Required scope receipts can carry clocks even when optional
          // description hydration is disabled or has exhausted its budget.
          const nativeClockPayload = scopePayload || cachedPayload || verifiedNativePayload
          if (nativeClockPayload) Object.assign(detailPayload,
            extractWorkdayNativeDateMetadata(nativeClockPayload.jobPostingInfo))
          if (!verifiedNativePayload && detailPayload.sourceDateProvenance) {
            for (const field of ['postingDate', 'closingDate', 'sourceRawDates', 'sourceDateProvenance',
              'postingDatePrecision', 'closingDatePrecision', 'sourcePostingDateIsExact', 'sourceClosingDateIsExact']) delete detailPayload[field]
          }
          maybeDisableWorkdayDetailEnrichment(detailPayload, detailEnrichmentState, source)
          const structuredIndiaLocations = scopeIndiaLocations || detailPayload.indiaScopeLocations
          if (Array.isArray(structuredIndiaLocations) && structuredIndiaLocations.length === 0) return null
          const detailedLocations = structuredIndiaLocations || scopeLocations || resolveWorkdayLocationsFromSummary(location, detailPayload)

          if (!shouldPublishWorkdayListingFallback({ location, detailPayload, locations: detailedLocations })) {
            throw buildWorkdayIncompleteScopeError(source, canonicalLink)
          }

          const indiaScopeLocations = (structuredIndiaLocations || scopeLocations)?.filter((value) => isWorkdayJobInPublicIndiaScope({ location: value }))
          const displayLocation = indiaScopeLocations?.length ? indiaScopeLocations.join(' / ') : location
          const sourceDetailComplete = [detailPayload.sourceDescription, detailPayload.jobDescription]
            .some(value => typeof value === 'string' && value.trim())
          const detailFailureReason = getWorkdayDetailFallbackReason(detailPayload)
          if (nativeDetailRecovery && !sourceDetailComplete) {
            if (detailFailureReason?.name === 'WorkdayDetailBudgetExceededError' && detailEnrichmentBudgetMs !== 0) nativeDetailRecovery.pending++
            else if (detailFailureReason) nativeDetailRecovery.unrecoverable = true
          }
          const postingDate = resolveWorkdayPostingDate(detailPayload.postingDate, job.postedOn)
          const closingDate = parseWorkdayNativeLifecycleDate(detailPayload.sourceRawDates?.endDate, { field: 'endDate' })
          const workdayJob = {
            jobId: extractJobId(canonicalLink) || verifiedNativePayload?.jobPostingInfo.jobReqId.trim() || null,
            title: job.title,
            company,
            department: detailPayload.department,
            location: displayLocation,
            city: indiaScopeLocations?.length ? extractCity(indiaScopeLocations[0]) : detailedLocations[0] || extractCity(location),
            locations: countryProof && scopeLocations ? scopeLocations : detailedLocations,
            ...(countryProof && scopeLocations && { sourceLocationCountryScopes: scopeLocations.map((label, index) => ({
              label, scope: candidate.scopeCountryScopes[index] || 'unknown',
            })) }),
            link: canonicalLink,
            source,
            postedAt: postingDate.date,
            ...(postingDate.raw && { postingDate: postingDate.raw }),
            postingDatePrecision: postingDate.precision,
            sourcePostingDateIsExact: postingDate.exact,
            sourceListingPostedOn: job.postedOn || null,
            closingDate: closingDate.date,
            closingDatePrecision: closingDate.precision,
            sourceClosingDateIsExact: closingDate.exact,
            ...(verifiedNativePayload && detailPayload.sourceDateProvenance && {
              sourceDateProvenance: detailPayload.sourceDateProvenance,
              sourceRawDates: detailPayload.sourceRawDates,
            }),
            jobDescription: detailPayload.jobDescription,
            sourceDetailComplete,
            ...(sourceDetailComplete && nativeDetailRecovery && { sourceDetailVerifiedAt: new Date(verifiedAt || Date.now()).toISOString(),
              ...(fromRecovery && { sourceDetailFromRecovery: true }) }),
            ...(!sourceDetailComplete && { sourceDetailFailureKind:
              detailFailureReason?.name === 'WorkdayDetailBudgetExceededError' ? 'budget-exhausted'
                : detailFailureReason ? 'upstream' : 'missing-content' }),
            ...(detailPayload.sourceDescription && { sourceDescription: detailPayload.sourceDescription }),
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

          return (countryProof || matchesWorkdayLocationPattern(workdayJob, config.locationPattern))
            ? workdayJob
            : null
        },
      )

      allJobs.push(...detailedJobs.filter(Boolean))
    } finally {
      clearTimeout(detailBudgetTimer)
    }

    if (countryProof) {
      const closingInventory = new Map()
      let closingOffset = 0
      let closingTotal = null
      let closingPages = 0
      for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
        const payload = await fetchWorkdayJobsApiPage({ jobsApiUrl, bootstrapUrl: searchUrl,
          appliedFacets: {}, searchText: '', offset: closingOffset, source, session, signal,
          requestTimeoutMs, retryBaseDelayMs, circuitBreaker, requestScheduler, requireProofResponse: true })
        closingPages++
        if (closingTotal == null) closingTotal = payload.total
        if (payload.total !== reportedTotal || payload.total !== closingTotal) {
          throw buildWorkdayIncompleteListingError(source, 'closing complete-board count changed')
        }
        for (const job of payload.jobPostings) {
          const link = buildWorkdayJobDetailUrl(job.externalPath, detailUrlBase, baseUrl)
          const identity = workdayInventoryIdentity(job)
          if (!link || closingInventory.has(link) || initialInventory.get(link) !== identity) {
            throw buildWorkdayIncompleteListingError(source, 'closing complete-board role identity changed or repeated')
          }
          closingInventory.set(link, identity)
        }
        closingOffset += payload.jobPostings.length
        if (closingOffset >= closingTotal) break
        if (!payload.jobPostings.length || pageNum === maxPages) {
          throw buildWorkdayIncompleteListingError(source, 'closing complete-board inventory was truncated')
        }
      }
      if (initialInventory.size !== reportedTotal || closingInventory.size !== reportedTotal) {
        throw buildWorkdayIncompleteListingError(source, 'initial and closing complete-board role sets do not reconcile')
      }
      const identities = [...initialInventory.values()].sort()
      Object.defineProperty(allJobs, WORKDAY_COUNTRY_INVENTORY_PROOF, { value: {
        scope: 'complete-board-country-proof', boardReceipt,
        initial: { reportedTotal, count: initialInventory.size, sha256: hashWorkdayProof(JSON.stringify(identities)) },
        closing: { reportedTotal: closingTotal, count: closingInventory.size,
          sha256: hashWorkdayProof(JSON.stringify([...closingInventory.values()].sort())), verifiedAt: new Date().toISOString() },
        roles: scopeCandidates.map(candidate => ({ url: candidate.canonicalLink,
          requisitionId: candidate.scopePayload.jobPostingInfo.jobReqId,
          locations: candidate.scopeLocations, countryScopes: candidate.scopeCountryScopes })),
      } })
      pagesFetched += closingPages
    }
    return attachInventoryEvidence(allJobs, {
      status: 'complete-inventory',
      surface: jobsApiUrl,
      firstParty: true,
      listingComplete: true,
      pagesFetched,
      reportedTotal,
      indiaFacetCount: allJobs.length,
      verifiedAt: new Date(countryProof ? Date.now() : nativeDetailRecovery?.verifiedAt || Date.now()).toISOString(),
      reason: countryProof ? 'reconciled-complete-workday-board-country-proof' : 'complete-workday-india-enumeration',
    })
  } finally {
    throwIfAborted(signal)
  }
}

// Executes the fetch-only public API pipeline for any target Workday site.
export const runWorkdayScraper = async (options) => {
  const { company, baseUrl, locationCountry, source, scraperDir } = options
  const signal = options.signal || null
  const nativeDetailRecovery = options.nativeDetailRecovery ?? currentNativeDetailRecovery()
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
  const requestScheduler = options.requestScheduler || workdayRequestScheduler
  const circuitBreaker = options.circuitBreaker || workdayHostCircuitBreaker
  const detailCircuitBreaker = options.detailCircuitBreaker || new WorkdayHostCircuitBreaker()
  const detailEnrichmentState = options.detailEnrichmentState || { disabled: false, noticeLogged: false }
  const detailEnrichmentBudgetMs = [
    options.detailEnrichmentBudgetMs,
    config.detailEnrichmentBudgetMs,
    process.env.WORKDAY_DETAIL_ENRICHMENT_BUDGET_MS,
  ].filter((value) => value != null && value !== '')
    .map(Number)
    .find((value) => Number.isFinite(value) && value >= 0)
    ?? null
  throwIfAborted(signal)

  const countryId = config.inventoryScope === 'complete-board-country-proof' ? null : Object.prototype.hasOwnProperty.call(config, 'locationCountry')
    ? config.locationCountry
    : (locationCountry || 'c4f78be1a8f14da0ab49ce1162348a5e')
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
        boardIdentityVerified: options.boardIdentityVerified === true,
        signal,
        requestTimeoutMs,
        retryBaseDelayMs,
        circuitBreaker,
        requestScheduler,
        detailCircuitBreaker,
        detailEnrichmentState,
        detailEnrichmentBudgetMs,
        nativeDetailRecovery,
      })
    } catch (error) {
      throwIfAborted(signal)
      throw markWorkdayTerminalFailure(error)
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
        boardIdentityVerified: options.boardIdentityVerified === true,
        signal,
        requestTimeoutMs,
        retryBaseDelayMs,
        circuitBreaker,
        requestScheduler,
        detailCircuitBreaker,
        detailEnrichmentState,
        detailEnrichmentBudgetMs,
        nativeDetailRecovery,
      })
    } catch (error) {
      throwIfAborted(signal)
      throw markWorkdayTerminalFailure(error)
    }
  }

  throw markWorkdayTerminalFailure(
    new Error(`[${source}] API-only Workday scraper could not infer a public Workday jobs API from ${baseUrl}`),
  )

}
