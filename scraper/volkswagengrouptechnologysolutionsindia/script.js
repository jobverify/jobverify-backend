import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createOptimizedPage, launchBrowser } from '../../scraper-support/utils/browser.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'volkswagengrouptechnologysolutionsindia'
export const COMPANY = 'Volkswagen Group Technology Solutions India'
export const CAREERS_URL = 'https://www.vwg-digitalsolutions.in/'
export const BOARD_URL =
  'https://career10.successfactors.com/career?company=volkswag04&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH&'
export const VERIFIED_ON = '2026-07-25'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export const hasOfficialSiteSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return /Volkswagen Group Digital Solutions/i.test(normalized)
    && /Careers/i.test(normalized)
}

export const hasNoOpeningsSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return /Career Opportunities/i.test(normalized)
    && (
      /No jobs match(?:ed)? your selections/i.test(normalized)
      || /No jobs matched\.?\s*Try widening your search/i.test(normalized)
    )
}

export const hasOpaqueBoardShellSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return /Career Opportunities/i.test(normalized)
    && /Loading\.\.\./i.test(normalized)
}

const isBrowserFallbackError = (error) =>
  /HTTP (?:403|429)\b|fetch failed|timed out|timeout|could not connect|und_err_connect_timeout|ssl\/tls secure channel|econnreset|unable to verify the first certificate|unable_to_verify_leaf_signature|err_cert_authority_invalid|certificate/i
    .test(String(error?.message ?? error ?? ''))

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  redirect: 'follow',
  label: SOURCE,
  timeoutMs: 15000,
})

export const createVolkswagenGroupTechnologySolutionsIndiaScraper = () => ({
  async run({ fetchText = defaultFetchText, fetchBrowserText } = {}) {
    let browser = null
    let page = null

    const browserTextFetcher = fetchBrowserText || (async (url) => {
      if (!browser) {
        browser = await launchBrowser({ ignoreHTTPSErrors: true })
        page = await createOptimizedPage(browser)
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36')
      }

      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 120000,
      })

      if (!response || !response.ok()) {
        throw new Error(`HTTP ${response?.status?.() ?? 'NO_RESPONSE'} for ${url}`)
      }

      try {
        await page.waitForFunction(
          (targetUrl) => {
            const text = document.body?.innerText || document.body?.textContent || ''
            if (targetUrl === 'https://www.vwg-digitalsolutions.in/') {
              return /Volkswagen Group Digital Solutions/i.test(text)
                && /Careers|Apply For Job Opportunities/i.test(text)
            }

            return /No jobs matched\.?\s*Try widening your search/i.test(text)
              || /No jobs match(?:ed)? your selections/i.test(text)
              || document.querySelectorAll('tr.jobResultItem').length > 0
          },
          { timeout: 30000 },
          url,
        )
      } catch {
        // Fall through and inspect whatever rendered text is currently available.
      }

      return await page.evaluate(() => (
        document.body?.innerText
        || document.body?.textContent
        || document.documentElement?.innerText
        || document.documentElement?.textContent
        || ''
      ))
    })

    const fetchPageText = async (url) => {
      try {
        return await fetchText(url)
      } catch (error) {
        if (!isBrowserFallbackError(error)) {
          throw error
        }

        return browserTextFetcher(url)
      }
    }

    try {
      let officialSiteHtml = await fetchPageText(CAREERS_URL)
      if (!hasOfficialSiteSignal(officialSiteHtml)) {
        officialSiteHtml = await browserTextFetcher(CAREERS_URL)
      }

      if (!hasOfficialSiteSignal(officialSiteHtml)) {
        throw new Error('The Volkswagen Group Digital Solutions India first-party surface no longer matches the verified site signal')
      }

      let boardHtml
      try {
        boardHtml = await fetchText(BOARD_URL)
      } catch (error) {
        if (!isBrowserFallbackError(error)) {
          throw error
        }

        boardHtml = await browserTextFetcher(BOARD_URL)
      }

      if (!hasNoOpeningsSignal(boardHtml) && hasOpaqueBoardShellSignal(boardHtml)) {
        boardHtml = await browserTextFetcher(BOARD_URL)
      }

      if (!hasNoOpeningsSignal(boardHtml)) {
        throw new Error('The Volkswagen SuccessFactors board no longer matches the verified no-openings contract')
      }

      return []
    } finally {
      if (browser) {
        await browser.close()
      }
    }
  },
})

export const run = (options = {}) =>
  createVolkswagenGroupTechnologySolutionsIndiaScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()
  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
