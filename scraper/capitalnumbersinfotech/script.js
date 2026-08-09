import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { CAPITAL_NUMBERS_INFOTECH_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = CAPITAL_NUMBERS_INFOTECH_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim()

export const hasOfficialCareersSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)
  return normalized.includes('Stable, Rewarding Remote Work Opportunities from Capital Numbers')
    && normalized.includes('Build Your Career with Capital Numbers')
    && normalized.includes('See Current Openings')
    && normalized.includes('Rated 4.2 out of 5 on Glassdoor')
    && normalized.includes('Beware of Fake Job or Freelancing Offers')
    && (normalized.includes('jobs@capitalnumbers.com') || /mailto:jobs@capitalnumbers\.com/i.test(rawHtml))
  }

export const hasPublicJobListingSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /href=["'][^"']*(jobview|jobid=|openings?|current-openings?|applycareer)[^"']*["']/i.test(rawHtml)
    || /no\. of vacancies|location:\s|job description|view details/i.test(normalized)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createCapitalNumbersInfotechScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Capital Numbers Infotech careers page no longer matches the verified first-party surface')
    }

    if (hasPublicJobListingSignal(careersHtml)) {
      throw new Error('Capital Numbers Infotech now appears to expose public job listings and needs a verified scraper')
    }

    return []
  },
})

export const run = async (options = {}) => createCapitalNumbersInfotechScraper().run(options)

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
