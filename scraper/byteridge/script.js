import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const CAREER_PAGE_URL = 'https://byteridge.com/careers/'

const TALENT_POOL_PATTERN = /submit\s+your\s+cv|upload\s+your\s+profile/i
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'

const UPSTREAM_TRANSPORT_ERROR_PATTERN =
  /http[\s_:-]*(?:401|403|429|5\d\d)\b|timed? out|timeout|fetch failed|connect etimedout|socket|econn|enotfound|eai_again|tls/i

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    Accept: 'text/html,application/xhtml+xml',
    'User-Agent': USER_AGENT,
  },
  label: 'byteridge',
  timeoutMs: 15000,
})

const isUpstreamTransportError = (error) =>
  UPSTREAM_TRANSPORT_ERROR_PATTERN.test(String(error?.message ?? error ?? ''))

const markUpstreamTransportError = (error) => {
  error.softFailure = true
  error.upstreamOutage = true
  error.abortRetries = true
  error.failureKind = 'network_or_timeout'
  return error
}

export const extractOpenings = (html) => {
  const content = String(html || '')
  if (TALENT_POOL_PATTERN.test(content)) return []
  return []
}

export const createByteridgeScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    try {
      const html = await fetchText(CAREER_PAGE_URL)
      return extractOpenings(html)
    } catch (error) {
      if (isUpstreamTransportError(error)) {
        throw markUpstreamTransportError(error)
      }
      throw error
    }
  },
})

export const run = async () => createByteridgeScraper().run()
