import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { HIREXA_SOLUTIONS_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export const extractPlaceholderTitles = (html = '') => [...String(html ?? '').matchAll(
  /<h4\b[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>([\s\S]*?)<\/h4>/gi,
)]
  .map((match) => normalizeWhitespace(match[1]))
  .filter(Boolean)

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)
  const titles = extractPlaceholderTitles(page)

  return /<title>\s*Careers\s*-\s*Hirexa\s*<\/title>/i.test(page)
    && text.includes('Search Job')
    && text.includes('Open positions')
    && text.includes('Apply new')
    && titles.length >= 3
}

export const hasPublicJobsSignal = (html = '') => {
  const page = String(html ?? '')
  const titles = extractPlaceholderTitles(page)
  if (titles.some((title) => title !== 'NetCraft')) return true

  return /href=["'][^"']*hirexa\.com\/careers\/[^"']+["']/i.test(page)
    || /href=["'][^"']*(?:\/jobs?\/|\/careers?\/)[^"']*["']/i.test(page)
}

export const createHirexaSolutionsScraper = () => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('HIREXA SOLUTIONS verified careers page changed materially')
    }

    if (hasPublicJobsSignal(careersHtml)) {
      throw new Error('HIREXA SOLUTIONS public jobs surface changed materially')
    }

    return []
  },
})

export const run = async (options = {}) => createHirexaSolutionsScraper().run(options)

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
