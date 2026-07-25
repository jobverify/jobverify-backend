import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createOptimizedPage, launchBrowser } from '../utils/browser.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

import { GODREJ_CONSUMER_PRODUCTS_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const BROWSER_TIMEOUT_MS = 60000

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const COMPANY_DOMAIN = PROVIDER_METADATA.companyDomain
export const CAREERS_URL = PROVIDER_METADATA.officialCareersPageUrl
export const JOIN_US_URL = PROVIDER_METADATA.officialJoinUsUrl
export const VERIFIED_AT = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const LOCATION_COUNTRY_OVERRIDES = new Map([
  ['kathmandu', 'Nepal'],
])

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&#39;|&apos;|&#8217;|&rsquo;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#8211;|&ndash;|&#8212;|&mdash;/gi, '-')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/â€“|â€”|â€"/g, '-')
  .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
  .replace(/\s+/g, ' ')
  .trim()

const stripTags = (value) => normalizeWhitespace(decodeHtmlEntities(String(value ?? '')))

const extractTitle = (html = '') =>
  stripTags(String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1])

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const titleCase = (value) => String(value ?? '')
  .split(/\s+/)
  .filter(Boolean)
  .map((part) => `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}`)
  .join(' ')

const normalizeApplyUrl = (value) => {
  try {
    const url = new URL(value)
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

export const extractOfficialJoinUsUrl = (html = '') => {
  const match = String(html ?? '').match(
    /https:\/\/careers\.godrejindustries\.com\/in\/en\/godrej-consumer-products-limited-gcpl-/i,
  )
  return match?.[0] ?? null
}

const extractLabeledValue = (cardHtml, label) => {
  const pattern = new RegExp(
    `>${label}\\s*<\\/p>\\s*<(?:p|div|span)[^>]*>([\\s\\S]*?)<\\/(?:p|div|span)>`,
    'i',
  )
  return stripTags(cardHtml.match(pattern)?.[1])
}

const toIsoDate = (value) => {
  const match = String(value ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null

  const [, month, day, year] = match
  return `${year}-${month}-${day}`
}

const toLocationData = (value) => {
  const normalized = stripTags(value)
  if (!normalized) {
    return {
      location: null,
      city: null,
      country: null,
    }
  }

  const [rawCity, rawCountry] = normalized.split(',').map((part) => part?.trim()).filter(Boolean)
  const city = titleCase(rawCity)
  const country = rawCountry || LOCATION_COUNTRY_OVERRIDES.get(rawCity.toLowerCase()) || 'India'

  return {
    location: `${city}, ${country}`,
    city,
    country,
  }
}

const isFallbackError = (error) =>
  /HTTP 403|timed out|timeout|und_err_connect_timeout|connect timeout|could not connect|fetch failed/i
    .test(String(error?.message ?? error ?? ''))

const createBrowserFetchSession = async () => {
  const browser = await launchBrowser()
  const page = await createOptimizedPage(browser)
  await page.setUserAgent(USER_AGENT)

  return {
    close: async () => browser.close(),
    fetchText: async (url) => {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: BROWSER_TIMEOUT_MS,
      })

      if (!response?.ok()) {
        throw new Error(`HTTP ${response?.status?.() ?? 'unknown'} for ${url}`)
      }

      return page.content()
    },
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const extractJobCards = (html = '') => {
  const cards = []
  const segments = String(html ?? '').split(/<div\b[^>]*\bFilterCard\b[^>]*>/i).slice(1)

  for (const segment of segments) {
    const requisitionId = stripTags(segment.match(/Job ID\s*-\s*([\s\S]*?)<\/p>/i)?.[1])
    const title = stripTags(segment.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1])
    const applyUrl = normalizeApplyUrl(segment.match(/<a[^>]*href="([^"]+)"[^>]*>\s*Apply\s*<\/a>/i)?.[1])

    if (!requisitionId || !title || !applyUrl) continue

    const company = stripTags(segment.match(/<p[^>]*>\s*(Godrej Consumer Products Limited)\s*<\/p>/i)?.[1])
      || PROVIDER_METADATA.legalEntityName
    const department = extractLabeledValue(segment, 'Function')
    const rawLocation = extractLabeledValue(segment, 'Location')
    const locationData = toLocationData(rawLocation)
    const experienceRequired = stripTags(extractLabeledValue(segment, 'Required Experience'))
    const postingDate = toIsoDate(extractLabeledValue(segment, 'Posted On'))
    const employmentType = extractLabeledValue(segment, 'Job Type')
    const jobId = `${requisitionId}-${slugify(locationData.city || title)}`

    cards.push({
      title,
      company,
      requisitionId,
      jobId,
      department,
      location: locationData.location,
      city: locationData.city,
      country: locationData.country,
      experienceRequired,
      postingDate,
      employmentType,
      sourceUrl: applyUrl,
      applyUrl,
    })
  }

  return cards
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTags(page)
  const titles = new Set(extractJobCards(page).map((job) => job.title))

  return extractTitle(page) === 'Godrej Consumer Products | Careers'
    && text.includes('Craft your tomorrow')
    && text.includes('Join us')
    && extractOfficialJoinUsUrl(page) === JOIN_US_URL
    && titles.has('Research Scientist HI')
    && titles.has('Manager - Analytics')
}

export const createGodrejConsumerProductsScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    fetchBrowserText,
    now = () => new Date().toISOString(),
  } = {}) {
    let browserSession = null

    const getBrowserSession = async () => {
      if (!browserSession) {
        browserSession = await createBrowserFetchSession()
      }

      return browserSession
    }

    const browserTextFetcher = fetchBrowserText || (async (url) => {
      const session = await getBrowserSession()
      return session.fetchText(url)
    })

    const fetchPageText = async (url) => {
      try {
        return await fetchText(url)
      } catch (error) {
        if (!isFallbackError(error)) {
          throw error
        }

        return browserTextFetcher(url)
      }
    }

    try {
      const careersHtml = await fetchPageText(CAREERS_URL)
      if (!hasOfficialCareersSignal(careersHtml)) {
        throw new Error('The verified Godrej Consumer Products careers page changed materially')
      }

      return extractJobCards(careersHtml).map((job) => ({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: now(),
        companyCareerPage: CAREERS_URL,
        companyDomain: COMPANY_DOMAIN,
        atsPlatform: PROVIDER_METADATA.atsPlatform,
      }))
    } finally {
      if (browserSession) {
        await browserSession.close()
      }
    }
  },
})

export const run = async (options = {}) => createGodrejConsumerProductsScraper().run(options)

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
