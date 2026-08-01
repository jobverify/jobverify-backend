import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'detroitengineeredproducts'
export const COMPANY = 'Detroit Engineered Products'
export const HOMEPAGE_URL = 'https://depusa.com/'
export const CAREERS_PAGE_URL = 'https://depusa.com/index.php/company/careers'
export const INDIA_CAREERS_URL = 'https://depusa.com/index.php/careers-india'
export const USA_CAREERS_URL = 'https://depusa.com/index.php/careers-usa'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&#8211;|&ndash;/gi, '-')
    .replace(/&#8212;|&mdash;/gi, '-')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (/contract/.test(normalized)) return 'Contract'
  if (/part.?time/.test(normalized)) return 'Part-time'
  if (/intern/.test(normalized)) return 'Internship'
  if (/full.?time/.test(normalized)) return 'Full-time'
  return normalizeWhitespace(value)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const getAttributeValue = (tag, attribute) => {
  const match = String(tag ?? '').match(
    new RegExp(`\\b${escapeRegex(attribute)}=["']([^"']+)["']`, 'i'),
  )
  return normalizeWhitespace(match?.[1] ?? null)
}

const getLastPathSegment = (value) => {
  try {
    const segments = new URL(value).pathname.split('/').filter(Boolean)
    return segments.at(-1) || null
  } catch {
    return null
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)?.toLowerCase() || ''

  return /<title>\s*Detroit Engineered Products\s*<\/title>/i.test(rawHtml)
    && /meta property=["']og:url["'] content=["']https:\/\/depusa\.com\/["']/i.test(rawHtml)
    && /meta property=["']og:site_name["'] content=["']Detroit Engineered Products["']/i.test(rawHtml)
    && /href=["']https:\/\/depusa\.com\/index\.php\/company\/careers["']/i.test(rawHtml)
    && normalized.includes('detroit engineered products')
}

export const hasCareersLandingSignal = (html) => {
  const rawHtml = String(html ?? '')

  return /<title>\s*Careers\s*\|\s*Detroit Engineered Products\s*<\/title>/i.test(rawHtml)
    && new RegExp(`href=["']${escapeRegex(INDIA_CAREERS_URL)}["']`, 'i').test(rawHtml)
    && new RegExp(`href=["']${escapeRegex(USA_CAREERS_URL)}["']`, 'i').test(rawHtml)
}

export const hasIndiaCareersSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)?.toLowerCase() || ''

  return /<title>\s*Careers India\s*\|\s*Detroit Engineered Products\s*<\/title>/i.test(rawHtml)
    && /jobsapi\.ceipal\.com\/apisource\/widget\.js/i.test(rawHtml)
    && /data-ceipal-api-key=/i.test(rawHtml)
    && /data-ceipal-career-portal-id=/i.test(rawHtml)
    && normalized.includes('india opportunities')
}

export const extractWidgetConfig = (html) => {
  const scriptMatch = String(html ?? '').match(
    /<script\b[^>]*src=["']https:\/\/jobsapi\.ceipal\.com\/APISource\/widget\.js["'][^>]*><\/script>/i,
  )
  const scriptTag = scriptMatch?.[0]
  if (!scriptTag) return null

  const apiKey = getAttributeValue(scriptTag, 'data-ceipal-api-key')
  const careerPortalId = getAttributeValue(scriptTag, 'data-ceipal-career-portal-id')

  if (!apiKey || !careerPortalId) return null

  return { apiKey, careerPortalId }
}

export const buildWidgetUrl = ({ apiKey, careerPortalId } = {}) =>
  `https://jobsapi.ceipal.com/APISource/v2/index.html?api_key=${apiKey}&cp_id=${careerPortalId}`

export const hasWidgetSignal = (html) => {
  const normalized = normalizeWhitespace(html)?.toLowerCase() || ''
  return normalized.includes('ceipal career portal')
    && normalized.includes('search jobs')
    && normalized.includes('current openings')
}

export const extractIndiaJobs = (html) => {
  if (!hasWidgetSignal(html)) return []

  const rawHtml = String(html ?? '')
  const postingPattern =
    /<div\b[^>]*class=["'][^"']*job-posting[^"']*["'][^>]*>[\s\S]*?<a\b[^>]*class=["'][^"']*job-title[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<div\b[^>]*class=["'][^"']*job-location[^"']*["'][^>]*>([\s\S]*?)<\/div>[\s\S]*?<div\b[^>]*class=["'][^"']*job-type[^"']*["'][^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/div>/gi

  return Array.from(rawHtml.matchAll(postingPattern))
    .map((match) => {
      const sourceUrl = normalizeWhitespace(match[1] ?? null)
      const title = normalizeWhitespace(match[2] ?? null)
      const location = normalizeWhitespace(match[3] ?? null)

      if (!sourceUrl || !title || !location || !/\bindia\b/i.test(location)) {
        return null
      }

      const city = normalizeWhitespace(location.split(',')[0] ?? null)
      const jobId = getLastPathSegment(sourceUrl)

      if (!jobId) return null

      return {
        title,
        company: COMPANY,
        department: null,
        location,
        city,
        state: null,
        country: 'India',
        jobId,
        requisitionId: jobId,
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: normalizeEmploymentType(match[4] ?? null),
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: null,
        remoteStatus: 'On-site',
      }
    })
    .filter(Boolean)
}

export const createDetroitEngineeredProductsScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Response is not the verified official DEP homepage')
    }

    const careersLandingHtml = await fetchText(CAREERS_PAGE_URL)
    if (!hasCareersLandingSignal(careersLandingHtml)) {
      throw new Error('Response is not the verified DEP careers landing page')
    }

    const indiaCareersHtml = await fetchText(INDIA_CAREERS_URL)
    if (!hasIndiaCareersSignal(indiaCareersHtml)) {
      throw new Error('Response is not the official DEP India careers page')
    }

    const widgetConfig = extractWidgetConfig(indiaCareersHtml)
    if (!widgetConfig) {
      throw new Error('DEP India careers page no longer exposes the public CEIPAL widget configuration')
    }

    const widgetHtml = await fetchText(buildWidgetUrl(widgetConfig))
    if (!hasWidgetSignal(widgetHtml)) {
      throw new Error('Response is not the verified public CEIPAL widget for DEP India careers')
    }

    const jobs = extractIndiaJobs(widgetHtml)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createDetroitEngineeredProductsScraper().run(options)

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
