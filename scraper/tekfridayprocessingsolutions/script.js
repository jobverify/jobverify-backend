import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import TEKFRIDAY_PROCESSING_SOLUTIONS_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = TEKFRIDAY_PROCESSING_SOLUTIONS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CONTACT_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const stripTags = (value) => normalizeWhitespace(String(value ?? '').replace(/<[^>]+>/g, ' '))

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: `${SOURCE}-html`,
  timeoutMs: 15000,
})

export const hasOfficialHomepageSignal = (html = '') => {
  const text = stripTags(html)
  return text.includes('Innovation at the intersection of finance & technology')
}

export const hasPublicCareersLink = (html = '') =>
  /href=["'][^"']*(careers|career|jobs|job)[^"']*["']/i.test(String(html ?? ''))

export const hasVerifiedContactSignal = (html = '') => {
  const text = stripTags(html)
  return text.includes('happytohelp.always')
    && /tag@tekfriday\.com/i.test(text)
}

export const run = async ({ fetchText = defaultFetchText } = {}) => {
  const homepageHtml = await fetchText(HOMEPAGE_URL)
  if (!hasOfficialHomepageSignal(homepageHtml) || hasPublicCareersLink(homepageHtml)) {
    throw new Error('The verified TekFriday Processing Solutions homepage changed materially')
  }

  const contactHtml = await fetchText(CONTACT_URL)
  if (!hasVerifiedContactSignal(contactHtml)) {
    throw new Error('The verified TekFriday Processing Solutions contact surface changed materially')
  }

  return []
}

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
