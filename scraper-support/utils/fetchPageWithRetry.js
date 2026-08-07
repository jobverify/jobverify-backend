import http from 'node:http'
import https from 'node:https'

import { withRetry } from './retry.js'

const CERTIFICATE_ERROR_CODES = new Set([
  'CERT_HAS_EXPIRED',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
])

const matchesHostname = (hostname, matcher) =>
  hostname === matcher || hostname.endsWith(`.${matcher}`)

const shouldAllowInsecureTls = (url, allowInsecureTlsHosts) => {
  if (!Array.isArray(allowInsecureTlsHosts) || allowInsecureTlsHosts.length === 0) {
    return false
  }

  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return allowInsecureTlsHosts.some((value) => matchesHostname(hostname, String(value).toLowerCase()))
  } catch {
    return false
  }
}

const buildTimeoutError = (url, timeoutMs) => {
  const error = new Error(`Request timed out after ${timeoutMs}ms for ${url}`)
  error.code = 'ETIMEDOUT'
  return error
}

const buildRedirectError = (url, maxRedirects) => {
  const error = new Error(`Too many redirects for ${url}; exceeded ${maxRedirects}`)
  error.abortRetries = true
  return error
}

const shouldRetryWithoutTlsVerification = (error) => {
  const code = String(error?.code || error?.cause?.code || '').trim()
  const message = String(error?.message || error?.cause?.message || '').trim()

  return CERTIFICATE_ERROR_CODES.has(code)
    || /Hostname\/IP does not match certificate's altnames/i.test(message)
}

const requestPageOnce = (url, {
  headers = {},
  timeoutMs = 15000,
  maxRedirects = 5,
  insecureTls = false,
} = {}) => new Promise((resolve, reject) => {
  let urlObject

  try {
    urlObject = new URL(url)
  } catch (error) {
    error.abortRetries = true
    reject(error)
    return
  }

  const isHttps = urlObject.protocol === 'https:'
  const client = isHttps ? https : http
  const request = client.request(urlObject, {
    method: 'GET',
    headers: {
      'Accept-Encoding': 'identity',
      ...headers,
    },
    rejectUnauthorized: isHttps ? !insecureTls : undefined,
  }, (response) => {
    const status = Number(response.statusCode || 0)
    const redirectLocation = response.headers.location

    if (
      redirectLocation
      && [301, 302, 303, 307, 308].includes(status)
    ) {
      if (maxRedirects <= 0) {
        response.resume()
        reject(buildRedirectError(urlObject.toString(), 0))
        return
      }

      const nextUrl = new URL(redirectLocation, urlObject).toString()
      response.resume()
      requestPageOnce(nextUrl, {
        headers,
        timeoutMs,
        maxRedirects: maxRedirects - 1,
        insecureTls,
      }).then(resolve, reject)
      return
    }

    const chunks = []

    response.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })

    response.on('end', () => {
      resolve({
        status,
        url: urlObject.toString(),
        headers: response.headers,
        html: Buffer.concat(chunks).toString('utf8'),
      })
    })
  })

  request.setTimeout(timeoutMs, () => {
    request.destroy(buildTimeoutError(urlObject.toString(), timeoutMs))
  })

  request.on('error', reject)
  request.end()
})

export const fetchPageWithRetry = async (url, {
  attempts = 3,
  baseDelayMs = 2000,
  timeoutMs = 15000,
  headers = {},
  label = 'fetch-page',
  maxRedirects = 5,
  allowInsecureTlsHosts = [],
} = {}) => withRetry(async () => {
  try {
    return await requestPageOnce(url, {
      headers,
      timeoutMs,
      maxRedirects,
      insecureTls: false,
    })
  } catch (error) {
    if (
      !shouldAllowInsecureTls(url, allowInsecureTlsHosts)
      || !shouldRetryWithoutTlsVerification(error)
    ) {
      throw error
    }

    return requestPageOnce(url, {
      headers,
      timeoutMs,
      maxRedirects,
      insecureTls: true,
    })
  }
}, {
  attempts,
  baseDelayMs,
  label,
})

export default fetchPageWithRetry
