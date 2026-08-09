import { withRetry } from './retry.js'

const NON_RETRIABLE_HTTP_STATUSES = new Set([401, 403, 404, 410, 451])
const NON_RETRIABLE_TRANSPORT_CODES = new Set([
  'CERT_HAS_EXPIRED',
  'EAI_AGAIN',
  'ENOTFOUND',
  'ERR_CERT_DATE_INVALID',
  'ERR_NAME_NOT_RESOLVED',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
])
const NON_RETRIABLE_TRANSPORT_PATTERN =
  /(getaddrinfo\s+(?:ENOTFOUND|EAI_AGAIN)|ENOTFOUND|EAI_AGAIN|ERR_NAME_NOT_RESOLVED|the remote name could not be resolved|name or service not known|NXDOMAIN|ERR_TLS_CERT_ALTNAME_INVALID|certificate's altnames|certificate has expired|CERT_HAS_EXPIRED|ERR_CERT_DATE_INVALID|unable to verify the first certificate|UNABLE_TO_VERIFY_LEAF_SIGNATURE|unable to verify leaf signature|UNABLE_TO_GET_ISSUER_CERT_LOCALLY|unable to get local issuer certificate|SELF_SIGNED_CERT_IN_CHAIN|self signed certificate in certificate chain|Response does not match the HTTP\/1\.1 protocol|Missing expected CR after header value|Invalid header value char|HPE_INVALID_HEADER_TOKEN)/i

export const parseRetryAfterHeader = (value, nowMs = Date.now()) => {
  const normalized = String(value ?? '').trim()
  if (!normalized) {
    return null
  }

  const seconds = Number(normalized)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds * 1000)
  }

  const retryAt = Date.parse(normalized)
  if (!Number.isFinite(retryAt)) {
    return null
  }

  return Math.max(0, retryAt - nowMs)
}

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

export const composeAbortSignals = (...signals) => {
  const activeSignals = signals.filter(Boolean)
  if (activeSignals.length === 0) return undefined
  if (activeSignals.length === 1) return activeSignals[0]

  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(activeSignals)
  }

  const controller = new AbortController()
  for (const signal of activeSignals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      break
    }
    signal.addEventListener(
      'abort',
      () => controller.abort(signal.reason),
      { once: true },
    )
  }
  return controller.signal
}

const extractHtmlTitle = (html) =>
  String(html ?? '').match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || null

const buildHtmlInsteadOfJsonError = (url, html) => {
  const title = extractHtmlTitle(html)
  const haystack = `${title || ''} ${html}`
  if (/forbidden|access denied|not authorized|unauthorized/i.test(haystack)) {
    const error = new Error(`Forbidden HTML response for ${url}`)
    error.abortRetries = true
    return error
  }

  return new Error(`Expected JSON from ${url} but received HTML${title ? ` (${title})` : ''}`)
}

const buildHttpError = (response, url) => {
  const error = new Error(`HTTP ${response.status} for ${url}`)
  error.status = response.status

  if (NON_RETRIABLE_HTTP_STATUSES.has(response.status)) {
    error.abortRetries = true
  }

  if (response.status === 429) {
    const retryDelayMs = parseRetryAfterHeader(response.headers?.get?.('retry-after'))
    if (retryDelayMs != null) {
      error.retryDelayMs = retryDelayMs
    }
  }

  return error
}

const isNonRetriableTransportError = (error) => {
  const visited = new Set()
  let current = error

  while (current && !visited.has(current)) {
    visited.add(current)

    const code = typeof current?.code === 'string' ? current.code.trim() : ''
    if (code && NON_RETRIABLE_TRANSPORT_CODES.has(code)) {
      return true
    }

    const message = typeof current?.message === 'string'
      ? current.message
      : String(current ?? '')
    if (NON_RETRIABLE_TRANSPORT_PATTERN.test(message)) {
      return true
    }

    current = current?.cause
  }

  return false
}

const fetchWithRetry = async (url, {
  parse = 'json',
  fetchImpl = fetch,
  attempts = 3,
  baseDelayMs = 2000,
  timeoutMs = 10000,
  label = 'fetch',
  signal: callerSignal,
  ...requestInit
} = {}) => {
  const throwCallerAbort = () => {
    const reason = callerSignal?.reason
      || new DOMException('The operation was aborted', 'AbortError')
    const sentinel = new Error(
      reason?.message || String(reason || 'The operation was aborted'),
      { cause: reason },
    )
    sentinel.abortRetries = true
    throw sentinel
  }

  try {
    return await withRetry(async () => {
      if (callerSignal?.aborted) {
        throwCallerAbort()
      }

      try {
        const response = await fetchImpl(url, {
          ...requestInit,
          signal: composeAbortSignals(
            callerSignal,
            createTimeoutSignal(timeoutMs),
          ),
        })

        if (!response.ok) {
          throw buildHttpError(response, url)
        }

        if (parse === 'text') {
          return await response.text()
        }

        const contentType = response.headers?.get?.('content-type') || ''
        if (/text\/html/i.test(contentType)) {
          throw buildHtmlInsteadOfJsonError(url, await response.text().catch(() => ''))
        }

        return await response.json()
      } catch (error) {
        if (callerSignal?.aborted) {
          throwCallerAbort()
        }
        if (isNonRetriableTransportError(error)) {
          error.abortRetries = true
        }
        throw error
      }
    }, {
      attempts,
      baseDelayMs,
      label,
      signal: callerSignal,
    })
  } catch (error) {
    if (callerSignal?.aborted) {
      throw callerSignal.reason || error
    }
    if (attempts > 1 && error?.abortRetries !== true) {
      // Avoid multiplying shared fetch retries with the outer scraper-level retry loop.
      error.abortRetries = true
    }
    throw error
  }
}

export const fetchJsonWithRetry = (url, options = {}) =>
  fetchWithRetry(url, { ...options, parse: 'json' })

export const fetchTextWithRetry = (url, options = {}) =>
  fetchWithRetry(url, { ...options, parse: 'text' })
