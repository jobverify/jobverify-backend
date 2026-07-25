import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDarwinboxScraper } from '../darwinbox/script.js'
import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const COMPANY_NAME = 'Bharti Airtel'
export const SOURCE = 'bhartiairtel'
export const DARWINBOX_COMPANY_ID = 'main'
export const DARWINBOX_ORIGIN = 'https://airtel.darwinbox.in'
export const OFFICIAL_CAREERS_URL = 'https://careers.airtel.com/'
export const PUBLIC_PORTAL_URL =
  `${DARWINBOX_ORIGIN}/ms/candidatev2/${DARWINBOX_COMPANY_ID}/careers/allJobs`

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const darwinboxScraper = createDarwinboxScraper({
  companyName: COMPANY_NAME,
  source: SOURCE,
  companyId: DARWINBOX_COMPANY_ID,
  origin: DARWINBOX_ORIGIN,
})

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const extractTitle = (html) => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1])
}

export const extractOfficialDarwinboxUrl = (html = '') => {
  const match = String(html ?? '').match(
    /https:\/\/airtel\.darwinbox\.in\/ms\/candidatev2\/main\/careers\/allJobs/i,
  )

  return normalizeWhitespace(match?.[0])
}

export const extractOfficialAirtelBundleUrl = (html = '') => {
  const match = String(html ?? '').match(
    /<script[^>]+src=["']([^"']*\/static\/js\/main\.[^"']+\.js)["'][^>]*>/i,
  )
  if (!match) return null

  try {
    return new URL(match[1], OFFICIAL_CAREERS_URL).toString()
  } catch {
    return null
  }
}

export const hasOfficialBhartiAirtelCareersShell = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page) || ''

  const oldServerRenderedSurface = extractTitle(page) === 'Airtel Careers'
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/careers\.airtel\.com\/["']/i.test(page)
    && text.toLowerCase().includes('careers at airtel')
    && /careersapi\.airtel\.com/i.test(page)
    && extractOfficialDarwinboxUrl(page) === PUBLIC_PORTAL_URL

  const currentAppShell = extractTitle(page) === 'Airtel Careers'
    && /<meta[^>]+name=["']description["'][^>]+content=["']Airtel Careers["']/i.test(page)
    && /<noscript>\s*You need to enable JavaScript to run this app\.\s*<\/noscript>/i.test(page)
    && /<div[^>]+id=["']root["'][^>]*>\s*<\/div>/i.test(page)
    && Boolean(extractOfficialAirtelBundleUrl(page))

  return oldServerRenderedSurface || currentAppShell
}

export const hasOfficialBhartiAirtelBundleSignals = (bundle = '') => (
  String(bundle ?? '').includes(PUBLIC_PORTAL_URL)
  && /careersapi\.airtel\.com/i.test(String(bundle ?? ''))
  && /(?:Explore Opportunities|["']Jobs["'])/i.test(String(bundle ?? ''))
)

export const hasOfficialBhartiAirtelCareersSignals = (html = '') => {
  const page = String(html ?? '')
  return hasOfficialBhartiAirtelCareersShell(page)
    || (
      extractTitle(page) === 'Airtel Careers'
      && /careersapi\.airtel\.com/i.test(page)
      && extractOfficialDarwinboxUrl(page) === PUBLIC_PORTAL_URL
    )
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'bharti-airtel-official',
  timeoutMs: 15000,
})

export const createBhartiAirtelScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    maxPages = config.maxPages,
    fetchText = defaultFetchText,
    fetchListingPage,
  } = {}) {
    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)

    if (!hasOfficialBhartiAirtelCareersShell(careersHtml)) {
      throw new Error('Bharti Airtel verified official careers page no longer matches the verified public surface')
    }

    if (extractOfficialDarwinboxUrl(careersHtml) !== PUBLIC_PORTAL_URL) {
      const bundleUrl = extractOfficialAirtelBundleUrl(careersHtml)
      const bundle = await fetchText(bundleUrl)

      if (!hasOfficialBhartiAirtelBundleSignals(bundle)) {
        throw new Error('Bharti Airtel verified careers bundle no longer exposes the official Darwinbox public surface')
      }
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

export const run = async (options = {}) => createBhartiAirtelScraper().run(options)

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
