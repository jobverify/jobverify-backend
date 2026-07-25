import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { INDMONEY_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = INDMONEY_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const ABOUT_PAGE_URL = PROVIDER_METADATA.aboutPageUrl
export const LINKEDIN_JOBS_URL = PROVIDER_METADATA.linkedinJobsUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeComparableUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    url.hash = ''
    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, '')
    }
    return url.toString()
  } catch {
    return String(value ?? '')
  }
}

const toAbsoluteUrl = (value, baseUrl = ABOUT_PAGE_URL) => {
  try {
    return new URL(String(value ?? ''), baseUrl).toString()
  } catch {
    return null
  }
}

const isOfficialDomainUrl = (value) => {
  try {
    const hostname = new URL(value).hostname.toLowerCase()
    return hostname === 'indmoney.com' || hostname === 'www.indmoney.com'
  } catch {
    return false
  }
}

const normalizeLinkedInJobsUrl = (value) => {
  const absoluteUrl = toAbsoluteUrl(value, ABOUT_PAGE_URL)
  if (!absoluteUrl) return null

  try {
    const url = new URL(absoluteUrl)
    const hostname = url.hostname.replace(/^www\./i, '').toLowerCase()
    if (hostname !== 'linkedin.com' && hostname !== 'in.linkedin.com') return null

    if (/^\/company\/indmoney\/jobs\/?$/i.test(url.pathname)) {
      return LINKEDIN_JOBS_URL
    }

    if (/^\/company\/indmoney\/?$/i.test(url.pathname)) {
      return LINKEDIN_JOBS_URL
    }

    if (/^\/authwall\/?$/i.test(url.pathname)) {
      const redirected = url.searchParams.get('sessionRedirect')
      return redirected ? normalizeLinkedInJobsUrl(redirected) : null
    }
  } catch {
    return null
  }

  return null
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const hasOfficialAboutPageSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('Our Company')
    && normalized.includes('India’s independent Super Finance App')
    && normalized.includes('Join Us')
    && normalized.includes('Join Our Team')
    && normalized.includes('INDmoney Tech Pvt. Ltd.')
    && normalized.includes('All Rights Reserved | © Copyright 2026')
}

export const extractLinkedInJobsUrl = (html = '') => {
  for (const match of String(html ?? '').matchAll(/<a[^>]+href=["']([^"']+)["']/gi)) {
    const normalizedUrl = normalizeLinkedInJobsUrl(match[1])
    if (normalizedUrl) return normalizedUrl
  }

  return null
}

export const hasFirstPartyPublicJobsSignal = (html = '') => {
  const rawHtml = String(html ?? '')

  if (/"@type"\s*:\s*"JobPosting"/i.test(rawHtml) || /\bJobPosting\b/i.test(rawHtml)) {
    return true
  }

  for (const match of rawHtml.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)) {
    const absoluteUrl = toAbsoluteUrl(match[1], ABOUT_PAGE_URL)
    if (!absoluteUrl || !isOfficialDomainUrl(absoluteUrl)) continue

    try {
      const pathname = new URL(absoluteUrl).pathname.replace(/\/+$/, '/') || '/'
      if (/^\/(?:careers?|jobs?|join-us|openings)(?:\/|$)/i.test(pathname)) {
        return true
      }
    } catch {
      // Ignore malformed URLs and continue fail-closed through the other validators.
    }
  }

  return false
}

export const createIndmoneyScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const aboutPage = await fetchPage(ABOUT_PAGE_URL)

    if (
      aboutPage.status !== 200
      || normalizeComparableUrl(aboutPage.url) !== normalizeComparableUrl(ABOUT_PAGE_URL)
    ) {
      throw new Error('INDmoney verified about page no longer matches the known first-party surface')
    }

    if (hasFirstPartyPublicJobsSignal(aboutPage.html)) {
      throw new Error('INDmoney about page now appears to expose a first-party public jobs surface')
    }

    if (!hasOfficialAboutPageSignal(aboutPage.html)) {
      throw new Error('INDmoney verified about page no longer matches the known first-party surface')
    }

    if (extractLinkedInJobsUrl(aboutPage.html) !== LINKEDIN_JOBS_URL) {
      throw new Error('INDmoney verified LinkedIn handoff changed')
    }

    return []
  },
})

export const run = async (options = {}) => createIndmoneyScraper().run(options)

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
