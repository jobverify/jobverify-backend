import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'birlanu'
export const COMPANY = 'BirlaNu'
export const HOMEPAGE_URL = 'https://birlanu.com/'
export const CAREERS_URL = 'https://birlanu.com/people'
export const VERIFIED_LINKEDIN_URL = 'https://www.linkedin.com/company/birlanu/jobs/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const OFFICIAL_SIGNALS = [
  'People at BirlaNu | Careers, Culture & Growth Opportunities',
  'Growing together',
  'People@BirlaNu',
  'Career@BilraNu',
  'Connect with us to explore exciting career opportunities at BirlaNu.',
  'BirlaNu Limited (formerly HIL Limited)',
  '© 2025 BirlaNu.com all rights reserved',
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&copy;/gi, '©')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const toAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const isFirstPartyUrl = (value) => {
  try {
    const url = new URL(value)
    return url.hostname === 'birlanu.com' || url.hostname === 'www.birlanu.com'
  } catch {
    return false
  }
}

export const extractJoinUsUrl = (html) => {
  for (const match of String(html ?? '').matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>\s*Join Us\s*<\/a>/gi)) {
    const absoluteUrl = toAbsoluteUrl(match[1])
    if (absoluteUrl) {
      return absoluteUrl
    }
  }

  return null
}

export const hasOfficialCareersSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return OFFICIAL_SIGNALS.every((signal) => normalized.includes(signal))
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/birlanu\.com\/people["']/i.test(rawHtml)
}

export const pageExposesFirstPartyJobRecords = (html) => {
  const rawHtml = String(html ?? '')

  for (const match of rawHtml.matchAll(/href=["']([^"']+)["']/gi)) {
    const absoluteUrl = toAbsoluteUrl(match[1])
    if (!absoluteUrl || !isFirstPartyUrl(absoluteUrl)) continue

    const pathname = new URL(absoluteUrl).pathname
    if (/\/(careers?|jobs?|openings?)(\/|$)/i.test(pathname)) {
      return true
    }
  }

  return /\bcurrent openings\b|\bopen positions\b|\bjob openings\b|\bopen roles\b/i.test(rawHtml)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createBirlaNuScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('BirlaNu people page no longer matches the verified official careers surface')
    }

    const joinUsUrl = extractJoinUsUrl(careersHtml)
    if (joinUsUrl !== VERIFIED_LINKEDIN_URL) {
      throw new Error('BirlaNu people page no longer links to the verified LinkedIn handoff')
    }

    if (pageExposesFirstPartyJobRecords(careersHtml)) {
      throw new Error('BirlaNu first-party public job records now appear on the verified people page')
    }

    return []
  },
})

export const run = async (options = {}) => createBirlaNuScraper().run(options)

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
