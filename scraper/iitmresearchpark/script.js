import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { IITM_RESEARCH_PARK_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = IITM_RESEARCH_PARK_CATALOG.source
export const COMPANY_NAME = IITM_RESEARCH_PARK_CATALOG.companyName
export const CAREERS_URL = IITM_RESEARCH_PARK_CATALOG.companyCareerPage
export const VERIFIED_ON = IITM_RESEARCH_PARK_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = IITM_RESEARCH_PARK_CATALOG.verifiedSurfaceSummary
export const PROVIDER_METADATA = IITM_RESEARCH_PARK_CATALOG

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const MONTH_INDEX = {
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12',
}

const JOB_CARD_PATTERN =
  /<h([3-6])[^>]*>([\s\S]*?)<\/h\1>[\s\S]{0,400}?Posted:\s*[A-Za-z0-9 ,]+[\s\S]{0,400}?Valid\s+till:\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})[\s\S]{0,400}?View\s*\/\s*Apply\s*Job/gi

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&#39;|&apos;|&#x27;|&#8217;|&rsquo;/gi, "'")
  .replace(/&#8211;|&#8212;|&ndash;|&mdash;/gi, '-')
  .replace(/&amp;|&#038;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const extractTitle = (html) => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1])
}

const normalizeMonthDate = (value) => {
  const match = normalizeWhitespace(value).match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/)
  if (!match) return null

  const month = MONTH_INDEX[match[1].toLowerCase()]
  if (!month) return null

  return `${match[3]}-${month}-${match[2].padStart(2, '0')}`
}

export const extractObservedJobCards = (html = '') => [...String(html ?? '').matchAll(JOB_CARD_PATTERN)]
  .map((match) => ({
    title: normalizeWhitespace(match[2]),
    closingDate: normalizeMonthDate(match[3]),
  }))
  .filter((card) => card.title && card.closingDate)

export const extractObservedJobTitles = (html = '') =>
  extractObservedJobCards(html).map((card) => card.title)

export const extractValidTillDates = (html = '') =>
  extractObservedJobCards(html).map((card) => card.closingDate)

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const titles = extractObservedJobTitles(page)

  return extractTitle(page) === 'Careers Page | IIT Madras Research Park'
    && /View\s*\/\s*Apply\s*Job/i.test(page)
    && titles.length >= 4
}

export const hasLivePublicListings = (html = '', today = VERIFIED_ON) =>
  extractValidTillDates(html).some((date) => date > today)

export const matchesVerifiedExpiredSnapshot = (html = '') => {
  const titles = extractObservedJobTitles(html)
  const dates = extractValidTillDates(html)

  return JSON.stringify(titles) === JSON.stringify(PROVIDER_METADATA.observedExpiredJobTitles)
    && JSON.stringify(dates) === JSON.stringify(PROVIDER_METADATA.observedExpiredClosingDates)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createIITMResearchParkScraper = ({
  today = VERIFIED_ON,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('IITM Research Park official careers page no longer matches the verified public surface')
    }

    if (hasLivePublicListings(careersHtml, today)) {
      throw new Error('IITM Research Park careers page now exposes live public jobs')
    }

    if (!matchesVerifiedExpiredSnapshot(careersHtml)) {
      throw new Error('IITM Research Park expired public-listings snapshot no longer matches the verified July 16, 2026 state')
    }

    return []
  },
})

export const run = async (options = {}) => createIITMResearchParkScraper().run(options)

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
