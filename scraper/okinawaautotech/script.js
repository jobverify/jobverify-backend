import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'okinawaautotech'
export const COMPANY = 'Okinawa Autotech'
export const CAREERS_URL = 'https://okinawascooters.com/career'
export const OFFICIAL_DOMAIN = 'okinawascooters.com'

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

const extractField = (text, label) => {
  const match = text.match(new RegExp(`${label}\\s*:?[\\s]*([^|]+?)(?=\\s+(?:Department|Location|Experience Required|Job Code)\\s*:?[\\s]|$)`, 'i'))
  return match?.[1]?.trim() || null
}

const toOfficialApplyUrl = (value) => {
  try {
    const applyUrl = new URL(String(value ?? '').replace(/&amp;/gi, '&'), CAREERS_URL)
    if (applyUrl.hostname !== OFFICIAL_DOMAIN || !/^\/applynow\.aspx$/i.test(applyUrl.pathname)) {
      return null
    }
    return applyUrl.toString()
  } catch {
    return null
  }
}

export const hasOfficialCareersSignal = (html = '') => {
  const text = normalizeWhitespace(html)

  return text.includes('Careers')
    && text.includes('Current Openings')
    && /Okinawa Autotec Private Limited|Okinawa Autotech Internationall? Private Limited/i.test(text)
}

export const extractJobCards = (html = '') => {
  const rawHtml = String(html ?? '')
  const openingsStart = rawHtml.search(/Current Openings/i)
  const footerStart = rawHtml.search(/Copyright Okinawa Autotec|Copyright Okinawa Autotech/i)
  if (openingsStart < 0) return []

  const openingsHtml = rawHtml.slice(openingsStart, footerStart > openingsStart ? footerStart : undefined)
  const cards = []

  for (const match of openingsHtml.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>\s*Apply Now\s*<\/a>/gi)) {
    const beforeApply = openingsHtml.slice(0, match.index)
    const lastHeadingIndex = Math.max(
      beforeApply.lastIndexOf('<h2'),
      beforeApply.lastIndexOf('<h3'),
      beforeApply.lastIndexOf('<h4'),
    )
    const cardText = normalizeWhitespace(beforeApply.slice(lastHeadingIndex >= 0 ? lastHeadingIndex : 0))
    const title = normalizeWhitespace(beforeApply.slice(lastHeadingIndex).match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i)?.[1])
    const applyUrl = toOfficialApplyUrl(match[1])

    if (!applyUrl) {
      throw new Error('Okinawa Autotech careers page exposed a non-official first-party apply URL')
    }

    const department = extractField(cardText, 'Department')
    const location = extractField(cardText, 'Location')
    const experienceRequired = extractField(cardText, 'Experience Required')
    const jobId = extractField(cardText, 'Job Code')

    if (!title || !location || !jobId) {
      throw new Error('Okinawa Autotech careers page exposed an incomplete structured job card')
    }

    cards.push({
      title,
      department,
      location,
      experienceRequired,
      jobId,
      applyUrl,
    })
  }

  return cards
}

export const createOkinawaAutotechScraper = () => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Verified Okinawa Autotech careers page no longer matches the trusted first-party surface')
    }

    const cards = extractJobCards(careersHtml)
    if (cards.length === 0) {
      throw new Error('Okinawa Autotech official careers page exposes no structured public job cards')
    }

    return cards.map((card) => ({
      title: card.title,
      company: COMPANY,
      department: card.department,
      location: card.location,
      city: card.location,
      country: 'India',
      jobId: card.jobId,
      requisitionId: card.jobId,
      sourceUrl: card.applyUrl,
      applyUrl: card.applyUrl,
      employmentType: null,
      experienceRequired: card.experienceRequired,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      source: SOURCE,
      link: card.applyUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createOkinawaAutotechScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/okinawaautotech/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
