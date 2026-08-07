import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

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

export const hasConnectTimeoutFailure = (error) => {
  const code = String(error?.cause?.code ?? error?.code ?? '')
  const message = String(error?.cause?.message ?? error?.message ?? error ?? '')

  return code === 'UND_ERR_CONNECT_TIMEOUT'
    || /\bconnect timeout\b/i.test(message)
    || /\btimeout\b/i.test(message)
}

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
  fetchBrowserText,
  now = () => new Date().toISOString(),
} = {}) => {
  try {
    let careersHtml

    try {
      careersHtml = await fetchText(CAREERS_URL)
    } catch (error) {
      if (!fetchBrowserText || !hasConnectTimeoutFailure(error)) {
        throw error
      }

      careersHtml = await fetchBrowserText(CAREERS_URL)
    }

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
  } catch (error) {
    if (hasConnectTimeoutFailure(error)) {
      return []
    }

    throw error
  }
}

const isDirectExecution = (() => {
  if (!process.argv[1]) return false

  try {
    return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  } catch {
    return false
  }
})()

if (isDirectExecution) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
