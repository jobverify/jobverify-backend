import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { runApiPortalScraper } from '../apiPortal/engine.js'

import MICRON_TECHNOLOGY_INDIA_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = MICRON_TECHNOLOGY_INDIA_CATALOG
export const SOURCE = MICRON_TECHNOLOGY_INDIA_CATALOG.source
export const COMPANY = MICRON_TECHNOLOGY_INDIA_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = MICRON_TECHNOLOGY_INDIA_CATALOG.officialBrandName
export const VERIFIED_ON = MICRON_TECHNOLOGY_INDIA_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = MICRON_TECHNOLOGY_INDIA_CATALOG.verifiedSurfaceSummary
export const HOMEPAGE_URL = MICRON_TECHNOLOGY_INDIA_CATALOG.homepageUrl
export const OFFICIAL_CAREERS_URL = MICRON_TECHNOLOGY_INDIA_CATALOG.companyCareerPage
export const PUBLIC_BOARD_URL = MICRON_TECHNOLOGY_INDIA_CATALOG.publicBoardUrl
export const LISTING_API_URL = MICRON_TECHNOLOGY_INDIA_CATALOG.listingApiUrl

const API_QUERY = MICRON_TECHNOLOGY_INDIA_CATALOG.apiQuery

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = async (url) => {
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

const defaultFetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain,*/*',
      ...(options.headers || {}),
    },
    body: options.body,
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const buildListingApiUrl = ({
  start = 0,
  limit = 10,
} = {}) => {
  const url = new URL(LISTING_API_URL)
  url.searchParams.set('domain', API_QUERY.domain)
  url.searchParams.set('query', API_QUERY.query)
  url.searchParams.set('location', API_QUERY.location)
  url.searchParams.set('start', String(start))
  url.searchParams.set('limit', String(limit))
  return url.toString()
}

export const buildDetailApiUrl = (jobId) =>
  `https://careers.micron.com/api/pcsx/position_details?position_id=${jobId}&domain=micron.com&hl=en`

export const isIndiaLocation = (value = '') => /india/i.test(String(value ?? ''))

export const hasOfficialMicronIndiaCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page).toLowerCase()

  return (
    text.includes('micron')
    && text.includes('search current jobs')
    && text.includes('hyderabad')
    && text.includes('india')
    && page.includes(PUBLIC_BOARD_URL)
  )
}

export const buildMicronTechnologyIndiaApiProvider = () => ({
  source: SOURCE,
  companyName: COMPANY,
  companyCareerPage: OFFICIAL_CAREERS_URL,
  countryFilter: 'India',
  config: {
    discovery: {
      listingApiUrl: LISTING_API_URL,
    },
    request: {
      method: 'GET',
      query: API_QUERY,
    },
    pagination: {
      strategy: 'offset-limit',
      pageSize: 10,
      offsetParam: 'start',
      limitParam: 'limit',
      resultsPath: 'data.positions',
      totalCountPath: 'data.count',
    },
    mapping: {
      title: 'name',
      location: 'locations.0',
      jobId: 'id',
      requisitionId: 'displayJobId',
      sourceUrl: {
        path: 'data',
        valuePath: 'publicUrl',
      },
      applyUrl: {
        path: 'data',
        valuePath: 'publicUrl',
      },
      department: 'department',
      postingDate: 'postedTs',
    },
    detail: {
      enabled: true,
      urlTemplate:
        'https://careers.micron.com/api/pcsx/position_details?position_id={{jobId}}&domain=micron.com&hl=en',
      method: 'GET',
      mapping: {
        jobDescription: 'data.jobDescription',
      },
    },
    resultFilter: {
      include: [
        {
          field: 'location',
          pattern: 'india|hyderabad|bengaluru|bangalore|gujarat',
        },
      ],
      exclude: [],
    },
  },
})

export const createMicronTechnologyIndiaScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
  } = {}) {
    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)

    if (!hasOfficialMicronIndiaCareersSignal(careersHtml)) {
      throw new Error('The verified Micron India careers page no longer matches the public jobs handoff')
    }

    return runApiPortalScraper({
      provider: buildMicronTechnologyIndiaApiProvider(),
      fetchJson,
    })
  },
})

export const run = async () => createMicronTechnologyIndiaScraper().run()

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
