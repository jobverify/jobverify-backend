import path from 'path'
import { fileURLToPath } from 'url'

import { createBrowserTextFallback } from '../../scraper-support/shared/browserTextFallback.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREER_PAGE_URL = 'https://careers.coindcx.com/opportunities'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

export const hasOpportunityShellSignal = (html) => /CoinDCX Careers\s*\|\s*Opportunities|Change Starts Together!|Find your Job Opportunity/i
  .test(String(html ?? ''))

export const hasNoPublicListingsSignal = (html) => /Didn[’']t find the position you are looking for\?[\s\S]*Drop in your CV at apply@coindcx\.com/i
  .test(String(html ?? ''))

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  attempts: 1,
  label: 'coindcx',
  timeoutMs: 15000,
})

export const createCoinDCXScraper = () => ({
  async run({ fetchText = defaultFetchText, fetchBrowserText } = {}) {
    const textFetcher = createBrowserTextFallback({
      fetchText,
      fetchBrowserText,
      userAgent: USER_AGENT,
    })

    try {
      const html = await textFetcher.fetchText(CAREER_PAGE_URL)

      if (!hasOpportunityShellSignal(html)) {
        throw new Error('CoinDCX careers page no longer matches the expected opportunities shell')
      }

      if (!hasNoPublicListingsSignal(html)) {
        throw new Error('CoinDCX careers page now appears to expose a different hiring flow')
      }

      return []
    } finally {
      await textFetcher.close()
    }
  },
})

export const run = async () => createCoinDCXScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, 'coindcx')
  }
}
