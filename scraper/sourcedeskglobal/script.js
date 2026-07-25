import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { SOURCEDESKGLOBAL_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = SOURCEDESKGLOBAL_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const toAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

export const hasOfficialArchiveSignal = (html = '') => {
  const raw = String(html ?? '')
  const normalized = normalizeWhitespace(raw)
  return normalized.includes('Archives: Current Opening')
    && /sourcedeskglobal\.com\/job\//i.test(raw)
  }

export const extractListingUrls = (html = '') => [...new Set(
  [...String(html ?? '').matchAll(/<h2[^>]*>\s*<a[^>]+href=["']([^"']+)["']/gi)]
    .map((match) => toAbsoluteUrl(match[1]))
    .filter(Boolean),
)]

const extractFirst = (pattern, html = '') => pattern.exec(String(html ?? ''))?.[1] ?? null

export const extractJobDetail = (html = '', detailUrl) => {
  const title = normalizeWhitespace(
    extractFirst(/<h2[^>]*>([\s\S]*?)<\/h2>/i, html)
      || extractFirst(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html),
  )
  const paragraphs = [...String(html ?? '').matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => normalizeWhitespace(match[1]))
    .filter(Boolean)
  const description = paragraphs.find((value) => /we are seeking|we are looking|if you're/i.test(value))
    || paragraphs[0]
    || null
  const experienceRequired = extractFirst(/Experience:\s*([^<]+)/i, html)
    ? normalizeWhitespace(extractFirst(/Experience:\s*([^<]+)/i, html))
    : null
  const salary = extractFirst(/Salary Range:\s*([^<]+)/i, html)
    ? normalizeWhitespace(extractFirst(/Salary Range:\s*([^<]+)/i, html))
    : null
  const locationText = normalizeWhitespace(extractFirst(/Location:\s*([^<]+)/i, html)) || 'Kolkata'
  const city = /kolkata/i.test(locationText) ? 'Kolkata' : locationText

  if (!title) {
    throw new Error(`Sourcedesk Global first-party detail page changed materially: ${detailUrl}`)
  }

  return {
    title,
    company: COMPANY,
    department: null,
    location: `${city}, India`,
    city,
    country: 'India',
    jobId: slugify(title),
    requisitionId: slugify(title),
    sourceUrl: detailUrl,
    applyUrl: detailUrl,
    employmentType: 'Full Time',
    experienceRequired,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    salaryRange: salary,
    jobDescription: description,
  }
}

export const createSourcedeskGlobalScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow = now } = {}) {
    const archiveHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialArchiveSignal(archiveHtml)) {
      throw new Error('Sourcedesk Global verified first-party current-opening archive changed materially')
    }

    const listingUrls = extractListingUrls(archiveHtml)
    if (listingUrls.length === 0) {
      throw new Error('Sourcedesk Global verified archive no longer exposes first-party job links')
    }

    const scrapedAt = overrideNow()
    const jobs = []
    for (const detailUrl of listingUrls) {
      const detailHtml = await fetchText(detailUrl)
      const detail = extractJobDetail(detailHtml, detailUrl)
      jobs.push({
        ...detail,
        source: SOURCE,
        link: detail.applyUrl || detail.sourceUrl,
        scrapedAt,
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createSourcedeskGlobalScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const jobs = await createSourcedeskGlobalScraper().run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
