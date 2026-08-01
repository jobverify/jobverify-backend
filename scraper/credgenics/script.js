import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'credgenics'
export const COMPANY = 'Credgenics'
export const HOMEPAGE_URL = 'https://www.credgenics.com/'
export const LINKEDIN_COMPANY_ID = '14634991'
export const VERIFIED_LINKEDIN_JOBS_URL =
  `https://www.linkedin.com/jobs/search/?f_C=${LINKEDIN_COMPANY_ID}&geoId=92000000`

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const toAbsoluteUrl = (value) => {
  if (!value) return null

  try {
    return new URL(value, HOMEPAGE_URL).toString()
  } catch {
    return null
  }
}

const normalizeLinkedInJobsUrl = (value) => {
  const absoluteUrl = toAbsoluteUrl(value)
  if (!absoluteUrl) return null

  try {
    const url = new URL(absoluteUrl)
    const hostname = url.hostname.replace(/^www\./i, '').toLowerCase()

    if (hostname !== 'linkedin.com') return null

    if (/^\/authwall\/?$/i.test(url.pathname)) {
      const redirected = url.searchParams.get('sessionRedirect')
      return redirected ? normalizeLinkedInJobsUrl(redirected) : null
    }

    if (/^\/company\/credgenics\/jobs\/?$/i.test(url.pathname)) {
      return VERIFIED_LINKEDIN_JOBS_URL
    }

    if (/^\/jobs\/search\/?$/i.test(url.pathname)) {
      if (url.searchParams.get('f_C') !== LINKEDIN_COMPANY_ID) return null

      const normalized = new URL('https://www.linkedin.com/jobs/search/')
      normalized.searchParams.set('f_C', LINKEDIN_COMPANY_ID)
      normalized.searchParams.set('geoId', url.searchParams.get('geoId') || '92000000')
      return normalized.toString()
    }
  } catch {
    return null
  }

  return null
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*Credgenics\s*\|\s*Debt Collections\s*(?:&amp;|&)\s*Resolution Platform/i.test(page)
    && /Supercharge debt collections with AI-driven full-stack platform/i.test(text)
    && /India'?s Best Selling AI-powered Loan Collections Platform/i.test(text)
    && /\bCompany\b/i.test(text)
    && /support@credgenics\.com/i.test(text)
    && /Analog Legalhub Technology Solutions Pvt\. Ltd\.\s*All Rights Reserved\./i.test(text)
}

export const extractLinkedInJobsUrl = (html) => {
  for (const match of String(html ?? '').matchAll(/<a[^>]+href=["']([^"']+)["']/gi)) {
    const linkedInUrl = normalizeLinkedInJobsUrl(match[1])
    if (linkedInUrl) return linkedInUrl
  }

  return null
}

export const pageExposesFirstPartyJobsSignal = (html) => {
  for (const match of String(html ?? '').matchAll(/href=["']([^"']+)["']/gi)) {
    const absoluteUrl = toAbsoluteUrl(match[1])
    if (!absoluteUrl) continue

    const url = new URL(absoluteUrl)
    const hostname = url.hostname.replace(/^www\./i, '').toLowerCase()
    if (hostname !== 'credgenics.com') continue
    if (/\/(?:careers?|jobs?)(?:\/|$)/i.test(url.pathname)) return true
  }

  return false
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createCredgenicsScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)

    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Credgenics official homepage changed; refusing to assume the verified surface still applies')
    }

    if (pageExposesFirstPartyJobsSignal(homepageHtml)) {
      throw new Error('Credgenics homepage now appears to expose a first-party public jobs surface')
    }

    const linkedInJobsUrl = extractLinkedInJobsUrl(homepageHtml)
    if (linkedInJobsUrl && linkedInJobsUrl !== VERIFIED_LINKEDIN_JOBS_URL) {
      throw new Error('Credgenics careers handoff changed; refusing to assume the verified external route still applies')
    }

    return []
  },
})

export const run = async (options = {}) => createCredgenicsScraper().run(options)

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
