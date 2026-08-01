import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import NOCCARC_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = NOCCARC_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const OUTBOUND_JOB_HOST = PROVIDER_METADATA.publicJobListingHost

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&#x27;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripHtml = (value) => normalizeWhitespace(String(value ?? ''))

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const extractJobsSection = (html = '') => {
  const rawHtml = String(html ?? '')
  const markers = [
    'Based on 99 Reviews',
    'Ranked on',
    'All Rights Reserved',
  ]

  for (const marker of markers) {
    const match = rawHtml.match(
      new RegExp(`Job(?:&nbsp;|\\s)+Openings([\\s\\S]*?)${escapeRegex(marker)}`, 'i'),
    )
    if (match?.[1]) return match[1]
  }

  return rawHtml
}

const deriveCity = (location) => {
  const normalized = String(location ?? '').trim()
  if (!normalized) return null
  if (normalized.includes(',')) return null
  if (/\bor\b/i.test(normalized) || normalized.includes('(')) return null
  return normalized
}

const extractJobId = (url) => {
  try {
    const pathname = new URL(url).pathname
    return pathname.match(/(\d{6,})$/)?.[1] || null
  } catch {
    return null
  }
}

export const hasOfficialCareersSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*Careers at Noccarc(?:\s*\|[\s\S]*?)?\s*<\/title>/i.test(rawHtml)
    && normalized.includes('Careers at Noccarc')
    && normalized.includes('Job Openings')
}

export const extractJobCards = (html = '') => {
  const sectionHtml = extractJobsSection(html)
  const cards = []

  for (const match of sectionHtml.matchAll(
    /<a[^>]+href="(https:\/\/www\.naukri\.com\/job-listings[^"]+)"[^>]*>[\s\S]*?<\/a>[\s\S]*?<h[1-6][^>]*>\s*([\s\S]*?)\s*<\/h[1-6]>[\s\S]*?<a[^>]+href="https:\/\/www\.naukri\.com\/[^"]+"[^>]*>\s*([\s\S]*?)\s*<\/a>[\s\S]*?<a[^>]+href="https:\/\/www\.naukri\.com\/[^"]+"[^>]*>\s*([\s\S]*?years)\s*<\/a>/gi,
  )) {
    const detailUrl = match[1]?.trim() || null
    const title = stripHtml(match[2])
    const location = stripHtml(match[3])
    const experienceRequired = stripHtml(match[4])

    if (!detailUrl || !title || !location) continue

    cards.push({
      title,
      location,
      experienceRequired: experienceRequired || null,
      detailUrl,
    })
  }

  return cards
}

const mapJob = (card, scrapedAt) => {
  const jobId = extractJobId(card.detailUrl)

  return {
    title: card.title,
    company: COMPANY,
    location: card.location,
    city: deriveCity(card.location),
    country: 'India',
    link: card.detailUrl,
    applyUrl: card.detailUrl,
    sourceUrl: card.detailUrl,
    source: SOURCE,
    jobId,
    requisitionId: jobId,
    department: null,
    employmentType: null,
    experienceRequired: card.experienceRequired,
    jobDescription: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    remoteStatus: 'On-site',
    scrapedAt,
  }
}

export const createNoccarcScraper = ({
  maxJobs = null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Noccarc official careers page changed materially')
    }

    const cards = extractJobCards(careersHtml)
    if (cards.length === 0) {
      throw new Error('Noccarc verified first-party job-card structure changed materially')
    }

    const cardsToMap = Number.isFinite(maxJobs) ? cards.slice(0, maxJobs) : cards
    const scrapedAt = now()

    return cardsToMap.map((card) => mapJob(card, scrapedAt))
  },
})

export const run = async (options = {}) => createNoccarcScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
