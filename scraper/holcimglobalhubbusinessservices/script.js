import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { HOLCIM_GLOBAL_HUB_BUSINESS_SERVICES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = HOLCIM_GLOBAL_HUB_BUSINESS_SERVICES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CATEGORY_URL = PROVIDER_METADATA.jobsCategoryUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtml(String(value ?? ''))
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const buildAbsoluteUrl = (value) => {
  try {
    return new URL(String(value ?? ''), CATEGORY_URL).toString()
  } catch {
    return null
  }
}

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return undefined

  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: createTimeoutSignal(15000),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

const normalizeLocation = (rawValue) => {
  const normalized = normalizeWhitespace(rawValue)
    .replace(/,\s*\d{6}\b/g, '')
    .replace(/,\s*IN\b/g, ', India')

  const parts = normalized.split(',').map((part) => part.trim()).filter(Boolean)
  const [city = null, state = null] = parts

  return {
    location: parts.join(', ') || null,
    city,
    state,
    country: normalized.includes('India') ? 'India' : null,
  }
}

export const hasOfficialCategorySignal = (html) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return normalized.includes('global hub business services')
    && normalized.includes('job at holcim ghbs')
    && normalized.includes('showing 1 to')
}

export const extractJobCards = (html) => {
  const cards = []
  const seen = new Set()

  for (const match of String(html ?? '').matchAll(/<a[^>]+href=["']([^"']*\/holcim_ghbs\/job\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const detailUrl = buildAbsoluteUrl(match[1])
    const title = normalizeWhitespace(match[2])
    if (!detailUrl || !title || seen.has(detailUrl)) continue

    seen.add(detailUrl)
    cards.push({ title, detailUrl })
  }

  if (cards.length === 0) {
    throw new Error('Expected verified Holcim GHBS category page with public job links')
  }

  return cards
}

export const extractJobDetail = (html, listing) => {
  const page = String(html ?? '')
  const title = normalizeWhitespace(
    page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
      || page.match(/<title[^>]*>(.*?)\s+Job Details/i)?.[1],
  )
  const rawLocation = page.match(/Location:\s*([\s\S]*?)\s*(?:Requisition ID:|<\/p>)/i)?.[1]
  const requisitionId = normalizeWhitespace(page.match(/Requisition ID:\s*([A-Z0-9-]+)/i)?.[1])
  const description = normalizeWhitespace(
    page.match(/Job Description:\s*([\s\S]*?)\s*(?:Required Skills|Does this role excite you\?|<\/body>)/i)?.[1],
  )

  if (!title || !rawLocation || !requisitionId) {
    throw new Error(`Expected verified Holcim GHBS detail page for ${listing.title}`)
  }

  const locationBits = normalizeLocation(rawLocation)

  return {
    title,
    company: COMPANY,
    location: locationBits.location,
    city: locationBits.city,
    state: locationBits.state,
    country: locationBits.country,
    jobId: listing.detailUrl.match(/\/(\d+)\/?$/)?.[1] || null,
    requisitionId,
    sourceUrl: listing.detailUrl,
    applyUrl: listing.detailUrl,
    employmentType: null,
    jobDescription: description || `Apply via the Holcim GHBS detail page for ${title}.`,
  }
}

export const createHolcimGlobalHubBusinessServicesScraper = () => ({
  async run({ fetchText = defaultFetchText, now = () => new Date() } = {}) {
    const categoryHtml = await fetchText(CATEGORY_URL)
    if (!hasOfficialCategorySignal(categoryHtml)) {
      throw new Error('Holcim GHBS verified jobs category page no longer matches the trusted first-party surface')
    }

    const listings = extractJobCards(categoryHtml)
    const scrapedAt = new Date(now()).toISOString()
    const jobs = []

    for (const listing of listings) {
      const detailHtml = await fetchText(listing.detailUrl)
      const job = extractJobDetail(detailHtml, listing)

      jobs.push({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt,
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createHolcimGlobalHubBusinessServicesScraper().run(options)

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
