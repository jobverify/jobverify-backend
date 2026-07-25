import { withRetry } from './retry.js'

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

const fetchWithRetry = async (url, {
  parse = 'json',
  fetchImpl = fetch,
  attempts = 3,
  baseDelayMs = 2000,
  timeoutMs = 10000,
  label = 'fetch',
  ...requestInit
} = {}) =>
  withRetry(async () => {
    const response = await fetchImpl(url, {
      ...requestInit,
      signal: createTimeoutSignal(timeoutMs),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`)
    }

    if (parse === 'text') {
      return response.text()
    }

    const contentType = response.headers?.get?.('content-type') || ''
    if (/text\/html/i.test(contentType)) {
      throw buildHtmlInsteadOfJsonError(url, await response.text().catch(() => ''))
    }

    return response.json()
  }, {
    attempts,
    baseDelayMs,
    label,
  })

export const fetchJsonWithRetry = (url, options = {}) =>
  fetchWithRetry(url, { ...options, parse: 'json' })

export const fetchTextWithRetry = (url, options = {}) =>
  fetchWithRetry(url, { ...options, parse: 'text' })
