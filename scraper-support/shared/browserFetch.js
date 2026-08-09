import { extractTextFromPdfBuffer } from './pdfText.js'

const DEFAULT_BROWSER_TIMEOUT_MS = 60000

const TEXT_CONTENT_TYPE_PATTERN = /(?:javascript|json|text\/plain|xml)/i
const PDF_CONTENT_TYPE_PATTERN = /application\/pdf/i

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || typeof AbortSignal?.timeout !== 'function') {
    return undefined
  }

  return AbortSignal.timeout(timeoutMs)
}

const buildHeaders = (userAgent, headers = {}, referer = null) => {
  const mergedHeaders = {
    ...(userAgent ? { 'User-Agent': userAgent } : {}),
    ...headers,
  }

  if (referer) {
    mergedHeaders.Referer = referer
  }

  return mergedHeaders
}

const readResponseContent = async (response) => {
  const contentType = response.headers?.get?.('content-type') || ''
  const responseUrl = response.url || ''

  if (TEXT_CONTENT_TYPE_PATTERN.test(contentType)) {
    return response.text()
  }

  if (PDF_CONTENT_TYPE_PATTERN.test(contentType) || /\.pdf(?:$|\?)/i.test(responseUrl)) {
    try {
      return await extractTextFromPdfBuffer(new Uint8Array(await response.arrayBuffer()))
    } catch {
      return ''
    }
  }

  return response.text()
}

export const createBrowserFetchSession = async ({
  userAgent = null,
  timeoutMs = DEFAULT_BROWSER_TIMEOUT_MS,
  waitUntil = 'domcontentloaded',
  settleTimeMs = 0,
  ignoreHTTPSErrors = false,
} = {}) => {
  const request = async (url, options = {}) => {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: buildHeaders(userAgent, options.headers, options.referer),
      ...(options.body != null ? { body: options.body } : {}),
      signal: createTimeoutSignal(timeoutMs),
    })

    if (settleTimeMs > 0) {
      await sleep(settleTimeMs)
    }

    return response
  }

  return {
    close: async () => {},
    fetchText: async (url, options = {}) => {
      const response = await request(url, options)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`)
      }

      return readResponseContent(response)
    },
    fetchPage: async (url, options = {}) => {
      const response = await request(url, options)

      return {
        status: response.status,
        url: response.url,
        html: await readResponseContent(response),
      }
    },
    fetchFinalUrl: async (url, options = {}) => {
      const response = await request(url, options)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`)
      }

      return response.url || url
    },
    fetchJson: async (url, options = {}) => {
      if (options.landingUrl) {
        const landingResponse = await request(options.landingUrl, options)
        if (!landingResponse.ok) {
          throw new Error(`HTTP ${landingResponse.status} for ${options.landingUrl}`)
        }
      }

      const response = await request(url, options)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`)
      }

      const text = await response.text()
      try {
        return JSON.parse(text)
      } catch (error) {
        throw new Error(`Expected JSON from ${url} but received an invalid API payload`, {
          cause: error,
        })
      }
    },
  }
}
