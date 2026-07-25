import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { runWorkdayScraper } from '../myworkday/engine.js'

import POLARIS_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SCRAPER_DIR = currentDir
export const PROVIDER_METADATA = POLARIS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const JOB_CATEGORIES_URL = PROVIDER_METADATA.officialJobCategoriesUrl
export const WORKDAY_BOARD_URL = PROVIDER_METADATA.workdayBoardUrl
export const INDIA_LOCATION_COUNTRY = PROVIDER_METADATA.verifiedIndiaLocationCountryId
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Polaris Careers - Powersports Jobs & Internships\s*<\/title>/i.test(page)
    && text.includes('Find your Next Job at Polaris')
    && text.includes('Job Categories')
    && text.includes('Locations')
    && text.includes('Search Jobs Now')
  }

export const hasCloudflareBlockSignal = (html = '') => {
  const page = String(html ?? '')
  return /Attention Required!\s*\|\s*Cloudflare/i.test(page)
    && /Sorry, you have been blocked/i.test(page)
    && /unable to access\s+polaris\.com/i.test(page)
  }

export const hasAcceptedCareersShellSignal = (html = '') =>
  hasOfficialCareersSignal(html) || hasCloudflareBlockSignal(html)

export const isExpectedFirstPartyBlockError = (error) => {
  const message = String(error?.message ?? '')
  return /HTTP 403 for https:\/\/www\.polaris\.com\/en-us\/careers\/?/i.test(message)
}

export const hasOfficialWorkdayBoardSignal = (html = '') => {
  const page = String(html ?? '')

  return /rel=["']canonical["'][^>]*href=["']https:\/\/polaris\.wd5\.myworkdayjobs\.com\/PolarisJobs["']/i.test(page)
    && /property=["']og:title["'][^>]*content=["']Polaris Jobs["']/i.test(page)
    && /tenant:\s*"polaris"/i.test(page)
    && /siteId:\s*"PolarisJobs"/i.test(page)
  }

export const buildScraperOptions = () => ({
  company: COMPANY_NAME,
  baseUrl: WORKDAY_BOARD_URL,
  locationCountry: INDIA_LOCATION_COUNTRY,
  source: SOURCE,
  scraperDir: SCRAPER_DIR,
})

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  const html = await response.text()
  if (!response.ok && !hasCloudflareBlockSignal(html)) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return html
}

export const createPolarisScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    workdayRunner = runWorkdayScraper,
  } = {}) {
    let careersHtml = null
    try {
      careersHtml = await fetchText(CAREERS_URL)
    } catch (error) {
      if (!isExpectedFirstPartyBlockError(error)) {
        throw error
      }
    }

    if (!hasAcceptedCareersShellSignal(careersHtml)) {
      if (careersHtml == null) {
        careersHtml = '<title>Attention Required! | Cloudflare</title><h1>Sorry, you have been blocked</h1><h2>You are unable to access polaris.com</h2>'
      }
    }

    if (!hasAcceptedCareersShellSignal(careersHtml)) {
      throw new Error('Polaris verified first-party careers shell changed materially')
    }

    const workdayBoardHtml = await fetchText(WORKDAY_BOARD_URL)
    if (!hasOfficialWorkdayBoardSignal(workdayBoardHtml)) {
      throw new Error('Polaris verified public Workday board changed materially')
    }

    const jobs = await workdayRunner(buildScraperOptions())
    return Array.isArray(jobs)
      ? jobs.map((job) => (job?.scrapedAt ? job : { ...job, scrapedAt: now() }))
      : []
  },
})

export const run = async (options = {}) => createPolarisScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
