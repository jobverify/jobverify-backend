import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { URJANET_ENERGY_SOLUTIONS_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const FAQ_URL = 'https://www.arcadia.com/about-us/faqs'
export const HISTORY_URL = 'https://www.arcadia.com/about-us/company-history'
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/â€”|—/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

export const hasAcquisitionFaqSignal = (html = '') => {
  const text = normalizeWhitespace(html)
  return text.includes('what happened to urjanet? arcadia acquired urjanet in 2022.')
    && text.includes('urjanet is fully integrated')
    && text.includes('not a separate company or competitor')
}

export const hasAcquisitionHistorySignal = (html = '') => {
  const text = normalizeWhitespace(html)
  return text.includes('urjanet (2022, utility data automation)')
    && text.includes('current status: fully integrated.')
    && text.includes('urjanet is not a separate company or competitor.')
}

export const hasParentCareersSignal = (html = '') => {
  const text = normalizeWhitespace(html)
  return text.includes('change the future of energy with us')
    && text.includes('arcadia careers')
}

export const createUrjanetEnergySolutionsScraper = () => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const faqHtml = await fetchText(FAQ_URL)
    const historyHtml = await fetchText(HISTORY_URL)
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasAcquisitionFaqSignal(faqHtml) || !hasAcquisitionHistorySignal(historyHtml) || !hasParentCareersSignal(careersHtml)) {
      throw new Error('Urjanet Energy Solutions verified acquisition evidence changed materially')
    }

    return []
  },
})

export const run = async (options = {}) => createUrjanetEnergySolutionsScraper(options).run(options)

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
