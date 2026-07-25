import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import provider from './provider.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = provider
export const SOURCE = provider.source
export const COMPANY = provider.companyName
export const CAREERS_URL = provider.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

const toAbsoluteUrl = (value) => {
  try {
    return new URL(value, CAREERS_URL).toString()
  } catch {
    return null
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /careers/i.test(page)
    && /Napier/i.test(page)
    && /VIEW ALL OPENINGS/i.test(text)
    && /current openings/i.test(text)
    && /LinkedIn/i.test(text)
}

export const extractSameDomainJobLinks = (html = '') => [...new Set(
  [...String(html ?? '').matchAll(/href=["']([^"']+)["']/gi)]
    .map((match) => toAbsoluteUrl(match[1]))
    .filter(Boolean)
    .filter((url) => /napierhealthcare\.com/i.test(url))
    .filter((url) => /(jobs?|openings?|positions?|vacanc|apply)/i.test(url))
    .filter((url) => url !== CAREERS_URL),
)].filter((url) => !url.startsWith(`${CAREERS_URL}#`))
 

export const run = async ({ fetchText = defaultFetchText } = {}) => {
  const careersHtml = await fetchText(CAREERS_URL)

  if (!hasOfficialCareersSignal(careersHtml)) {
    throw new Error('Napier verified careers page no longer matches the trusted first-party surface')
  }

  const publicJobLinks = extractSameDomainJobLinks(careersHtml)
  if (publicJobLinks.length > 0) {
    throw new Error('Napier public jobs surface changed materially; replace the fail-closed sentinel with a real scraper')
  }

  return []
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
