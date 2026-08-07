import { createOptimizedPage, launchBrowser } from '../utils/browser.js'
import { extractTextFromPdfBuffer } from './pdfText.js'

const DEFAULT_BROWSER_TIMEOUT_MS = 60000

const TEXT_CONTENT_TYPE_PATTERN = /(?:javascript|json|text\/plain|xml)/i
const PDF_CONTENT_TYPE_PATTERN = /application\/pdf/i

const readPageText = async (page) => page.evaluate(() => (
  document.body?.innerText
  || document.body?.textContent
  || document.documentElement?.innerText
  || document.documentElement?.textContent
  || ''
))

const fetchPdfBufferViaPage = async (page, url) => {
  const payload = await page.evaluate(async (targetUrl) => {
    const response = await fetch(targetUrl, { credentials: 'include' })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${targetUrl}`)
    }

    return Array.from(new Uint8Array(await response.arrayBuffer()))
  }, url)

  return Uint8Array.from(payload)
}

const fetchTextViaPageRequest = async (
  page,
  url,
  {
    headers = {},
    method = 'GET',
    body = null,
  } = {},
) => page.evaluate(async ({
  targetUrl,
  requestHeaders,
  requestMethod,
  requestBody,
}) => {
  const response = await fetch(targetUrl, {
    method: requestMethod,
    credentials: 'include',
    headers: requestHeaders,
    ...(requestBody != null ? { body: requestBody } : {}),
  })
    const text = await response.text()

    return {
      ok: response.ok,
      status: response.status,
      url: response.url,
      text,
    }
  }, {
    targetUrl: url,
    requestHeaders: headers,
    requestMethod: method,
    requestBody: body,
  })

const readResponseContent = async (page, response) => {
  const headers = response?.headers?.() || {}
  const contentType = headers['content-type'] || headers['Content-Type'] || ''
  const responseUrl = response?.url?.() || ''

  if (TEXT_CONTENT_TYPE_PATTERN.test(contentType)) {
    return readPageText(page)
  }

  if (PDF_CONTENT_TYPE_PATTERN.test(contentType) || /\.pdf(?:$|\?)/i.test(responseUrl)) {
    try {
      // Chromium exposes the PDF viewer shell through page content, so refetch
      // the actual PDF bytes from inside the loaded page before parsing.
      return await extractTextFromPdfBuffer(await fetchPdfBufferViaPage(page, responseUrl))
    } catch {
      return ''
    }
  }

  return page.content()
}

export const createBrowserFetchSession = async ({
  userAgent = null,
  timeoutMs = DEFAULT_BROWSER_TIMEOUT_MS,
  waitUntil = 'domcontentloaded',
  settleTimeMs = 0,
  ignoreHTTPSErrors = false,
} = {}) => {
  const browser = await launchBrowser({ ignoreHTTPSErrors })
  const page = await createOptimizedPage(browser)

  if (userAgent) {
    await page.setUserAgent(userAgent)
  }

  const navigate = async (url, options = {}) => {
    const response = await page.goto(url, {
      waitUntil,
      timeout: timeoutMs,
      ...(options.referer ? { referer: options.referer } : {}),
    })

    if (!response) {
      throw new Error(`No response for ${url}`)
    }

    if (settleTimeMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, settleTimeMs))
    }

    return response
  }

  return {
    close: async () => browser.close(),
    fetchText: async (url, options = {}) => {
      const response = await navigate(url, options)

      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()} for ${url}`)
      }

      return readResponseContent(page, response)
    },
    fetchPage: async (url, options = {}) => {
      const response = await navigate(url, options)

      return {
        status: response.status(),
        url: response.url(),
        html: await readResponseContent(page, response),
      }
    },
    fetchJson: async (url, options = {}) => {
      if (options.landingUrl) {
        const landingResponse = await navigate(options.landingUrl, options)
        if (!landingResponse.ok()) {
          throw new Error(`HTTP ${landingResponse.status()} for ${options.landingUrl}`)
        }
      }

      const payload = await fetchTextViaPageRequest(page, url, options)
      if (!payload.ok) {
        throw new Error(`HTTP ${payload.status} for ${url}`)
      }

      try {
        return JSON.parse(payload.text)
      } catch (error) {
        throw new Error(`Expected JSON from ${url} but received an invalid browser payload`, {
          cause: error,
        })
      }
    },
  }
}
