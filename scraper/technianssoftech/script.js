import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { TECHNIANS_SOFTECH_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'
const SHARED_LOCATION = 'Gurgaon / Mumbai / Bengaluru, India'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
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
  timeoutMs: 20000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Current Job Openings in Gurgaon, Mumbai - Nians\s*<\/title>/i.test(page)
    && text.includes('Technians is now Nians')
    && text.includes('Technology/ IT department (1)')
    && text.includes('Apply For*(Required)')
  }

export const extractRoleOptions = (html = '') => {
  const page = String(html ?? '')
  const selectMatch = page.match(/<select[^>]*id="input_86_5"[^>]*>([\s\S]*?)<\/select>/i)
  if (!selectMatch) return []

  return [...selectMatch[1].matchAll(/<option[^>]*value="[^"]*"[^>]*>([\s\S]*?)<\/option>/gi)]
    .map((match) => normalizeWhitespace(match[1]))
    .filter((value) => value && value !== 'Select Value')
}

export const run = async ({
  fetchText = defaultFetchText,
  now = () => new Date().toISOString(),
} = {}) => {
  const careersHtml = await fetchText(CAREERS_URL)

  if (!hasOfficialCareersSignal(careersHtml)) {
    throw new Error('Technians Softech verified Nians openings page changed materially')
  }

  const roles = extractRoleOptions(careersHtml)
  if (roles.length === 0) {
    throw new Error('Technians Softech verified Nians openings page no longer exposes trusted role options')
  }

  return roles.map((title) => ({
    title,
    company: COMPANY,
    source: SOURCE,
    sourceUrl: CAREERS_URL,
    applyUrl: CAREERS_URL,
    link: CAREERS_URL,
    location: SHARED_LOCATION,
    country: 'India',
    remoteStatus: 'On-site',
    companyCareerPage: CAREERS_URL,
    companyDomain: PROVIDER_METADATA.companyDomain,
    atsPlatform: PROVIDER_METADATA.atsPlatform,
    scrapedAt: now(),
  }))
}

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
