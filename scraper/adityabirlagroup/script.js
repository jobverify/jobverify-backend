import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ADITYA_BIRLA_GROUP_CATALOG } from './catalog.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = ADITYA_BIRLA_GROUP_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_HOME_URL = PROVIDER_METADATA.companyCareerPage
export const JOB_SEARCH_URL = PROVIDER_METADATA.jobSearchUrl
export const UPLOAD_CV_URL = PROVIDER_METADATA.uploadCvUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;/gi, "'")
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const toAbsoluteUrl = (value, baseUrl) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const extractAnchorUrls = (html, baseUrl) => [...String(html ?? '').matchAll(/<a\b[^>]+href=["']([^"']+)["']/gi)]
  .map((match) => toAbsoluteUrl(match[1], baseUrl))
  .filter(Boolean)

export const hasOfficialHomepageSignal = (html) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return normalized.includes('aditya birla group of companies - history, businesses, legacy')
    && normalized.includes('join our team')
    && normalized.includes(
      'discover your next chapter with us. explore a rewarding career with aditya birla group',
    )
}

export const hasOfficialCareersHomeSignal = (html) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return normalized.includes('explore careers & opportunities across industries | aditya birla group')
    && normalized.includes('job search')
    && normalized.includes('join a team that is building the future')
}

export const extractJobSearchUrl = (html) => extractAnchorUrls(html, CAREERS_HOME_URL)
  .find((url) => url === JOB_SEARCH_URL) || null

export const extractUploadCvUrl = (html) => extractAnchorUrls(html, JOB_SEARCH_URL)
  .find((url) => url === UPLOAD_CV_URL) || null

export const extractTotalJobsCount = (html) => {
  const match = /showing\s+\d+\s*[–-]\s*\d+\s+jobs\s+out\s+of\s+(\d+)/i.exec(
    normalizeWhitespace(html),
  )
  if (!match) return null

  const total = Number.parseInt(match[1], 10)
  return Number.isFinite(total) ? total : null
}

export const extractPublicJobLinks = (html) => {
  const links = []
  const seen = new Set()
  const jobSearchOrigin = new URL(JOB_SEARCH_URL).origin

  for (const url of extractAnchorUrls(html, JOB_SEARCH_URL)) {
    if (url === UPLOAD_CV_URL || seen.has(url)) continue

    const parsed = new URL(url)
    if (parsed.origin !== jobSearchOrigin) continue
    if (/\/job-search\/[^/?#]+/i.test(parsed.pathname) || /\/job\/[^/?#]+/i.test(parsed.pathname)) {
      seen.add(url)
      links.push(url)
    }
  }

  return links
}

export const hasVerifiedZeroJobsSurface = (html) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return normalized.includes('search jobs at aditya birla group')
    && extractTotalJobsCount(html) === 0
    && normalized.includes('no jobs available')
    && normalized.includes('currently, we have no vacancies in this sector')
    && extractUploadCvUrl(html) === UPLOAD_CV_URL
}

export const hasPublicJobSignal = (html) => {
  const totalJobs = extractTotalJobsCount(html)
  return totalJobs > 0 || extractPublicJobLinks(html).length > 0
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createAdityaBirlaGroupScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Aditya Birla Group homepage no longer matches the verified official homepage')
    }

    const careersHomeHtml = await fetchText(CAREERS_HOME_URL)
    if (!hasOfficialCareersHomeSignal(careersHomeHtml)) {
      throw new Error(
        'Aditya Birla Group careers homepage no longer matches the verified public careers homepage',
      )
    }

    if (extractJobSearchUrl(careersHomeHtml) !== JOB_SEARCH_URL) {
      throw new Error(
        'Aditya Birla Group careers homepage no longer links to the verified public job-search route',
      )
    }

    const jobSearchHtml = await fetchText(JOB_SEARCH_URL)
    if (hasVerifiedZeroJobsSurface(jobSearchHtml)) {
      return []
    }

    if (hasPublicJobSignal(jobSearchHtml)) {
      throw new Error('Aditya Birla Group public jobs surface now exposes openings')
    }

    throw new Error(
      'Aditya Birla Group public job-search surface no longer matches the verified zero-jobs shell',
    )
  },
})

export const run = async (options = {}) => createAdityaBirlaGroupScraper().run(options)

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
