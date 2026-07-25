import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import TWENTY_SECOND_CENTURY_TECHNOLOGIES_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = TWENTY_SECOND_CENTURY_TECHNOLOGIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const toAbsoluteUrl = (value) => {
  try {
    return new URL(String(value ?? ''), CAREERS_URL).toString()
  } catch {
    return null
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

export const hasOfficialCareersSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /State of Illinois/i.test(rawHtml)
    && normalized.includes('Temporary Staffing Needs')
    && normalized.includes('Job Title')
    && normalized.includes('Link to Apply')
  }

export const extractJobCards = (html = '') => {
  const rawHtml = String(html ?? '')
  const sections = rawHtml.split(/<h2[^>]*>/i).slice(1)
  const jobs = []

  for (const section of sections) {
    const region = normalizeWhitespace(section.match(/^([\s\S]*?)<\/h2>/i)?.[1])
    if (!region) continue

    for (const row of section.matchAll(/<tr>\s*<td>([^<]+)<\/td>\s*<td><a[^>]+href=["']([^"']+)["'][^>]*>\s*Apply Now\s*<\/a><\/td>\s*<\/tr>/gi)) {
      const title = normalizeWhitespace(row[1])
      const applyUrl = toAbsoluteUrl(row[2])
      const department = `State of Illinois - ${region}`

      if (!title || !applyUrl) continue

      jobs.push({
        title,
        department,
        location: 'Illinois, United States',
        city: 'Illinois',
        applyUrl,
        jobId: slugify(`${department} ${title}`),
      })
    }
  }

  return jobs
}

export const create22ndCenturyTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Verified 22nd Century Technologies careers page no longer matches the trusted first-party surface')
    }

    const cards = extractJobCards(careersHtml)
    if (cards.length === 0) {
      throw new Error('22nd Century Technologies official page exposes no structured public job cards')
    }

    return cards.map((card) => ({
      title: card.title,
      company: COMPANY,
      department: card.department,
      location: card.location,
      city: card.city,
      country: 'United States',
      jobId: card.jobId,
      requisitionId: card.jobId,
      sourceUrl: card.applyUrl,
      applyUrl: card.applyUrl,
      employmentType: null,
      experienceRequired: null,
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

export const run = async (options = {}) => create22ndCenturyTechnologiesScraper().run(options)

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
