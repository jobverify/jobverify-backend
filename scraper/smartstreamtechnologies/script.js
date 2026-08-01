import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { SMARTSTREAM_TECHNOLOGIES_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const CAREERS_EMAIL = 'careers@smart.stream'

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

const PUBLIC_JOBS_LINK_PATTERN =
  /(jobs?\.jobvite\.com|boards?\.greenhouse\.io|job-boards\.greenhouse\.io|jobs\.lever\.co|ashbyhq\.com|myworkdayjobs|workdayjobs|smartrecruiters|workable\.com|recruitee|darwinbox|breezy\.hr)/i

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Careers at Smartstream \| Financial Technology Jobs\s*<\/title>/i.test(page)
    && text.includes('Innovate. Grow. Lead the Future of Data Automation.')
    && text.includes('careers@smart.stream')
    && text.includes('Apply Online. Browse roles & submit your CV')
    && text.includes('View All Roles')
}

export const hasPublicJobsCatalogSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /Job Title:/i.test(text)
    || /Location:/i.test(text)
    || /Experience:/i.test(text)
    || PUBLIC_JOBS_LINK_PATTERN.test(page)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createSmartStreamTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified SmartStream Technologies careers page no longer matches the trusted first-party surface')
    }

    if (hasPublicJobsCatalogSignal(careersHtml)) {
      throw new Error('SmartStream Technologies careers page now appears to expose a public jobs catalog')
    }

    return []
  },
})

export const run = async (options = {}) => createSmartStreamTechnologiesScraper().run(options)

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
