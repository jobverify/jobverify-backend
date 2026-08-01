import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const CAREER_PAGE_URL = 'https://web.superagi.com/'

const OFFICIAL_SITE_SIGNAL =
  /SuperAGI\s*\|\s*AI Super App for Work|SuperAGI combines 25\+\s*AI-Native Apps and Agents/i

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'superagi',
  timeoutMs: 15000,
})

export const hasOfficialSiteSignal = (html) => OFFICIAL_SITE_SIGNAL.test(String(html ?? ''))

export const createSuperagiScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    let html = ''

    try {
      html = await fetchText(CAREER_PAGE_URL)
    } catch (error) {
      if (/HTTP 404\b/i.test(String(error?.message ?? error))) return []
      throw error
    }

    if (!hasOfficialSiteSignal(html)) return []

    return []
  },
})

export const run = async () => createSuperagiScraper().run()
