import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDarwinboxScraper } from '../darwinbox/script.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const SOURCE = 'lendingkart'
export const COMPANY_NAME = 'Lendingkart'
export const COMPANY = COMPANY_NAME
export const COMPANY_ID = 'main'
export const VERIFIED_ON = '2026-07-25'
export const OFFICIAL_SITE_URL = 'https://www.lendingkart.com/'
export const OFFICIAL_CAREERS_URL = 'https://www.lendingkart.com/careers/'
export const PUBLIC_JOBS_URL = 'https://www.lendingkart.com/job/'
export const DARWINBOX_ORIGIN = 'https://hrlendingkart.darwinbox.in'
export const PUBLIC_ALL_JOBS_URL = `${DARWINBOX_ORIGIN}/ms/candidatev2/${COMPANY_ID}/careers/allJobs`
export const VERIFIED_JOB_DETAIL_EXAMPLE_URL =
  `${DARWINBOX_ORIGIN}/ms/candidatev2/${COMPANY_ID}/careers/jobDetails/a6a2696757d426?from=all`

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&apos;|&#39;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/\s+/g, ' ')
  .trim()

const extractTitle = (html = '') => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1])
}

const normalizeComparableUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    url.hash = ''
    return url.toString().replace(/\/+$/g, '')
  } catch {
    return String(value ?? '').replace(/\/+$/g, '')
  }
}

const sameUrl = (left, right) => normalizeComparableUrl(left) === normalizeComparableUrl(right)

export const extractDarwinboxJobUrl = (html = '') => {
  for (const match of String(html ?? '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = match[1]
    const text = normalizeWhitespace(match[2])

    if (!/hrlendingkart\.darwinbox\.in/i.test(href)) continue
    if (!/apply now|apply|view details|job openings|careers|jobs/i.test(text)) continue
    if (!/\/ms\/candidatev2\/main\/careers\/jobDetails\//i.test(href)) continue

    try {
      return new URL(href, PUBLIC_JOBS_URL).toString().replace(/\/+$/g, '')
    } catch {
      return null
    }
  }

  return null
}

export const hasOfficialCareersPageSignal = (html = '') => {
  const text = normalizeWhitespace(html)

  return /career opportunities at lendingkart/i.test(extractTitle(html) || '')
    && /build the future of small business finance/i.test(text)
    && /view open positions/i.test(text)
}

export const hasPublicJobsPageSignal = (html = '') => {
  const text = normalizeWhitespace(html)

  return /jobs - lendingkart/i.test(extractTitle(html) || '')
    && /careers/i.test(text)
    && /explore job openings/i.test(text)
    && /apply now/i.test(text)
    && sameUrl(extractDarwinboxJobUrl(html), VERIFIED_JOB_DETAIL_EXAMPLE_URL)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const createConfiguredDarwinboxScraper = () => createDarwinboxScraper({
  companyName: COMPANY_NAME,
  source: SOURCE,
  companyId: COMPANY_ID,
  origin: DARWINBOX_ORIGIN,
})

export const createLendingkartScraper = ({
  now = () => new Date().toISOString(),
  darwinboxScraper = createConfiguredDarwinboxScraper(),
} = {}) => ({
  ...darwinboxScraper,
  async run({ fetchText = defaultFetchText, ...darwinboxOptions } = {}) {
    const officialCareersHtml = await fetchText(OFFICIAL_CAREERS_URL)

    if (!hasOfficialCareersPageSignal(officialCareersHtml)) {
      throw new Error('The verified Lendingkart careers page changed materially')
    }

    const publicJobsHtml = await fetchText(PUBLIC_JOBS_URL)

    if (!hasPublicJobsPageSignal(publicJobsHtml)) {
      throw new Error('The verified Lendingkart Darwinbox job detail links changed materially')
    }

    const jobs = await darwinboxScraper.run(darwinboxOptions)
    const scrapedAt = now()

    return jobs.map((job) => ({ ...job, scrapedAt }))
  },
})

export const run = async (options = {}) => createLendingkartScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
