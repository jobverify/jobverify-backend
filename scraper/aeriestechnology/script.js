import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { AERIES_TECHNOLOGY_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const JOBS_BOARD_URL = PROVIDER_METADATA.jobsBoardUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&#x27;|&#8217;/gi, "'")
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeText = (value) => {
  const normalized = normalizeWhitespace(value)
  return normalized || null
}

const toAbsoluteUrl = (value, baseUrl = JOBS_BOARD_URL) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const firstMatch = (value, patterns) => {
  for (const pattern of patterns) {
    const match = String(value ?? '').match(pattern)
    const normalized = normalizeText(match?.[1])
    if (normalized) return normalized
  }

  return null
}

const slugify = (value) => normalizeText(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  || null

const hasForeignMarker = (value) =>
  /\b(united states|usa|canada|uk|united kingdom|europe|australia|singapore)\b/i.test(String(value ?? ''))

const normalizeIndiaLocation = (value) => {
  const normalized = normalizeText(value)
  if (!normalized || hasForeignMarker(normalized)) return null
  return /india$/i.test(normalized) ? normalized : `${normalized}, India`
}

const extractCity = (location) => normalizeText(String(location ?? '').split(',')[0])

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
  const text = normalizeWhitespace(page)

  return /<title>\s*Careers - Aeries Technology\s*<\/title>/i.test(page)
    && /View Current Openings/i.test(text)
    && extractJobsBoardUrl(page) === JOBS_BOARD_URL
}

export const extractJobsBoardUrl = (html = '') =>
  toAbsoluteUrl(firstMatch(html, [
    /href=["'](https:\/\/aeriestechnology\.talentrecruit\.com\/Default\.aspx)["']/i,
    /href=["'](https:\/\/aeriestechnology\.talentrecruit\.com\/?)["']/i,
  ]), JOBS_BOARD_URL)

export const hasJobsBoardSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /Browse All Jobs/i.test(text)
    && /Search\/Jobs\/\?/i.test(page)
}

export const extractListingCards = (html = '') =>
  [...String(html ?? '').matchAll(
    /<div[^>]*class=["'][^"']*\bjob-card\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
  )]
    .map((match) => {
      const cardHtml = match[1]
      const href = firstMatch(cardHtml, [
        /<a[^>]*href=["']([^"']*Search\/Jobs\/\?[^"']+)["']/i,
      ])
      const title = firstMatch(cardHtml, [
        /<a[^>]*(?:title=["']([^"']+)["'])/i,
        /<a[^>]*>([\s\S]*?)<\/a>/i,
      ])
      const location = normalizeIndiaLocation(firstMatch(cardHtml, [
        /<span[^>]*class=["'][^"']*\bjob-location\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
      ]))
      const detailUrl = toAbsoluteUrl(href)
      const requisitionId = detailUrl?.match(/\?(\d+)-/i)?.[1] ?? slugify(title)

      if (!title || !location || !detailUrl || !requisitionId) return null

      return {
        title,
        department: firstMatch(cardHtml, [
          /<span[^>]*class=["'][^"']*\bjob-department\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
        ]),
        location,
        city: extractCity(location),
        jobId: requisitionId,
        requisitionId,
        sourceUrl: detailUrl,
        applyUrl: detailUrl,
      }
    })
    .filter(Boolean)

export const createAeriesTechnologyScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Aeries Technology verified careers page no longer matches the trusted first-party surface')
    }

    const jobsBoardUrl = extractJobsBoardUrl(careersHtml)
    if (jobsBoardUrl !== JOBS_BOARD_URL) {
      throw new Error('Aeries Technology verified careers page no longer resolves to the trusted TalentRecruit board')
    }

    const boardHtml = await fetchText(jobsBoardUrl)
    if (!hasJobsBoardSignal(boardHtml)) {
      throw new Error('Aeries Technology verified board no longer matches the trusted public jobs surface')
    }

    const jobs = extractListingCards(boardHtml)
    if (jobs.length === 0) {
      throw new Error('Aeries Technology verified board no longer exposes trusted public jobs listings')
    }

    return jobs.map((job) => ({
      ...job,
      company: COMPANY,
      country: 'India',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      source: SOURCE,
      companyCareerPage: CAREERS_URL,
      companyDomain: PROVIDER_METADATA.companyDomain,
      atsPlatform: PROVIDER_METADATA.atsPlatform,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createAeriesTechnologyScraper(options).run()

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
