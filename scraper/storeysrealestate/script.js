import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'storeysrealestate'
export const COMPANY = 'Storeys Real Estate'
export const HOMEPAGE_URL = 'https://www.storeys.ae/'
export const CAREERS_URL = 'https://www.storeys.ae/careers'
export const CAREERS_API_URL = 'https://api.storeys.ae/api/v1/careers'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions?\b/i,
  /\bjob openings?\b/i,
  /\bsearch jobs\b/i,
  /\bview openings\b/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /workdayjobs/i,
  /myworkdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /breezy\.hr/i,
]

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
  redirect: 'follow',
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasPublicJobsSignal = (value) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(value ?? '')))

export const extractBundleUrl = (html, pageUrl = HOMEPAGE_URL) => {
  const match = String(html ?? '').match(/<script[^>]+src=["']([^"']*\/assets\/index-[^"']+\.js)["']/i)
  if (!match) return null

  try {
    return new URL(match[1], pageUrl).toString()
  } catch {
    return null
  }
}

export const hasHomepageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Storeys\b[\s\S]*<\/title>/i.test(page)
    && normalized.includes('Storeys')
    && /href=["']\/careers["']/i.test(page)
    && Boolean(extractBundleUrl(page, HOMEPAGE_URL))
}

export const hasCareersMarketingSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Careers\b[\s\S]*Storeys[\s\S]*<\/title>/i.test(page)
    && normalized.includes('Storeys')
    && normalized.includes('APPLY NOW')
    && /\bFAQs?\b/i.test(normalized)
    && /\bteam\b/i.test(normalized)
    && /\bstats?\b/i.test(normalized)
    && Boolean(extractBundleUrl(page, CAREERS_URL))
}

export const hasBundleApplyModalSignal = (js) => {
  const source = String(js ?? '')
  return /\/careers\b/i.test(source)
    && /https:\/\/api\.storeys\.ae\/api\/v1\/careers/i.test(source)
    && /firstName/i.test(source)
    && /lastName/i.test(source)
    && /email/i.test(source)
    && /phone/i.test(source)
    && /designation/i.test(source)
    && /resume/i.test(source)
}

export const createStoreysRealEstateScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasHomepageSignal(homepageHtml)) {
      throw new Error('Storeys official homepage no longer matches the verified first-party surface')
    }
    if (hasPublicJobsSignal(homepageHtml)) {
      throw new Error('Storeys homepage now appears to expose public jobs')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasCareersMarketingSignal(careersHtml)) {
      throw new Error('Storeys careers page no longer matches the verified first-party marketing-only surface')
    }
    if (hasPublicJobsSignal(careersHtml)) {
      throw new Error('Storeys careers page now appears to expose public jobs')
    }

    const bundleUrl = extractBundleUrl(careersHtml, CAREERS_URL) || extractBundleUrl(homepageHtml, HOMEPAGE_URL)
    if (!bundleUrl) {
      throw new Error('Storeys careers bundle URL is no longer discoverable from the verified first-party surface')
    }

    const bundleJs = await fetchText(bundleUrl)
    if (!hasBundleApplyModalSignal(bundleJs)) {
      throw new Error('Storeys careers bundle no longer matches the verified apply-modal contract')
    }
    if (hasPublicJobsSignal(bundleJs)) {
      throw new Error('Storeys careers bundle now appears to expose public jobs')
    }

    return []
  },
})

export const run = async (options = {}) => createStoreysRealEstateScraper().run(options)

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
