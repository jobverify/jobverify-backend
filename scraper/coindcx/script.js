import path from 'path'
import { fileURLToPath } from 'url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREER_PAGE_URL = 'https://careers.coindcx.com/opportunities'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&#x27;|&#8217;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  })

  return {
    status: response.status,
    url: response.url || url,
    html: await response.text(),
  }
}

const createFetchPageFromText = (fetchText) => async (url) => ({
  status: 200,
  url,
  html: await fetchText(url),
})

export const hasOpportunityShellSignal = (html) => /CoinDCX Careers\s*\|\s*Opportunities|Change Starts Together!|Find your Job Opportunity/i
  .test(String(html ?? ''))

export const hasNoPublicListingsSignal = (html) => /Didn[â€™']t find the position you are looking for\?[\s\S]*Drop in your CV at apply@coindcx\.com/i
  .test(String(html ?? ''))

export const hasCloudflareBlockSignal = (page = {}) => {
  const html = String(page.html ?? '')
  const text = normalizeWhitespace(html)

  return Number(page.status) === 403
    && String(page.url || '') === CAREER_PAGE_URL
    && /<title>\s*Attention Required!\s*\|\s*Cloudflare\s*<\/title>/i.test(html)
    && text.includes('Please enable cookies.')
    && text.includes('Sorry, you have been blocked')
    && (
      text.includes('unable to access coindcx.com')
      || text.includes('unable to access careers.coindcx.com')
    )
}

export const createCoinDCXScraper = () => ({
  async run({ fetchPage, fetchText } = {}) {
    const loadPage = typeof fetchPage === 'function'
      ? fetchPage
      : typeof fetchText === 'function'
        ? createFetchPageFromText(fetchText)
        : defaultFetchPage
    const page = await loadPage(CAREER_PAGE_URL)
    const html = page.html ?? ''

    if (hasCloudflareBlockSignal(page)) {
      return []
    }

    if (page.status !== 200) {
      throw new Error(`HTTP ${page.status} for ${page.url || CAREER_PAGE_URL}`)
    }

    if (!hasOpportunityShellSignal(html)) {
      throw new Error('CoinDCX careers page no longer matches the expected opportunities shell')
    }

    if (!hasNoPublicListingsSignal(html)) {
      throw new Error('CoinDCX careers page now appears to expose a different hiring flow')
    }

    return []
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
