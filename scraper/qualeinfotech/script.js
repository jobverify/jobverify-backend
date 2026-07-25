import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { QUALE_INFOTECH_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = QUALE_INFOTECH_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const ABOUT_URL = PROVIDER_METADATA.aboutPageUrl
export const CONTACT_URL = PROVIDER_METADATA.contactPageUrl

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

export const hasOfficialHomepageSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('Generative AI')
    && normalized.includes('Unlock Infinite Potential')
    && normalized.includes('430-432 Tower A')
    && normalized.includes('info@qualeinfotech.com')
  }

export const hasOfficialAboutSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('About Us')
    && normalized.includes('Who We Are')
    && normalized.includes('Quale Infotech is a leading innovator')
  }

export const hasOfficialContactSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('Contact Us')
    && normalized.includes('How can we help?')
    && normalized.includes('India - Gurugram')
  }

export const hasPublicCareersSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /href=["'][^"']*(careers?|jobs?|join-us|work-with-us)[^"']*["']/i.test(rawHtml)
    || /join our team|current openings|open positions|apply now/i.test(normalized)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createQualeInfotechScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Quale Infotech homepage no longer matches the verified first-party surface')
    }

    const aboutHtml = await fetchText(ABOUT_URL)
    if (!hasOfficialAboutSignal(aboutHtml)) {
      throw new Error('Quale Infotech about page no longer matches the verified first-party surface')
    }

    const contactHtml = await fetchText(CONTACT_URL)
    if (!hasOfficialContactSignal(contactHtml)) {
      throw new Error('Quale Infotech contact page no longer matches the verified first-party surface')
    }

    if (
      hasPublicCareersSignal(homepageHtml)
      || hasPublicCareersSignal(aboutHtml)
      || hasPublicCareersSignal(contactHtml)
    ) {
      throw new Error('Quale Infotech now appears to expose a public careers surface and needs a verified scraper')
    }

    return []
  },
})

export const run = async (options = {}) => createQualeInfotechScraper().run(options)

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
