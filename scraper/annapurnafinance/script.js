import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const HOMEPAGE_URL = 'https://annapurnafinance.in/'
export const CAREERS_PAGE_URL = 'https://annapurnafinance.in/career-openings/'
export const CAREER_ROUTE_URLS = [
  CAREERS_PAGE_URL,
  'https://annapurnafinance.in/careers/',
  'https://annapurnafinance.in/jobs/',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeUrl = (value) => String(value ?? '').replace(/\/+$/, '')

export const hasPublicJobsSignal = (html = '') =>
  /"@type"\s*:\s*"JobPosting"|current openings?|open positions?|job openings?|apply now|jobs\.lever\.co|ashbyhq\.com|greenhouse\.io|workdayjobs|myworkdayjobs|successfactors|darwinbox|oraclecloud|peoplestrong/i
    .test(String(html ?? ''))

export const hasOfficialHomepageSurface = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Annapurna Finance Pvt\. Ltd\.\s*<\/title>/i.test(page)
    && /Annapurna Finance/i.test(text)
    && /Product\s*&\s*Services/i.test(text)
    && /Our Journey/i.test(text)
    && !hasPublicJobsSignal(page)
}

export const isMissingCareerRoute = (page = {}, requestedUrl = '') => {
  const text = normalizeWhitespace(page.html)
  const expectedUrl = requestedUrl || page.url || ''

  return Number(page.status) === 404
    && normalizeUrl(page.url || expectedUrl) === normalizeUrl(expectedUrl)
    && /<title>\s*404\s*\|\s*Annapurna Finance Pvt\. Ltd\.\s*<\/title>/i.test(String(page.html ?? ''))
    && /Annapurna Finance/i.test(text)
    && !hasPublicJobsSignal(page.html)
}

export const createAnnapurnaFinanceScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !hasOfficialHomepageSurface(homepage.html)) {
      throw new Error('Annapurna Finance official homepage no longer matches the verified public surface')
    }

    for (const routeUrl of CAREER_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)
      if (!isMissingCareerRoute(routePage, routeUrl)) {
        throw new Error(`Annapurna Finance career route changed materially or now exposes public jobs: ${routeUrl}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createAnnapurnaFinanceScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, 'annapurnafinance')
  }
}
