import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'unstop'
export const COMPANY = 'Unstop'
export const VERIFIED_ON = '2026-07-25'
export const CAREERS_PAGE_URL = 'https://unstop.com/about/unstop-careers/amp'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;|&#038;/gi, '&')
  .replace(/&quot;|&#34;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })
  return { status: response.status, url: response.url, html: await response.text() }
}

export const hasTrustedCareersSignal = (html = '') => {
  const page = String(html ?? '')
  return /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/unstop\.com\/about\/unstop-careers["']/i.test(page)
    && /Opportunities at Unstop/i.test(normalizeWhitespace(page))
    && /https:\/\/unstop\.com\/jobs\/[^"']+-unstop-\d+/i.test(page)
}

const trustedJobUrl = (value) => {
  try {
    const url = new URL(value, CAREERS_PAGE_URL)
    if (url.hostname !== 'unstop.com' || !/^\/jobs\/[^/]+-unstop-\d+$/i.test(url.pathname)) return null
    return url.toString()
  } catch {
    return null
  }
}

export const extractJobs = (html = '') => {
  const jobs = []
  const seen = new Set()
  for (const match of String(html).matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const link = trustedJobUrl(match[1])
    if (!link || seen.has(link)) continue
    const title = normalizeWhitespace(match[2])
    if (!title) continue
    seen.add(link)
    jobs.push({ title, company: COMPANY, location: 'India', link, applyUrl: link, source: SOURCE })
  }
  return jobs
}

export const createUnstopScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const careersPage = await fetchPage(CAREERS_PAGE_URL)
    if (careersPage.status !== 200 || !hasTrustedCareersSignal(careersPage.html)) {
      throw new Error('Unstop verified careers page no longer matches the trusted first-party surface')
    }
    return extractJobs(careersPage.html).map((job) => ({ ...job, scrapedAt: new Date().toISOString() }))
  },
})

export const run = async (options = {}) => createUnstopScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()
  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
