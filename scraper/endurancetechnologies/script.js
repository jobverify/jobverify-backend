import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createOptimizedPage, launchBrowser } from '../../scraper-support/utils/browser.js'
import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'

import { ENDURANCE_TECHNOLOGIES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = ENDURANCE_TECHNOLOGIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const JOB_PORTAL_URL = PROVIDER_METADATA.jobPortalUrl
export const VERIFIED_JOB_URLS = PROVIDER_METADATA.verifiedJobUrls
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const DEFAULT_TIMEOUT_MS = 120000

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&#34;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&#8217;|&rsquo;|&#x27;/gi, "'")
  .replace(/&ndash;/gi, '–')
  .replace(/&mdash;/gi, '—')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(value)
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeText = (value) => normalizeWhitespace(value) || null

const stripTagsToText = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|span|a)>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/[•●▪◦]/g, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const absoluteUrl = (value, baseUrl = HOMEPAGE_URL) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const sameUrl = (left, right) => {
  try {
    const leftUrl = new URL(String(left ?? ''))
    const rightUrl = new URL(String(right ?? ''))
    leftUrl.hash = ''
    rightUrl.hash = ''
    return leftUrl.toString().replace(/\/$/, '') === rightUrl.toString().replace(/\/$/, '')
  } catch {
    return String(left ?? '').replace(/\/$/, '') === String(right ?? '').replace(/\/$/, '')
  }
}

const uniqueStrings = (values) => {
  const seen = new Set()
  const output = []

  for (const value of values) {
    const normalized = normalizeText(value)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    output.push(normalized)
  }

  return output
}

const slugify = (value) => normalizeWhitespace(value)
  .replace(/[–—]/g, '-')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const titleCaseWithoutPrefix = (value) => normalizeText(value)?.replace(/^Job Opening for\s*/i, '') || null

const toTextLines = (html) => decodeHtmlEntities(String(html ?? ''))
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(p|div|li|ul|ol|h[1-6]|span|a)>/gi, '\n')
  .replace(/<li\b[^>]*>/gi, '\n')
  .replace(/[•●▪◦]/g, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\r/g, '\n')
  .replace(/\u00a0/g, ' ')
  .split('\n')
  .map((line) => normalizeText(line))
  .filter(Boolean)

const parseLocation = (value) => {
  const normalized = normalizeText(value)
  if (!normalized) {
    return {
      location: null,
      city: null,
      state: null,
      country: null,
    }
  }

  const parts = normalized.split(',').map((part) => normalizeText(part)).filter(Boolean)
  const firstPart = parts[0] || normalized
  const city = normalizeCity(firstPart) || firstPart
  const state = parts.find((part) => /maharashtra/i.test(part))
    || (/\bpune\b/i.test(normalized) ? 'Maharashtra' : null)
  const country = parts.find((part) => /india/i.test(part)) || 'India'

  return {
    location: [city, state, country].filter(Boolean).join(', ') || normalized,
    city: city || null,
    state: state || null,
    country: country || null,
  }
}

const findFirstMatch = (patterns, value) => {
  for (const pattern of patterns) {
    const match = String(value ?? '').match(pattern)
    if (match?.[1]) return normalizeText(match[1])
  }

  return null
}

const buildJobIdFromUrl = (value, fallbackTitle = '') => {
  try {
    const slug = decodeURIComponent(new URL(value).pathname.split('/').filter(Boolean).at(-1) || fallbackTitle)
    return `${SOURCE}-${slugify(slug)}`
  } catch {
    return `${SOURCE}-${slugify(fallbackTitle || 'role')}`
  }
}

const buildDescriptionSection = (heading, lines) => {
  if (!lines.length) return []

  return [
    heading,
    ...lines.map((line) => `- ${line}`),
  ]
}

const extractSectionLines = (lines, heading, stopHeadings = []) => {
  const startIndex = lines.findIndex((line) => sameUrl(line, heading) || line.toLowerCase() === heading.toLowerCase())
  if (startIndex === -1) return []

  const stopSet = new Set(stopHeadings.map((value) => value.toLowerCase()))
  const collected = []

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]
    const normalized = line.toLowerCase()

    if (stopSet.has(normalized)) break
    if (normalized === 'explore more' || normalized === 'quick enquiry') break
    if (normalized === 'read more' || normalized === 'apply now') continue
    collected.push(line)
  }

  return uniqueStrings(collected)
}

export const hasOfficialCareersPageSignal = (html = '') => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return normalized.includes('unleash your potential')
    && normalized.includes('i am interested in')
    && normalized.includes('life at endurance')
    && sameUrl(extractJobPortalUrl(html), JOB_PORTAL_URL)
}

export const extractJobPortalUrl = (html = '') => {
  const match = String(html ?? '').match(/href=["']([^"']*\/(?:careers\/)?job-portal\/?)["']/i)
  return absoluteUrl(match?.[1], HOMEPAGE_URL)
}

export const hasOfficialJobPortalSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml).toLowerCase()

  return normalized.includes('current opening')
    && normalized.includes('drop your cv here')
    && normalized.includes('apply now')
    && /href=["'][^"']*\/career\/[^"']+["']/i.test(rawHtml)
}

export const collectListingCandidates = async (page, baseUrl = JOB_PORTAL_URL) => {
  if (typeof page.evaluate !== 'function') {
    throw new Error('Endurance Technologies job portal page does not support DOM extraction')
  }

  return page.evaluate((portalUrl) => {
    const normalizeTextInPage = (value) => String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()

    const toAbsoluteUrlInPage = (value) => {
      try {
        return new URL(value, portalUrl).toString()
      } catch {
        return null
      }
    }

    const pickContainer = (anchor) => {
      let node = anchor
      let fallback = anchor.parentElement || anchor

      for (let depth = 0; node && node !== document.body && depth < 8; depth += 1) {
        const text = normalizeTextInPage(node.innerText || '')
        if (
          text
          && text.length <= 900
          && (/job opening for/i.test(text) || /\b\d+\s*Years?\b/i.test(text))
          && /\bPune\b/i.test(text)
        ) {
          return node
        }

        fallback = node
        node = node.parentElement
      }

      return fallback
    }

    const candidates = []
    const seen = new Set()

    for (const anchor of Array.from(document.querySelectorAll('a[href]'))) {
      const sourceUrl = toAbsoluteUrlInPage(anchor.getAttribute('href'))
      if (!sourceUrl) continue

      try {
        const url = new URL(sourceUrl)
        if (!url.pathname.startsWith('/career/')) continue
      } catch {
        continue
      }

      if (seen.has(sourceUrl)) continue
      seen.add(sourceUrl)

      const container = pickContainer(anchor)
      const lines = String(container?.innerText || '')
        .split(/\n+/)
        .map((line) => normalizeTextInPage(line))
        .filter(Boolean)

      candidates.push({
        title: lines.find((line) => /job opening for/i.test(line)) || lines[0] || normalizeTextInPage(anchor.textContent),
        experience: lines.find((line) => /\b\d+\s*Years?\b/i.test(line)) || null,
        designation: lines.find((line) => /manager/i.test(line)) || null,
        location: lines.find((line) => /\bPune\b/i.test(line)) || null,
        sourceUrl,
      })
    }

    return candidates
  }, baseUrl)
}

export const normalizeListingCandidate = (candidate = {}) => {
  const sourceUrl = absoluteUrl(candidate.sourceUrl, JOB_PORTAL_URL)
  const title = titleCaseWithoutPrefix(candidate.title)
  const experienceRequired = normalizeText(candidate.experience)
    || findFirstMatch([/(\d+\s*Years?)/i], candidate.text)
  const designation = normalizeText(candidate.designation)
    || findFirstMatch([/(Assistant Manager)/i], candidate.text)
  const { location, city, state, country } = parseLocation(candidate.location || candidate.text)

  if (!sourceUrl || !title || !location) return null

  const jobId = buildJobIdFromUrl(sourceUrl, title)

  return {
    title,
    company: COMPANY,
    designation,
    experienceRequired,
    location,
    city,
    state,
    country,
    jobId,
    requisitionId: jobId,
    sourceUrl,
    applyUrl: sourceUrl,
    department: null,
    employmentType: null,
    jobDescription: null,
  }
}

const extractDetailTitle = (html, listing = {}) =>
  titleCaseWithoutPrefix(findFirstMatch([/<h1[^>]*>([\s\S]*?)<\/h1>/i], html) || listing.title)

export const hasOfficialJobDetailSignal = (html = '', listing = {}) => {
  const lines = toTextLines(html)
  const title = extractDetailTitle(html, listing)
  const responsibilityLines = extractSectionLines(lines, 'Job Responsibilities', ['Job Qualifications'])
  const qualificationLines = extractSectionLines(lines, 'Job Qualifications')

  return Boolean(title)
    && lines.includes(title)
    && lines.some((line) => line.toLowerCase() === 'apply now')
    && responsibilityLines.length > 0
    && qualificationLines.length > 0
}

export const extractJobDetail = (html = '', listing = {}) => {
  if (!hasOfficialJobDetailSignal(html, listing)) {
    throw new Error('Endurance Technologies verified job detail no longer matches the trusted first-party surface')
  }

  const lines = toTextLines(html)
  const title = extractDetailTitle(html, listing)
  const designation = normalizeText(listing.designation)
    || findFirstMatch([/(Assistant Manager)/i], lines.join('\n'))
  const experienceRequired = normalizeText(listing.experienceRequired)
    || findFirstMatch([/(\d+\s*Years?)/i], lines.join('\n'))
  const { location, city, state, country } = parseLocation(
    listing.location || findFirstMatch([/(Pune(?:,\s*Maharashtra(?:,\s*India)?)?)/i], lines.join('\n')),
  )
  const responsibilityLines = extractSectionLines(lines, 'Job Responsibilities', ['Job Qualifications'])
  const qualificationLines = extractSectionLines(lines, 'Job Qualifications')
  const jobDescription = [
    ...buildDescriptionSection('Job Responsibilities', responsibilityLines),
    '',
    ...buildDescriptionSection('Job Qualifications', qualificationLines),
  ].join('\n')

  return {
    title,
    company: COMPANY,
    designation,
    department: listing.department || null,
    location,
    city,
    state,
    country,
    jobId: listing.jobId || buildJobIdFromUrl(listing.sourceUrl, title),
    requisitionId: listing.requisitionId || buildJobIdFromUrl(listing.sourceUrl, title),
    sourceUrl: listing.sourceUrl || null,
    applyUrl: listing.applyUrl || listing.sourceUrl || null,
    employmentType: listing.employmentType || null,
    experienceRequired,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: uniqueStrings([
      ...responsibilityLines,
      ...qualificationLines,
    ]),
    postingDate: null,
    closingDate: null,
    jobDescription,
    companyCareerPage: CAREERS_URL,
    companyDomain: PROVIDER_METADATA.companyDomain,
    atsPlatform: PROVIDER_METADATA.atsPlatform,
  }
}

const waitForSelectorIfAvailable = async (page, selector) => {
  if (typeof page.waitForSelector !== 'function') return

  await page.waitForSelector(selector, { timeout: DEFAULT_TIMEOUT_MS }).catch(() => null)
}

export const createEnduranceTechnologiesScraper = ({
  launchBrowser: launchBrowserImpl = launchBrowser,
  createOptimizedPage: createOptimizedPageImpl = createOptimizedPage,
  now = () => new Date().toISOString(),
  maxJobs = null,
} = {}) => ({
  async run() {
    const browser = await launchBrowserImpl()

    try {
      const page = await createOptimizedPageImpl(browser)

      await page.goto(CAREERS_URL, {
        waitUntil: 'domcontentloaded',
        timeout: DEFAULT_TIMEOUT_MS,
      })
      await waitForSelectorIfAvailable(page, 'body')

      const careersHtml = await page.content()
      if (!hasOfficialCareersPageSignal(careersHtml)) {
        throw new Error('Endurance Technologies careers page no longer matches the verified first-party surface')
      }

      const jobPortalUrl = extractJobPortalUrl(careersHtml)
      if (!sameUrl(jobPortalUrl, JOB_PORTAL_URL)) {
        throw new Error('Endurance Technologies careers page no longer exposes the verified first-party job portal handoff')
      }

      await page.goto(jobPortalUrl, {
        waitUntil: 'domcontentloaded',
        timeout: DEFAULT_TIMEOUT_MS,
      })
      await waitForSelectorIfAvailable(page, 'body')

      const jobPortalHtml = await page.content()
      if (!hasOfficialJobPortalSignal(jobPortalHtml)) {
        throw new Error('Endurance Technologies job portal no longer matches the verified first-party public surface')
      }

      const listings = uniqueStrings(
        (await collectListingCandidates(page, jobPortalUrl))
          .map((candidate) => JSON.stringify(normalizeListingCandidate(candidate)))
          .filter((value) => value !== 'null'),
      ).map((serialized) => JSON.parse(serialized))

      if (listings.length === 0) {
        throw new Error('Endurance Technologies job portal no longer exposes parseable first-party public openings')
      }

      const limitedListings = Number.isInteger(maxJobs) && maxJobs > 0
        ? listings.slice(0, maxJobs)
        : listings

      const jobs = []

      for (const listing of limitedListings) {
        await page.goto(listing.sourceUrl, {
          waitUntil: 'domcontentloaded',
          timeout: DEFAULT_TIMEOUT_MS,
        })
        await waitForSelectorIfAvailable(page, 'body')

        const detailHtml = await page.content()
        const detail = extractJobDetail(detailHtml, listing)

        jobs.push({
          ...detail,
          source: SOURCE,
          link: detail.applyUrl || detail.sourceUrl,
          scrapedAt: now(),
        })
      }

      return jobs
    } finally {
      await browser.close()
    }
  },
})

export const run = async (options = {}) => createEnduranceTechnologiesScraper(options).run()

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
