import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { IRON_MOUNTAIN_INDIA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = IRON_MOUNTAIN_INDIA_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const ABOUT_PAGE_URL = PROVIDER_METADATA.aboutPageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const JOBS_BOARD_URL = PROVIDER_METADATA.jobsBoardUrl
export const JOBS_SITEMAP_URL = PROVIDER_METADATA.jobsSitemapUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const ACRONYM_MAP = new Map([
  ['ai', 'AI'],
  ['api', 'API'],
  ['aws', 'AWS'],
  ['b2b', 'B2B'],
  ['b2c', 'B2C'],
  ['erp', 'ERP'],
  ['hr', 'HR'],
  ['it', 'IT'],
  ['psu', 'PSU'],
  ['qa', 'QA'],
  ['sap', 'SAP'],
  ['seo', 'SEO'],
  ['sre', 'SRE'],
  ['ui', 'UI'],
  ['ux', 'UX'],
])

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&amp;/gi, '&')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))

const extractTitle = (html = '') => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1])
}

const humanizeSlugToken = (token) => {
  const decoded = decodeHtmlEntities(decodeURIComponent(String(token ?? '')))
    .replace(/\+/g, ' ')
    .trim()
  if (!decoded) return ''

  const lowered = decoded.toLowerCase()
  if (ACRONYM_MAP.has(lowered)) {
    return ACRONYM_MAP.get(lowered)
  }

  return lowered.charAt(0).toUpperCase() + lowered.slice(1)
}

export const humanizeTitleSlug = (slug = '') => String(slug ?? '')
  .split('-')
  .filter(Boolean)
  .map(humanizeSlugToken)
  .join(' ')
  .trim()

const cityFromLocationSlug = (locationSlug = '') => String(locationSlug ?? '')
  .replace(/-ind$/i, '')
  .split('-')
  .filter(Boolean)
  .map(humanizeSlugToken)
  .join(' ')
  .trim()

export const formatIndiaLocationFromSlug = (locationSlug = '') => {
  const city = cityFromLocationSlug(locationSlug)
  return city ? `${city}, India` : 'India'
}

export const hasOfficialAboutPageCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = (normalizeWhitespace(page) || '').toLowerCase()
  const title = extractTitle(page) || ''

  return /^about us\s*\|\s*iron mountain$/i.test(title)
    && text.includes('about iron mountain')
    && /href=["']https:\/\/ironmountain\.jobs\/?["']/i.test(page)
    && />\s*careers\s*</i.test(page)
}

export const hasOfficialJobsBoardSignal = (html = '') => {
  const page = String(html ?? '')
  const title = extractTitle(page) || ''

  return /^home\s*\|\s*iron mountain$/i.test(title)
    && /job-folder["']?\s*:\s*["']ironmountain-jobs["']/i.test(page)
    && /source["']?\s*:\s*["']solr["']/i.test(page)
    && /x-origin["']?\s*:\s*["']ironmountain\.jobs["']/i.test(page)
}

export const extractSitemapEntries = (xml = '') => {
  const matches = [...String(xml ?? '').matchAll(
    /<url>\s*<loc>\s*([^<]+?)\s*<\/loc>(?:\s*<lastmod>\s*([^<]+?)\s*<\/lastmod>)?[\s\S]*?<\/url>/gi,
  )]

  return matches.map((match) => ({
    url: decodeHtmlEntities(match[1]).trim(),
    lastmod: normalizeWhitespace(match[2]) || null,
  }))
}

export const isIndiaJobUrl = (value = '') => {
  try {
    return new URL(value).pathname.toLowerCase().includes('-ind/')
  } catch {
    return false
  }
}

export const extractJobIdentityFromUrl = (value = '') => {
  try {
    const parts = new URL(value).pathname.split('/').filter(Boolean)
    if (parts.length < 4 || parts.at(-1)?.toLowerCase() !== 'job') {
      return null
    }

    return {
      locationSlug: parts[0],
      titleSlug: parts[1],
      jobId: parts[2],
    }
  } catch {
    return null
  }
}

export const mapSitemapEntryToJob = (entry = {}) => {
  if (!isIndiaJobUrl(entry.url)) return null

  const identity = extractJobIdentityFromUrl(entry.url)
  if (!identity?.locationSlug || !identity?.titleSlug || !identity?.jobId) {
    return null
  }

  const city = cityFromLocationSlug(identity.locationSlug) || null
  const location = formatIndiaLocationFromSlug(identity.locationSlug)
  const postingDate = normalizeWhitespace(entry.lastmod)?.slice(0, 10) || null

  return {
    title: humanizeTitleSlug(identity.titleSlug) || null,
    company: COMPANY_NAME,
    department: null,
    location,
    city,
    country: 'India',
    jobId: identity.jobId,
    requisitionId: identity.jobId,
    sourceUrl: entry.url,
    applyUrl: entry.url,
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate,
    closingDate: null,
    jobDescription: null,
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

export const createIronMountainIndiaScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, maxJobs = Number.POSITIVE_INFINITY } = {}) {
    const aboutHtml = await fetchText(ABOUT_PAGE_URL)
    if (!hasOfficialAboutPageCareersSignal(aboutHtml)) {
      throw new Error('Iron Mountain India about page no longer matches the verified first-party careers handoff')
    }

    const jobsBoardHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialJobsBoardSignal(jobsBoardHtml)) {
      throw new Error('Iron Mountain India jobs board no longer matches the verified first-party NLX surface')
    }

    const sitemapXml = await fetchText(JOBS_SITEMAP_URL)
    const entries = extractSitemapEntries(sitemapXml)
    if (entries.length === 0) {
      throw new Error('Iron Mountain India jobs sitemap no longer exposes public job URLs')
    }

    const scrapedAt = now()
    const jobs = []
    const seen = new Set()

    for (const entry of entries) {
      const mappedJob = mapSitemapEntryToJob(entry)
      if (!mappedJob?.jobId || !mappedJob.applyUrl) continue
      if (seen.has(mappedJob.jobId) || seen.has(mappedJob.applyUrl)) continue

      seen.add(mappedJob.jobId)
      seen.add(mappedJob.applyUrl)
      jobs.push({
        ...mappedJob,
        link: mappedJob.applyUrl || mappedJob.sourceUrl,
        source: SOURCE,
        scrapedAt,
      })

      if (jobs.length >= maxJobs) break
    }

    return jobs
  },
})

export const run = async (options = {}) => createIronMountainIndiaScraper().run(options)

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
