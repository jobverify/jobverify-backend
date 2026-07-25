import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { KNOWLARITY_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = KNOWLARITY_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&#8217;|&rsquo;/gi, "'")
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/&#8212;|&mdash;/gi, '-')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtml(String(value ?? ''))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  decodeHtml(String(value ?? ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const extractNextDataText = (html = '') =>
  String(html ?? '').match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)?.[1] ?? null

export const hasVerifiedCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /<title>\s*Best B2B Company to Work for\s*-\s*Jobs\s*@\s*Knowlarity India\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.knowlarity\.com\/careers["']/i.test(page)
    && text.includes('Join us to create impact')
    && text.includes('Build a career of your potential')
    && text.includes('JOB OPENINGS')
    && text.includes('Location')
    && text.includes('Department')
    && text.includes('EMAIL US YOUR RESUME')
    && text.includes('Not Matched any profile')
  }

export const hasEmbeddedEmptyJobOpeningState = (html = '') => {
  const nextData = extractNextDataText(html)
  if (!nextData) return false

  try {
    const parsed = JSON.parse(nextData)
    const jobOpening = parsed?.props?.pageProps?.jobOpening
    return Array.isArray(jobOpening) && jobOpening.length === 0
  } catch {
    return /"jobOpening"\s*:\s*\[\s*\]/i.test(nextData)
  }
}

export const hasRenderablePublicJobsSignal = (html = '') => {
  const nextData = extractNextDataText(html)
  let embeddedJobOpeningCount = 0

  if (nextData) {
    try {
      const parsed = JSON.parse(nextData)
      const jobOpening = parsed?.props?.pageProps?.jobOpening
      if (Array.isArray(jobOpening)) embeddedJobOpeningCount = jobOpening.length
    } catch {
      if (!/"jobOpening"\s*:\s*\[\s*\]/i.test(nextData)) {
        embeddedJobOpeningCount = 1
      }
    }
  }

  const text = stripTags(html) || ''
  return embeddedJobOpeningCount > 0
    || /accordion-item/i.test(String(html ?? ''))
    || /\bApply now\b/i.test(text)
    || /\bLocation:\s*[A-Za-z]/i.test(text)
  }

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined
  }

  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

export const defaultFetchPage = async (url, {
  fetchImpl = fetch,
  timeoutMs = 15000,
} = {}) => {
  const response = await fetchImpl(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: createTimeoutSignal(timeoutMs),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const createKnowlarityScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const careersPage = await fetchPage(CAREERS_URL)
    if (hasRenderablePublicJobsSignal(careersPage.html)) {
      throw new Error('Knowlarity careers page now exposes a live public jobs surface')
    }

    if (careersPage.status !== 200 || !hasVerifiedCareersPageSignal(careersPage.html)) {
      throw new Error('Knowlarity careers page no longer matches the verified first-party empty-state shell')
    }

    if (!hasEmbeddedEmptyJobOpeningState(careersPage.html)) {
      throw new Error('Knowlarity careers page no longer matches the verified first-party empty-state shell')
    }

    return []
  },
})

export const run = async (options = {}) => createKnowlarityScraper().run(options)

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
