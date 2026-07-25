import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { DIGITAL_NIRVANA_INFORMATION_SYSTEMS_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialHomepageSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('Digital Nirvana: AI and Media Intelligence Solutions')
    && normalized.includes('Digital Nirvana delivers knowledge management solutions, business process automation, and AI-based workflows.')
    && normalized.includes('Support Email : support@digital-nirvana.com')
    && normalized.includes('Careers')
    && normalized.includes('Hyderabad, India')
}

export const hasEmbeddedCareersFragments = (html = '') => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('Required skill set:')
    && normalized.includes('Apply Now')
}

export const pageExposesStructuredJobListings = (html = '') =>
  /<a[^>]+href=["'][^"']*(?:\/careers\/|\/jobs\/)[^"']+["'][^>]*>\s*Apply Now\s*<\/a>/i.test(String(html ?? ''))
  || /<a[^>]+href=["'][^"']*(?:\/careers\/|\/jobs\/)[^"']+["'][^>]*>[\s\S]*?<\/a>/i.test(String(html ?? ''))

export const createDigitalNirvanaInformationSystemsScraper = () => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('The verified Digital Nirvana homepage no longer matches the trusted first-party surface')
    }
    if (!hasEmbeddedCareersFragments(homepageHtml)) {
      throw new Error('The verified Digital Nirvana homepage no longer exposes the trusted careers fragments')
    }
    if (pageExposesStructuredJobListings(homepageHtml)) {
      throw new Error('The Digital Nirvana homepage now exposes structured public job listings and needs a dedicated scraper')
    }

    return []
  },
})

export const run = async (options = {}) => createDigitalNirvanaInformationSystemsScraper().run(options)

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
