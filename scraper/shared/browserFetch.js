import { createOptimizedPage, launchBrowser } from '../utils/browser.js'

const DEFAULT_BROWSER_TIMEOUT_MS = 60000

const TEXT_CONTENT_TYPE_PATTERN = /(?:javascript|json|text\/plain|xml)/i

const readPageText = async (page) => page.evaluate(() => (
  document.body?.innerText
  || document.body?.textContent
  || document.documentElement?.innerText
  || document.documentElement?.textContent
  || ''
))

const readResponseContent = async (page, response) => {
  const headers = response?.headers?.() || {}
  const contentType = headers['content-type'] || headers['Content-Type'] || ''

  if (TEXT_CONTENT_TYPE_PATTERN.test(contentType)) {
    return readPageText(page)
  }

  return page.content()
}

export const createBrowserFetchSession = async ({
  userAgent = null,
  timeoutMs = DEFAULT_BROWSER_TIMEOUT_MS,
  waitUntil = 'domcontentloaded',
} = {}) => {
  const browser = await launchBrowser()
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
  }
}
