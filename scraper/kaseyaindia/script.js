import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCity } from '../utils/cityNormalizer.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

import { KASEYA_INDIA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = KASEYA_INDIA_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const JOBS_SITEMAP_URL = PROVIDER_METADATA.jobsSitemapUrl
export const COMPANY_DOMAIN = PROVIDER_METADATA.companyDomain
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Sec-CH-UA': '"Not.A/Brand";v="99", "Google Chrome";v="138", "Chromium";v="138"',
  'Sec-CH-UA-Mobile': '?0',
  'Sec-CH-UA-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
}

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
    .replace(/&ndash;|&mdash;/gi, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/section|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<h[1-6]\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const toIsoDate = (value) => {
  const normalized = normalizeWhitespace(value)
  const match = normalized?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null
}

const extractCanonicalUrl = (html = '') => {
  const href = String(html ?? '')
    .match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1]

  return normalizeWhitespace(href)
}

const extractBannerField = (html = '', tagName) => stripTags(
  String(html ?? '').match(
    new RegExp(`<section[^>]*id=["']jobs-banner["'][\\s\\S]*?<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'),
  )?.[1],
)

const extractPostingDate = (html = '') => toIsoDate(
  String(html ?? '').match(/"datePosted"\s*:\s*"([^"]+)"/i)?.[1],
)

const extractEmploymentType = (html = '') => normalizeWhitespace(
  String(html ?? '').match(/"employmentType"\s*:\s*"([^"]+)"/i)?.[1],
)

const extractJobId = (html = '', url = '') => {
  const fromJson = normalizeWhitespace(
    String(html ?? '').match(/"identifier"\s*:\s*\{[\s\S]*?"value"\s*:\s*"([^"]+)"/i)?.[1],
  )
  if (fromJson) return fromJson

  return normalizeWhitespace(String(url).match(/\/id\/(\d+)\/?$/i)?.[1])
}

const extractDescription = (html = '') => {
  const page = String(html ?? '')
  const section = page.match(/<section[^>]*class=["'][^"']*\bpy-5\b[^"']*["'][^>]*>([\s\S]*?)<div[^>]*id=["']application-form["']/i)?.[1]
    || page.match(/<section[^>]*class=["'][^"']*\bpy-5\b[^"']*["'][^>]*>([\s\S]*?)<\/section>/i)?.[1]

  return stripTags(section)
}

export const hasVerifiedCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return /<title>\s*Careers at Kaseya \| Open Positions(?: &amp;| &) Job Opportunities\s*<\/title>/i.test(page)
    && normalized.includes('All legitimate Kaseya communications come from @kaseya.com email addresses only.')
    && normalized.includes('OUR HUBS')
    && normalized.includes('India')
    && /Bengaluru campus/i.test(normalized)
}

export const extractJobDetailUrlsFromSitemap = (xml = '') => {
  const urls = new Set()

  for (const match of String(xml ?? '').matchAll(
    /<loc>\s*(https:\/\/www\.kaseya\.com\/careers\/jobs\/id\/\d+\/)\s*<\/loc>/gi,
  )) {
    urls.add(match[1])
  }

  return [...urls]
}

export const isIndiaLocation = (value) => /,\s*india$/i.test(String(value ?? '').trim())

export const hasVerifiedJobDetailPageSignal = (html = '', expectedUrl) => {
  const page = String(html ?? '')
  const location = extractBannerField(page, 'div')
  const title = extractBannerField(page, 'h1')

  return extractCanonicalUrl(page) === expectedUrl
    && Boolean(location)
    && Boolean(title)
}

export const mapDetailPageToJob = ({
  url,
  html,
  scrapedAt,
}) => {
  const location = extractBannerField(html, 'div')
  if (!location || !isIndiaLocation(location)) return null

  const title = extractBannerField(html, 'h1')
  const jobId = extractJobId(html, url)
  const city = normalizeCity(normalizeWhitespace(location.replace(/,\s*India$/i, '')))

  if (!title || !jobId) return null

  return {
    title,
    company: COMPANY,
    department: null,
    location,
    city,
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl: url,
    applyUrl: url,
    employmentType: extractEmploymentType(html),
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: extractPostingDate(html),
    closingDate: null,
    jobDescription: extractDescription(html),
    source: SOURCE,
    link: url,
    scrapedAt,
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: REQUEST_HEADERS,
  label: SOURCE,
  timeoutMs: 20000,
})

export const createKaseyaIndiaScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasVerifiedCareersPageSignal(careersHtml)) {
      throw new Error('Kaseya India verified first-party careers page no longer matches the trusted public surface')
    }

    const sitemapXml = await fetchText(JOBS_SITEMAP_URL)
    const detailUrls = extractJobDetailUrlsFromSitemap(sitemapXml)
    if (detailUrls.length === 0) {
      throw new Error('Kaseya India jobs sitemap no longer exposes the verified first-party job detail URLs')
    }

    const jobs = []

    for (const url of detailUrls) {
      const detailHtml = await fetchText(url)
      if (!hasVerifiedJobDetailPageSignal(detailHtml, url)) {
        throw new Error(`Kaseya India job detail page no longer matches the trusted public surface: ${url}`)
      }

      const job = mapDetailPageToJob({
        url,
        html: detailHtml,
        scrapedAt: now(),
      })

      if (job) jobs.push(job)
    }

    return jobs
  },
})

export const run = async (options = {}) => createKaseyaIndiaScraper().run(options)

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
