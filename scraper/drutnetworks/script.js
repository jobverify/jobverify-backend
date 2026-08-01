import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const CAREER_PAGE_URL = 'https://drut.com/'

export const validateNoOpeningsPage = (html) => {
  const page = String(html ?? '')

  return /<nav\b[\s\S]*?\bHOME\b[\s\S]*?\bABOUT\s+DRUT\b[\s\S]*?\bCONTACT\s+US\b[\s\S]*?<\/nav>/i.test(page)
    && /\bFIND\s+A\s+DRUT\b/i.test(page)
    && /\bRisk\s*\|\s*Automate\s*\|\s*Compliance\b/i.test(page)
    && /\bWHAT\s+IS\s+DRUT\b/i.test(page)
    && /robotics-based\s+automation\s+GRC\s+platform/i.test(page)
    && /Copyright[^<]*drut[^<]*All\s+Rights\s+Reserved/i.test(page)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; Jobify/1.0)',
    Accept: 'text/html,application/xhtml+xml',
  },
  label: 'drutnetworks',
  timeoutMs: 15000,
})

export const createDrutNetworksScraper = () => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const html = await fetchText(CAREER_PAGE_URL)

    if (!validateNoOpeningsPage(html)) {
      throw new Error('Drut Networks careers page no longer exposes the expected no-openings page shape')
    }

    return []
  },
})

export const run = async () => createDrutNetworksScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const jobs = await run()
  console.log(`Drut Networks jobs scraped: ${jobs.length}`)
}
