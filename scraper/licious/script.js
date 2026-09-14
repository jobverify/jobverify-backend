import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDarwinboxScraper } from '../darwinbox/script.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { LICIOUS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = LICIOUS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const CURRENT_JOBS_URL = 'https://www.licious.in/careers/jobs'
export const OFFICIAL_CAREERS_HANDOFF_URL = PROVIDER_METADATA.officialCareersHandoffUrl
export const PUBLIC_PORTAL_URL = PROVIDER_METADATA.publicPortalUrl
export const LISTING_API_URL = PROVIDER_METADATA.darwinboxListingApiUrl
export const DARWINBOX_ORIGIN = PROVIDER_METADATA.darwinboxOrigin
export const DARWINBOX_COMPANY_ID = PROVIDER_METADATA.darwinboxCompanyId

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const darwinboxScraper = createDarwinboxScraper({
  companyName: COMPANY,
  source: SOURCE,
  companyId: DARWINBOX_COMPANY_ID,
  origin: DARWINBOX_ORIGIN,
})

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const extractTitle = (html = '') => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1]) || null
}

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
    ...options,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
      ...(options.headers || {}),
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const extractOfficialDarwinboxUrl = (html = '') => {
  const match = String(html ?? '').match(
    /href=["'](https:\/\/licious\.darwinbox\.in\/ms\/candidate\/careers[^"']*)["']/i,
  )

  return match?.[1] ?? null
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = (normalizeWhitespace(page) || '').toLowerCase()

  const hasLegacyDarwinboxSurface = extractTitle(page) === 'Licious Careers'
    && text.includes('join the mix')
    && (
      text.includes('make an impact.')
      || text.includes('think you are the magic ingredient?')
      || text.includes('careers@licious.com')
    )
    && extractOfficialDarwinboxUrl(page) === OFFICIAL_CAREERS_HANDOFF_URL
  const hasCurrentFirstPartySurface =
    extractTitle(page) === 'Careers - You are the magic ingredient'
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.licious\.in\/careers["']/i.test(page)
    && /href=["']\/careers\/jobs["'][^>]*>[^<]*(?:Start Sizzling|Join the mix)/i.test(page)
    && text.includes('careers@licious.com')

  return hasLegacyDarwinboxSurface || hasCurrentFirstPartySurface
}

export const hasVerifiedEmptyFirstPartyJobsSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page) || ''
  const dataMatch = page.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)
  if (!dataMatch) return false

  let nextData
  try {
    nextData = JSON.parse(dataMatch[1])
  } catch {
    return false
  }

  const widgets = nextData?.props?.pageProps?.widgets
  return /<title[^>]*>\s*Jobs\s+[^<]*Licious Careers\s*<\/title>/i.test(page)
    && /rel=["']canonical["'][^>]+href=["']https:\/\/www\.licious\.in\/careers\/jobs["']/i.test(page)
    && /Explore open roles at Licious and apply directly through our careers portal/i.test(page)
    && Array.isArray(widgets)
    && widgets.length === 1
    && widgets[0]?.type === 'closing-cta-footer'
    && !/"@type"\s*:\s*"JobPosting"|darwinbox|greenhouse|lever\.co|myworkdayjobs/i.test(page)
}

const defaultFetchListingPage = ({ page, pageSize = 10, companyId = DARWINBOX_COMPANY_ID }) =>
  defaultFetchJson(LISTING_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      Origin: DARWINBOX_ORIGIN,
      Referer: PUBLIC_PORTAL_URL,
    },
    body: JSON.stringify({
      companyId,
      page,
      sort_option: 'new',
      limit: pageSize,
    }),
  })

export const createLiciousScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    maxPages = config.maxPages,
    fetchText = defaultFetchText,
    fetchListingPage,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Licious verified official careers page no longer matches the known public surface')
    }

    if (!extractOfficialDarwinboxUrl(careersHtml)) {
      const jobsHtml = await fetchText(CURRENT_JOBS_URL)
      if (!hasVerifiedEmptyFirstPartyJobsSignal(jobsHtml)) {
        throw new Error('Licious current first-party jobs page changed materially or now exposes public jobs')
      }
      return []
    }

    const jobs = await darwinboxScraper.run({
      maxPages,
      maxJobs,
      fetchListingPage,
    })
    const scrapedAt = now()

    return jobs.map((job) => ({
      ...job,
      scrapedAt,
    }))
  },
})

export const {
  buildCareersPageUrl,
  buildListingApiUrl,
  buildJobDetailUrl,
  extractSearchResults,
} = darwinboxScraper

export const run = async (options = {}) => createLiciousScraper().run(options)

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
