import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

import { SPINTLY_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = SPINTLY_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐‑–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const htmlToText = (value) =>
  decodeHtmlEntities(
    String(value ?? '')
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<(br|\/p|\/div|\/section|\/article|\/main|\/li|\/ul|\/ol|\/h[1-6]|\/form|\/button)\b[^>]*>/gi, '\n')
      .replace(/<(p|div|section|article|main|li|ul|ol|h[1-6]|form|button)\b[^>]*>/gi, '\n')
      .replace(/<\/a>/gi, '')
      .replace(/<a\b[^>]*>/gi, '')
      .replace(/<[^>]+>/g, ' '),
  )

const stripTags = (value) => normalizeWhitespace(htmlToText(value))

const htmlToLines = (html) =>
  String(htmlToText(html) || '')
    .split(/\n+/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)

const extractTitle = (html) => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1])
}

const slugify = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const isLocationLine = (line) => /india/i.test(line || '')

const isDepartmentHeading = (line) => {
  if (!line) return false
  if (/^(job openings|apply now)$/i.test(line)) return false
  if (line.length > 48) return false
  return !/[.:]/.test(line)
}

const extractLocationBits = (value) => {
  const parts = String(value ?? '')
    .split('•')
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)

  const location = parts[0] || null
  const employmentType = parts.find((part) => /full[- ]?time|part[- ]?time|intern/i.test(part)) || null
  const remoteStatus = parts.find((part) => /onsite|on-site|remote|hybrid/i.test(part)) || null

  return {
    location,
    employmentType,
    remoteStatus: remoteStatus
      ? remoteStatus.replace(/^on-site$/i, 'Onsite').replace(/^onsite$/i, 'Onsite')
      : null,
  }
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null

  const [firstPart] = normalized
    .split(',')
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)

  return firstPart
    ? firstPart.replace(/\s*-\s*india$/i, '').trim()
    : normalized.replace(/\s*-\s*india$/i, '').trim()
}

export const hasOfficialCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = (stripTags(page) || '').toLowerCase()

  return extractTitle(page) === 'Spintly | Careers | Job Openings | Jobs at Spintly'
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/spintly\.com\/careers\/["']/i.test(page)
    && text.includes('join us as we build the future of access control')
    && text.includes('view open positions')
    && text.includes('job openings')
}

export const extractSharedApplyUrl = (html = '') => {
  const match = String(html ?? '').match(
    /<a[^>]+href=["']([^"']+)["'][^>]*>\s*Apply Now\s*<\/a>/i,
  )
  const href = normalizeWhitespace(match?.[1])
  if (!href) return CAREERS_URL

  try {
    return new URL(href, CAREERS_URL).toString()
  } catch {
    return CAREERS_URL
  }
}

export const extractInlineJobs = (
  html,
  {
    scrapedAt = new Date().toISOString(),
  } = {},
) => {
  const lines = htmlToLines(html)
  const openingsIndex = lines.findIndex((line) => /^job openings$/i.test(line))
  if (openingsIndex === -1) return []

  const applyUrl = extractSharedApplyUrl(html)
  const jobs = []
  let currentDepartment = null

  for (let index = openingsIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]
    const nextLine = lines[index + 1] || null

    if (/^apply now$/i.test(line)) {
      continue
    }

    if (isLocationLine(nextLine)) {
      const title = line
      const { location, employmentType, remoteStatus } = extractLocationBits(nextLine)
      const descriptionLines = []

      index += 2
      while (index < lines.length) {
        const candidate = lines[index]
        const candidateNext = lines[index + 1] || null

        if (/^apply now$/i.test(candidate)) {
          break
        }

        if (isLocationLine(candidateNext)) {
          index -= 1
          break
        }

        if (isDepartmentHeading(candidate) && descriptionLines.length === 0) {
          currentDepartment = candidate
          index += 1
          continue
        }

        descriptionLines.push(candidate)
        index += 1
      }

      jobs.push({
        title,
        company: COMPANY,
        department: currentDepartment,
        location,
        city: extractCity(location),
        country: 'India',
        link: applyUrl,
        applyUrl,
        sourceUrl: applyUrl,
        source: SOURCE,
        jobId: slugify(`${title}-${location}`),
        requisitionId: null,
        employmentType,
        experienceRequired: null,
        jobDescription: normalizeWhitespace(descriptionLines.join(' ')),
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        remoteStatus,
        scrapedAt,
      })
      continue
    }

    if (isDepartmentHeading(line)) {
      currentDepartment = line
    }
  }

  return jobs
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createSpintlyScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Spintly verified Spintly careers page no longer matches the official first-party surface')
    }

    const jobs = extractInlineJobs(careersHtml, {
      scrapedAt: now(),
    }).map((job) => ({
      ...job,
      companyCareerPage: CAREERS_URL,
      companyDomain: PROVIDER_METADATA.companyDomain,
      atsPlatform: PROVIDER_METADATA.atsPlatform,
    }))

    if (jobs.length === 0) {
      throw new Error('Spintly verified first-party careers page no longer exposes normalized inline jobs')
    }

    return Number.isFinite(maxJobs) ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async (options = {}) => createSpintlyScraper(options).run(options)

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
