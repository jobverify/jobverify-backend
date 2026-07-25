import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { APPS_ASSOCIATES_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&quot;/gi, '"')

const normalizeWhitespace = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const ATS_LINK_PATTERN =
  /(jobs?\.jobvite\.com|boards?\.greenhouse\.io|job-boards\.greenhouse\.io|jobs\.lever\.co|ashbyhq\.com|myworkdayjobs|workdayjobs|smartrecruiters|workable\.com|recruitee|darwinbox|breezy\.hr)/i

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Careers - Apps Associates\s*<\/title>/i.test(page)
    && text.includes('Advance Your Career with an Industry Leader known for Growth and Opportunity')
    && text.includes('See Our Current Job Openings')
    && text.includes('Which documents should be included with the online application and in which format?')
    && text.includes('Apps Associates offers recent graduate programs')
}

export const hasPublicJobsCatalogSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /\bJob Title:\b/i.test(text)
    || /\bLocation:\b/i.test(text)
    || /\bOpen Positions\b/i.test(text)
    || ATS_LINK_PATTERN.test(page)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createAppsAssociatesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Apps Associates careers page no longer matches the trusted first-party surface')
    }

    if (hasPublicJobsCatalogSignal(careersHtml)) {
      throw new Error('Apps Associates careers page now appears to expose a public jobs catalog')
    }

    return []
  },
})

export const run = async (options = {}) => createAppsAssociatesScraper().run(options)

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
