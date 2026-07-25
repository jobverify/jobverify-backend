import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const HOMEPAGE_URL = 'https://www.cashfree.com/'
export const CAREERS_PAGE_URL = 'https://www.cashfree.com/careers/'
export const SITEMAP_URL = 'https://www.cashfree.com/sitemap-index.xml'
export const NO_PUBLIC_ROUTE_URLS = [
  'https://www.cashfree.com/jobs',
  'https://www.cashfree.com/careers/jobs',
  'https://www.cashfree.com/careers/openings',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bopen positions?\b/i,
  /\bjob openings?\b/i,
  /\bapply now\b/i,
  /boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /smartrecruiters/i,
  /workdayjobs/i,
  /myworkdayjobs/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8,text/plain',
    },
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const hasOfficialHomepageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /href=["'][^"']*\/careers\/?["'#?]/i.test(page)
    && /cashfree payments/i.test(text)
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /careers/i.test(text)
    && /careers@cashfree\.com/i.test(page)
    && /mailto:careers@cashfree\.com/i.test(page)
}

export const hasOfficialSitemapSignal = (xml = '') => {
  const page = String(xml ?? '')

  return page.includes('https://www.cashfree.com/careers/')
    || (
      /<sitemapindex\b/i.test(page)
      && /https:\/\/www\.cashfree\.com\/sitemap-\d+\.xml/i.test(page)
    )
}

export const hasPublicJobsSignal = (value) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(value ?? '')))

export const createCashfreePaymentsScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Cashfree Payments homepage no longer matches the verified official surface')
    }

    const careers = await fetchPage(CAREERS_PAGE_URL)
    if (!hasOfficialCareersSignal(careers.html) || hasPublicJobsSignal(careers.html)) {
      throw new Error('Cashfree Payments careers page no longer matches the verified email-only careers surface')
    }

    const sitemap = await fetchPage(SITEMAP_URL)
    if (!hasOfficialSitemapSignal(sitemap.html)) {
      throw new Error('Cashfree Payments sitemap no longer matches the verified official surface')
    }

    for (const url of NO_PUBLIC_ROUTE_URLS) {
      const route = await fetchPage(url)

      if (hasPublicJobsSignal(route.html)) {
        throw new Error(`Cashfree Payments checked route now exposes public job listings: ${url}`)
      }

      if (Number(route.status) < 400) {
        throw new Error(`Cashfree Payments verified blocked route changed: ${url}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createCashfreePaymentsScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, 'cashfreepayments')
  }
}
