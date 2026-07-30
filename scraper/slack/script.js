import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import SLACK_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const SOURCE = SLACK_CATALOG.source
export const COMPANY = SLACK_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = SLACK_CATALOG.officialBrandName
export const VERIFIED_ON = SLACK_CATALOG.verifiedOn
export const PROVIDER_METADATA = SLACK_CATALOG
export const CAREERS_PAGE_URL = SLACK_CATALOG.companyCareerPage
export const OFFICIAL_CAREERS_PAGE_URL = SLACK_CATALOG.officialCareersPageUrl
export const PUBLIC_JOB_BOARD_HOSTNAME = SLACK_CATALOG.officialJobBoardDomain

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#038;|&amp;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '').replace(/<[^>]+>/g, ' '),
) || ''

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = stripTags(page).toLowerCase()

  return /<title>\s*Careers\s*\|\s*Slack\s*<\/title>/i.test(page)
    && normalized.includes('careers at slack')
    && normalized.includes('work with us')
    && normalized.includes('filter job listings')
    && page.includes(PUBLIC_JOB_BOARD_HOSTNAME)
}

export const extractLocationOptions = (html = '') => {
  const page = String(html ?? '')
  const selectLocationsBlock = page.match(
    /<select[^>]*(?:jobs-filter--mobile--location|mobile-location-selected|data-default-value=["']all-locations["'])[^>]*>([\s\S]*?)<\/select>/i,
  )?.[1]

  if (selectLocationsBlock) {
    return [...selectLocationsBlock.matchAll(/<option[^>]*>([\s\S]*?)<\/option>/gi)]
      .map((match) => normalizeWhitespace(match[1]))
      .filter((value) => value && !/^all locations$/i.test(value))
  }

  const locationsBlock = page.match(
    /all locations[\s\S]*?<ul[^>]*data-filter-name=["']locations["'][^>]*>([\s\S]*?)<\/ul>/i,
  )?.[1]

  if (!locationsBlock) return []

  return [...locationsBlock.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => normalizeWhitespace(match[1]))
    .filter(Boolean)
}

export const extractPublicJobUrls = (html = '') => {
  const matches = String(html ?? '').matchAll(
    /href=["'](https:\/\/salesforce\.wd12\.myworkdayjobs\.com\/[^"']+)["']/gi,
  )
  const deduped = new Set()

  for (const match of matches) {
    deduped.add(match[1])
  }

  return [...deduped]
}

export const hasIndiaLocationOption = (locations = []) =>
  locations.some((location) => /\bIndia\b/i.test(location))

export const createSlackScraper = ({
  now: defaultNow = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = defaultNow,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_PAGE_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Verified official Slack careers page changed materially')
    }

    const locationOptions = extractLocationOptions(careersHtml)
    if (locationOptions.length === 0) {
      throw new Error('Verified Slack location filter changed materially')
    }

    if (extractPublicJobUrls(careersHtml).length === 0) {
      throw new Error('Verified Slack careers handoff changed materially')
    }

    if (hasIndiaLocationOption(locationOptions)) {
      throw new Error('Verified Slack India slice changed materially')
    }

    return []
  },
})

export const run = async (options = {}) => createSlackScraper(options).run(options)

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
