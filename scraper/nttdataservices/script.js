import path from 'path'
import { fileURLToPath } from 'url'

import { createPhenomScraper } from '../phenom/engine.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'nttdataservices'
export const COMPANY = 'NTT Data Services'
export const HOMEPAGE_URL = 'https://www.nttdata.com/en-us'
export const CAREERS_URL = 'https://www.nttdata.com/en-us/careers'
export const JOBS_HOME_URL = 'https://careers.services.global.ntt/global/en'
export const SEARCH_RESULTS_URL = 'https://careers.services.global.ntt/global/en/search-results'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const OFFICIAL_HOMEPAGE_CANONICAL_PATTERN =
  /rel=["']canonical["'][^>]*href=["']https:\/\/www\.nttdata\.com\/en-us\/?["']/i
const OFFICIAL_HOMEPAGE_CAREERS_LINK_PATTERN =
  /href=(["'])(?:https:\/\/www\.nttdata\.com)?\/en-us\/careers\/?\1/i
const OFFICIAL_CAREERS_SEARCH_LINK_PATTERN =
  /https:\/\/careers\.services\.global\.ntt\/global\/en\/search-results\b/i
const OFFICIAL_CAREERS_JOBS_HOME_LINK_PATTERN =
  /https:\/\/careers\.services\.global\.ntt\/global\/en(?=["'])/i
const PHENOM_WIDGET_ENDPOINT_PATTERN =
  /"widgetApiEndpoint":"https:\/\/careers\.services\.global\.ntt\/widgets"/i
const SEARCH_RESULTS_PAGE_PATTERN = /"pageName":"search-results"/i

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()

  return normalized.includes('dare to redefine tomorrow')
    && /ntt[\s_]*data/i.test(page)
    && OFFICIAL_HOMEPAGE_CANONICAL_PATTERN.test(page)
    && OFFICIAL_HOMEPAGE_CAREERS_LINK_PATTERN.test(page)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()

  return normalized.includes('accelerate your career')
    && normalized.includes('career opportunities')
    && normalized.includes('all jobs')
    && normalized.includes('experienced professionals')
    && OFFICIAL_CAREERS_SEARCH_LINK_PATTERN.test(page)
    && OFFICIAL_CAREERS_JOBS_HOME_LINK_PATTERN.test(page)
}

export const hasOfficialJobsHomeSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()

  return normalized.includes('ntt data careers')
    && normalized.includes('sales jobs')
    && normalized.includes('consulting jobs')
    && normalized.includes('data center jobs')
    && /global\.careers@nttdata\.com/i.test(page)
    && PHENOM_WIDGET_ENDPOINT_PATTERN.test(page)
}

export const hasOfficialSearchResultsSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()

  return normalized.includes('search results | find the available job openings at ntt data')
    && PHENOM_WIDGET_ENDPOINT_PATTERN.test(page)
    && SEARCH_RESULTS_PAGE_PATTERN.test(page)
}

const assertOfficialHomepage = (html) => {
  if (!hasOfficialHomepageSignal(html)) {
    throw new Error(
      `NTT Data Services homepage no longer matches the verified official careers handoff: ${HOMEPAGE_URL}`,
    )
  }
}

const assertOfficialCareers = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error(
      `NTT Data Services careers page no longer matches the verified first-party jobs handoff: ${CAREERS_URL}`,
    )
  }
}

const assertOfficialJobsHome = (html) => {
  if (!hasOfficialJobsHomeSignal(html)) {
    throw new Error(
      `NTT Data Services jobs home no longer matches the verified first-party public jobs surface: ${JOBS_HOME_URL}`,
    )
  }
}

const assertOfficialSearchResults = (html) => {
  if (!hasOfficialSearchResultsSignal(html)) {
    throw new Error(
      `NTT Data Services search results page no longer matches the verified first-party public jobs surface: ${SEARCH_RESULTS_URL}`,
    )
  }
}

const phenomScraper = createPhenomScraper({
  companyName: COMPANY,
  source: SOURCE,
  baseUrl: 'https://careers.services.global.ntt',
  searchPath: '/global/en/search-results',
  scraperDir: currentDir,
})

export const {
  buildSearchResultsPageUrl,
  buildJobDetailUrl,
  extractSearchPayload,
  extractSearchResults,
  extractJobDetail,
} = phenomScraper

export const createNttDataServicesScraper = () => ({
  async run(options = {}) {
    const getPage = options.fetchText || fetchText
    const pageCache = new Map()

    const getCachedPage = async (url) => {
      if (!pageCache.has(url)) {
        pageCache.set(url, await getPage(url))
      }
      return pageCache.get(url)
    }

    assertOfficialHomepage(await getCachedPage(HOMEPAGE_URL))
    assertOfficialCareers(await getCachedPage(CAREERS_URL))
    assertOfficialJobsHome(await getCachedPage(JOBS_HOME_URL))
    assertOfficialSearchResults(await getCachedPage(SEARCH_RESULTS_URL))

    const jobs = await phenomScraper.run({
      ...options,
      fetchText: getCachedPage,
    })

    return jobs.map((job) => ({
      ...job,
      country: job.country || 'India',
    }))
  },
})

export const run = async (options = {}) => createNttDataServicesScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(
    `Running NTT Data Services scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`,
  )
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)
  const cities = [...new Set(jobs.map((job) => job.city).filter(Boolean))].sort()
  console.log(`Cities found: ${cities.join(', ')}`)
  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, SOURCE)
    console.log('DB result:', result)
    process.exit(0)
  }
}
