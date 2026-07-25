import { fetchTextWithRetry } from '../utils/fetch.js'

export const CAREER_PAGE_URL = 'https://www.aurouniversity.edu.in/job-and-vacancies/'

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'auro',
  timeoutMs: 15000,
})

export const createAuroScraper = () => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    await fetchText(CAREER_PAGE_URL)

    // AURO publishes a general application form, not individual job records.
    return []
  },
})

export const run = async () => createAuroScraper().run()
