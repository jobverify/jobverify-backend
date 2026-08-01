import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createOptimizedPage, launchBrowser } from '../../scraper-support/utils/browser.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { SYRMA_SGS_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const BROWSER_TIMEOUT_MS = 60000

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const COMPANY_DOMAIN = PROVIDER_METADATA.companyDomain
export const LIFE_AT_URL = PROVIDER_METADATA.lifeAtUrl
export const JOBS_URL = PROVIDER_METADATA.officialCareersPageUrl
export const VERIFIED_AT = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&#39;|&apos;|&#8217;|&rsquo;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#8211;|&ndash;|&#8212;|&mdash;/gi, '-')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(String(value))
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const htmlToLines = (html = '') => decodeHtmlEntities(String(html ?? ''))
  .replace(/\r/g, '')
  .replace(/<(?:br|\/p|\/div|\/li|\/ul|\/ol|\/section|\/article|\/main|\/figure|\/table|\/tbody|\/tr|\/td|\/h[1-6])\b[^>]*>/gi, '\n')
  .replace(/<(?:p|div|li|ul|ol|section|article|main|figure|table|tbody|tr|td|h[1-6])\b[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .split(/\n+/)
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const titleCase = (value) => normalizeWhitespace(String(value ?? ''))
  ?.split(/\s+/)
  .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : part)
  .join(' ') || null

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const toAbsoluteUrl = (value) => {
  try {
    const parsed = new URL(value, JOBS_URL)
    if (!parsed.pathname.endsWith('/')) {
      parsed.pathname = `${parsed.pathname}/`
    }
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return null
  }
}

const normalizeDetailUrl = (value) => {
  const url = toAbsoluteUrl(value)
  if (!url) return null

  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.replace(/^www\./i, '').toLowerCase()
    if (hostname !== COMPANY_DOMAIN) return null
    if (!parsed.pathname.startsWith('/jobs/')) return null
    return parsed.toString()
  } catch {
    return null
  }
}

const extractTitle = (html = '') => normalizeWhitespace(
  String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
)

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const isFallbackError = (error) =>
  /HTTP 403|timed out|timeout|und_err_connect_timeout|connect timeout|could not connect|fetch failed/i
    .test(String(error?.message ?? error ?? ''))

const createBrowserFetchSession = async () => {
  const browser = await launchBrowser()
  const page = await createOptimizedPage(browser)

  return {
    close: async () => browser.close(),
    fetchText: async (url) => {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: BROWSER_TIMEOUT_MS,
      })

      if (!response?.ok()) {
        throw new Error(`HTTP ${response?.status?.() ?? 'unknown'} for ${url}`)
      }

      return page.content()
    },
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

const extractLabeledValue = (lines, patterns = []) => {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    for (const pattern of patterns) {
      if (!pattern.test(line)) continue

      const inlineValue = normalizeWhitespace(line.replace(pattern, ''))
      if (inlineValue) {
        return inlineValue
      }

      const nextLine = lines[index + 1]
      if (nextLine) {
        return normalizeWhitespace(nextLine)
      }
    }
  }

  return null
}

const toLocationData = (value) => {
  const city = normalizeWhitespace(value)
  if (!city) {
    return {
      location: null,
      city: null,
      country: 'India',
    }
  }

  return {
    location: `${city}, India`,
    city: titleCase(city),
    country: 'India',
  }
}

const buildStructuredSkills = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return []

  const functionalMatch = normalized.match(/Functional:\s*([\s\S]*?)(?:\s+Generic:\s*|$)/i)
  const genericMatch = normalized.match(/Generic:\s*([\s\S]*)$/i)
  const skills = [
    normalizeWhitespace(functionalMatch?.[1]),
    normalizeWhitespace(genericMatch?.[1]),
  ].filter(Boolean)

  return Array.from(new Set(skills))
}

const collectSkillsAfterMarker = (lines, markerPattern) => {
  const markerIndex = lines.findIndex((line) => markerPattern.test(line))
  if (markerIndex === -1) return []

  const skills = []
  for (let index = markerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (/^Apply for this position$/i.test(line) || /^Ready for the next step\?$/i.test(line)) break
    if (!line || /^By\s+hradmin\b/i.test(line)) continue
    skills.push(line)
  }

  return Array.from(new Set(skills))
}

const collectSectionText = (lines, markerPattern) => {
  const markerIndex = lines.findIndex((line) => markerPattern.test(line))
  if (markerIndex === -1) return null

  const collected = []

  for (let index = markerIndex; index < lines.length; index += 1) {
    const line = lines[index]
    if (index !== markerIndex && /^Apply for this position$/i.test(line)) break
    if (index !== markerIndex && /^Upload CV\/Resume$/i.test(line)) break

    const value = index === markerIndex
      ? normalizeWhitespace(line.replace(markerPattern, ''))
      : line

    if (value) {
      collected.push(value)
    }
  }

  return normalizeWhitespace(collected.join(' '))
}

const toJobId = (title, sourceUrl) => {
  const lastSegment = String(sourceUrl ?? '').replace(/\/$/, '').split('/').filter(Boolean).pop() ?? ''
  if (lastSegment && !/^\d+$/.test(lastSegment)) {
    return slugify(lastSegment)
  }

  return slugify(title)
}

export const extractOfficialJobsUrl = (html = '') => {
  const explicitUrl = String(html ?? '').match(/https:\/\/syrmasgs\.com\/job-openings\/?/i)?.[0]
  if (explicitUrl) {
    return explicitUrl.endsWith('/') ? explicitUrl : `${explicitUrl}/`
  }

  const relativeHref = String(html ?? '').match(/href=["']([^"']*job-openings\/?)["']/i)?.[1]
  return normalizeDetailUrl(relativeHref)?.replace('/jobs/', '/job-openings/') ?? toAbsoluteUrl(relativeHref)
}

export const hasOfficialLifeAtSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page) || ''

  return extractTitle(page) === 'Life at SyrmaSGS - Syrma SGS'
    && text.includes('Careers at Syrma SGS')
    && text.includes('Join the Team')
    && text.includes('Our open positions span design engineering, manufacturing, operations, finance and more.')
    && extractOfficialJobsUrl(page) === JOBS_URL
}

export const extractJobCards = (html = '') => {
  const jobs = []
  const seenUrls = new Set()

  for (const match of String(html ?? '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const sourceUrl = normalizeDetailUrl(match[1])
    if (!sourceUrl || seenUrls.has(sourceUrl)) continue

    const text = normalizeWhitespace(match[2])
    if (!text || !/More Details/i.test(text)) continue

    const title = normalizeWhitespace(text.replace(/\bMore Details\b/i, ''))
    if (!title) continue

    const jobId = toJobId(title, sourceUrl)
    jobs.push({
      title,
      sourceUrl,
      applyUrl: sourceUrl,
      jobId,
    })
    seenUrls.add(sourceUrl)
  }

  return jobs
}

export const hasOfficialJobsPageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page) || ''
  const titles = new Set(extractJobCards(page).map((job) => job.title))

  return extractTitle(page) === 'Jobs - Syrma SGS'
    && text.includes('Jobs')
    && text.includes('Search')
    && text.includes('Filter by')
    && text.includes('More Details')
    && titles.has('Manager/Sr.Manager - NPI & Engineering')
    && titles.has('Power Electronics Lead / Architect')
}

export const extractJobDetail = (html, listing = {}) => {
  const page = String(html ?? '')
  const lines = htmlToLines(page)

  if (!/Apply for this position/i.test(page) || !/Upload CV\/Resume/i.test(page)) {
    throw new Error('Syrma SGS detail page no longer matches the verified first-party public jobs surface')
  }

  const title =
    extractLabeledValue(lines, [/^Position Name\s*/i, /^Title of position\s*:\s*/i])
    || normalizeWhitespace(lines.find((line) => line === listing.title))
    || normalizeWhitespace(lines.find((line) => /Syrma SGS$/i.test(line) && !/Apply for this position/i.test(line)))
    || listing.title

  if (!title || normalizeWhitespace(title) !== normalizeWhitespace(listing.title)) {
    throw new Error('Syrma SGS detail page no longer matches the verified first-party public jobs surface')
  }

  const department = extractLabeledValue(lines, [/^Department \/ Function\s*/i])
  const minimumQualification = extractLabeledValue(lines, [
    /^Educational qualifications[\s\S]*?role\)\s*/i,
    /^Qualification\s*:\s*/i,
  ])
  const experienceRequired = extractLabeledValue(lines, [
    /^Relevant experience[\s\S]*?role\)\s*/i,
    /^Work Experience\s*:\s*/i,
  ])
  const locationValue = extractLabeledValue(lines, [/^Location\s*:\s*/i])
  const thresholdSkills = collectSectionText(
    lines,
    /^Threshold skills and capabilities required to execute the role\s*/i,
  )
  const requiredSkills = Array.from(new Set([
    ...buildStructuredSkills(thresholdSkills),
    ...collectSkillsAfterMarker(lines, /^Skills Required\s*:\s*$/i),
  ]))

  const locationData = toLocationData(locationValue)
  const detailLines = lines.filter((line) =>
    line !== title
    && !/^By\s+hradmin\b/i.test(line)
    && line !== 'Apply for this position'
    && line !== 'Upload CV/Resume'
  )
  const jobDescription = normalizeWhitespace(detailLines.join(' '))

  return {
    title,
    company: COMPANY,
    department,
    location: locationData.location,
    city: locationData.city,
    country: locationData.country,
    jobId: listing.jobId || toJobId(title, listing.sourceUrl),
    requisitionId: listing.jobId || toJobId(title, listing.sourceUrl),
    sourceUrl: listing.sourceUrl,
    applyUrl: listing.applyUrl || listing.sourceUrl,
    employmentType: null,
    experienceRequired,
    minimumQualification,
    preferredQualification: null,
    requiredSkills,
    postingDate: null,
    closingDate: null,
    jobDescription,
  }
}

export const createSyrmaSgsScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    fetchBrowserText,
    now = () => new Date().toISOString(),
  } = {}) {
    let browserSession = null

    const getBrowserSession = async () => {
      if (!browserSession) {
        browserSession = await createBrowserFetchSession()
      }

      return browserSession
    }

    const browserTextFetcher = fetchBrowserText || (async (url) => {
      const session = await getBrowserSession()
      return session.fetchText(url)
    })

    const fetchPageText = async (url) => {
      try {
        return await fetchText(url)
      } catch (error) {
        if (!isFallbackError(error)) {
          throw error
        }

        return browserTextFetcher(url)
      }
    }

    try {
      const lifeAtHtml = await fetchPageText(LIFE_AT_URL)
      if (!hasOfficialLifeAtSignal(lifeAtHtml)) {
        throw new Error('The verified Syrma SGS life-at careers page changed materially')
      }

      const jobsHtml = await fetchPageText(JOBS_URL)
      if (!hasOfficialJobsPageSignal(jobsHtml)) {
        throw new Error('The verified Syrma SGS jobs archive changed materially')
      }

      const cards = extractJobCards(jobsHtml)
      const jobs = []

      for (const card of cards) {
        const detailHtml = await fetchPageText(card.sourceUrl)
        const detail = extractJobDetail(detailHtml, card)

        jobs.push({
          ...detail,
          source: SOURCE,
          link: detail.applyUrl || detail.sourceUrl,
          scrapedAt: now(),
          companyCareerPage: JOBS_URL,
          companyDomain: COMPANY_DOMAIN,
          atsPlatform: PROVIDER_METADATA.atsPlatform,
        })
      }

      return jobs
    } finally {
      if (browserSession) {
        await browserSession.close()
      }
    }
  },
})

export const run = async (options = {}) => createSyrmaSgsScraper().run(options)

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
