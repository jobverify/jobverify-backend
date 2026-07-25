import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import provider from './provider.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = provider
export const SOURCE = provider.source
export const COMPANY = provider.companyName
export const HOMEPAGE_URL = provider.homepageUrl
export const CAREERS_URL = provider.companyCareerPage

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialHomepageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /Leader in Software Testing on different Platforms/i.test(page)
    && /Telecom Testing/i.test(text)
    && /Mobile-Device Testing/i.test(text)
    && /GCF Certification/i.test(text)
    && /job-openings/i.test(page)
}

export const hasCompromisedCareersSignal = (html = '') => {
  const text = normalizeWhitespace(html)

  return /NABUNG77/i.test(text)
    || /BADAK178/i.test(text)
    || /SLOT ONLINE/i.test(text)
    || /\.pages\.dev/i.test(text)
}

export const createMarquisTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Marquis Technologies homepage no longer matches the verified first-party surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasCompromisedCareersSignal(careersHtml)) {
      throw new Error('Marquis Technologies compromised careers route no longer matches the verified fail-closed contract')
    }

    return []
  },
})

export const run = async (options = {}) => createMarquisTechnologiesScraper().run(options)

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
