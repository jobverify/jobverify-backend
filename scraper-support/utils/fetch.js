import { withRetry } from './retry.js'

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
    return new Error(`Forbidden HTML response for ${url}`)
  }

  return new Error(`Expected JSON from ${url} but received HTML${title ? ` (${title})` : ''}`)
}

const buildHttpError = (response, url) => {
  const error = new Error(`HTTP ${response.status} for ${url}`)
  error.status = response.status

  if (response.status === 429) {
    const retryDelayMs = parseRetryAfterHeader(response.headers?.get?.('retry-after'))
    if (retryDelayMs != null) {
      error.retryDelayMs = retryDelayMs
    }
  }

  return error
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
