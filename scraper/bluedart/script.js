import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createPhenomScraper } from '../../scraper-support/phenom/engine.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'bluedart'
export const COMPANY = 'Blue Dart'
export const CAREERS_URL = 'https://www.bluedart.com/careers'
export const SEARCH_RESULTS_URL = 'https://careers.dhl.com/global/en/search-results?selected_fields=%7B%22businessUnit%22%3A%5B%22eCommerce+Solutions%22%5D%2C%22country%22%3A%5B%22India%22%5D%7D'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const SEARCH_RESULTS_PATH = '/global/en/search-results?selected_fields=%7B%22businessUnit%22%3A%5B%22eCommerce+Solutions%22%5D%2C%22country%22%3A%5B%22India%22%5D%7D'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/\s+/g, ' ')
  .trim()

const normalizeSelectedFields = (value) =>
  normalizeWhitespace(String(value ?? '').replace(/\+/g, ' '))

const extractVisibleText = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const getSelectedFields = (value) => {
  try {
    return normalizeSelectedFields(new URL(value).searchParams.get('selected_fields'))
  } catch {
    return null
  }
}

const hasExpectedSelectedFields = (value) =>
  getSelectedFields(value) === '{"businessUnit":["eCommerce Solutions"],"country":["India"]}'

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()
  const visibleText = extractVisibleText(page)?.toLowerCase() || ''
  const handoffUrl = decodeHtmlEntities(
    page.match(/<a[^>]+href=["']([^"']+)["'][^>]*>\s*Click Here\s*<\/a>/i)?.[1] ?? '',
  )

  return normalized.includes('for more information on job opportunities')
    && normalized.includes('click here')
    && /^https:\/\/careers\.dhl\.com\/global\/en\/search-results\b/i.test(handoffUrl)
    && hasExpectedSelectedFields(handoffUrl)
    || (
      visibleText.includes('blue dart express limited')
      && visibleText.includes('investors careers about us')
      && visibleText.includes('sign in')
      && !/search jobs|job opportunities|apply now/i.test(visibleText)
    )
}

export const hasOfficialSearchResultsSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()

  return normalized.includes('search results')
    && /"widgetApiEndpoint"\s*:\s*"https:\/\/careers\.dhl\.com\/widgets"/i.test(page)
    && /cdn\.phenompeople\.com\/CareerConnectResources/i.test(page)
    && /careers\.dhl\.com\/global\/en\/phenomtrack\.min\.js/i.test(page)
}

const phenomScraper = createPhenomScraper({
  companyName: COMPANY,
  source: SOURCE,
  baseUrl: 'https://careers.dhl.com',
  searchPath: SEARCH_RESULTS_PATH,
  scraperDir: currentDir,
})

export const {
  buildSearchResultsPageUrl,
  buildJobDetailUrl,
  extractSearchPayload,
  extractSearchResults,
  extractJobDetail,
} = phenomScraper

export const createBlueDartScraper = () => ({
  async run(options = {}) {
    const getPage = options.fetchText || fetchText
    const pageCache = new Map()

    const getCachedPage = async (url) => {
      if (!pageCache.has(url)) {
        pageCache.set(url, await getPage(url))
      }
      return pageCache.get(url)
    }

    const careersHtml = await getCachedPage(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error(`Blue Dart careers page no longer matches the verified first-party jobs handoff: ${CAREERS_URL}`)
    }

    const searchResultsHtml = await getCachedPage(SEARCH_RESULTS_URL)
    if (!hasOfficialSearchResultsSignal(searchResultsHtml)) {
      throw new Error(`Blue Dart DHL search results page no longer matches the verified Phenom jobs surface: ${SEARCH_RESULTS_URL}`)
    }

    const jobs = await phenomScraper.run({
      ...options,
      fetchText: getCachedPage,
    })

    return jobs.map((job) => ({
      ...job,
      publicExperienceChecked: Boolean(
        job.publicExperienceChecked
          || job.jobDescription
          || job.minimumQualification
          || job.requiredSkills?.length,
      ),
    }))
  },
})

export const run = async (options = {}) => createBlueDartScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
