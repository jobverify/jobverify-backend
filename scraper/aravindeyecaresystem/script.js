import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ARAVIND_EYE_CARE_SYSTEM_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = ARAVIND_EYE_CARE_SYSTEM_CATALOG.source
export const COMPANY = ARAVIND_EYE_CARE_SYSTEM_CATALOG.companyName
export const HOMEPAGE_URL = ARAVIND_EYE_CARE_SYSTEM_CATALOG.homepageUrl
export const CAREERS_PAGE_URL = ARAVIND_EYE_CARE_SYSTEM_CATALOG.companyCareerPage
export const PAGE_SITEMAP_URL = ARAVIND_EYE_CARE_SYSTEM_CATALOG.pageSitemapUrl
export const JOB_LISTINGS_AJAX_URL = ARAVIND_EYE_CARE_SYSTEM_CATALOG.jobListingsAjaxUrl
export const JOB_LISTINGS_API_URL = ARAVIND_EYE_CARE_SYSTEM_CATALOG.jobListingsApiUrl
export const VERIFIED_ON = ARAVIND_EYE_CARE_SYSTEM_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = ARAVIND_EYE_CARE_SYSTEM_CATALOG.verifiedSurfaceSummary
export const KNOWN_LIVE_JOB_LINKS = [
  'https://aravind.org/job/driver/',
  'https://aravind.org/job/ac-mechanic/',
  'https://aravind.org/job/data-engineering-jd/',
]

const KNOWN_LIVE_JOBS = [
  { title: 'Driver', link: 'https://aravind.org/job/driver/' },
  { title: 'AC Mechanic', link: 'https://aravind.org/job/ac-mechanic/' },
  { title: 'Data Engineering JD', link: 'https://aravind.org/job/data-engineering-jd/' },
]

const SECTION_LABELS = [
  'Required Skills and Experience',
  'Job Responsibilities',
  'Key Responsibilities',
  'Skills Required',
  'Qualifications',
  'Experience',
  'Age Preference',
  'About the Role',
  'Nice to Have',
  'Location',
  'To Contact',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const NAMED_ENTITIES = new Map([
  ['amp', '&'],
  ['nbsp', ' '],
  ['quot', '"'],
  ['apos', "'"],
  ['rsquo', "'"],
  ['lsquo', "'"],
  ['ldquo', '"'],
  ['rdquo', '"'],
  ['hellip', '...'],
  ['ndash', '-'],
  ['mdash', '-'],
])

const escapeRegExp = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES.get(name.toLowerCase()) ?? match)

const normalizeText = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim()

  return normalized || null
}

const firstNonEmpty = (...values) => {
  for (const value of values) {
    const normalized = normalizeText(value)
    if (normalized) return normalized
  }

  return null
}

const htmlToLines = (html) => decodeHtmlEntities(String(html ?? ''))
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/?(?:p|div|h[1-6]|ul|ol)\b[^>]*>/gi, '\n')
  .replace(/<li\b[^>]*>/gi, '\n')
  .replace(/<\/li>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .split(/\r?\n/)
  .map((line) => normalizeText(line))
  .filter(Boolean)

const htmlToText = (html) => firstNonEmpty(htmlToLines(html).join(' '), '')

const findSectionStart = (line) => {
  const normalizedLine = normalizeText(line)
  if (!normalizedLine) return null

  for (const label of SECTION_LABELS) {
    const match = normalizedLine.match(new RegExp(`^${escapeRegExp(label)}\\s*:?\\s*(.*)$`, 'i'))
    if (match) {
      return {
        label,
        remainder: normalizeText(match[1]),
      }
    }
  }

  return null
}

const extractSections = (html) => {
  const lines = htmlToLines(html)
  const sections = new Map()
  let currentSection = null

  for (const line of lines) {
    const sectionStart = findSectionStart(line)
    if (sectionStart) {
      currentSection = sectionStart.label
      if (!sections.has(currentSection)) sections.set(currentSection, [])
      if (sectionStart.remainder) {
        sections.get(currentSection).push(sectionStart.remainder)
      }
      continue
    }

    if (currentSection) {
      sections.get(currentSection).push(line.replace(/^- /, '').trim())
    }
  }

  return { lines, sections }
}

const getSectionLines = (sections, label) => (
  Array.isArray(sections?.get?.(label))
    ? sections.get(label).map((line) => normalizeText(line)).filter(Boolean)
    : []
)

const unique = (values) => [...new Set(values.map((value) => normalizeText(value)).filter(Boolean))]

const extractCity = (location) => normalizeText(String(location ?? '').split(',')[0]) || null

const extractAjaxField = (value) => normalizeText(String(value ?? '').replace(/<[^>]+>/g, ' '))

export const extractSitemapUrls = (xml) =>
  [...String(xml ?? '').matchAll(/<loc>(.*?)<\/loc>/gi)]
    .map((match) => normalizeText(match[1]))
    .filter(Boolean)

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeText(rawHtml)

  return /<title>\s*Home - Aravind Eye Care System Aravind Eye Care System\s*<\/title>/i.test(rawHtml)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/aravind\.org\/["']/i.test(rawHtml)
    && /href=["']https:\/\/aravind\.org\/careers\/["']/i.test(rawHtml)
    && /href=["']https:\/\/aravind\.org\/aop-recruitment\/["']/i.test(rawHtml)
    && /Providing compassionate and quality eye care affordable to all/i.test(normalized)
    && /© 2026 Aravind Eye Care System \| All rights reserved/i.test(normalized)
}

export const hasOfficialCareersPageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeText(rawHtml)

  return /<title>\s*Careers - Aravind Eye Care System\s*<\/title>/i.test(rawHtml)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/aravind\.org\/careers\/["']/i.test(rawHtml)
    && /Click here to apply for any other post/i.test(normalized)
    && /Current Openings/i.test(normalized)
    && /class=["']job_listings["']/i.test(rawHtml)
    && /data-post_id=["']1989["']/i.test(rawHtml)
    && /class=["']job_filters["']/i.test(rawHtml)
    && /Search Jobs/i.test(normalized)
    && /AuroiTech-Madurai/i.test(normalized)
    && /Load more listings/i.test(normalized)
    && /job_manager_ajax_filters/i.test(rawHtml)
    && /ajax_url/i.test(rawHtml)
    && /jm-ajax/i.test(rawHtml)
    && /%%endpoint%%/i.test(rawHtml)
    && /wp-job-manager/i.test(rawHtml)
}

export const hasExpectedPageSitemapSignal = (xml) => {
  const urls = extractSitemapUrls(xml)

  return urls.includes('https://aravind.org/')
    && urls.includes('https://aravind.org/post-jobs/')
    && urls.includes('https://aravind.org/careers/')
    && urls.includes('https://aravind.org/aop-recruitment/')
}

export const extractAjaxListings = (payload = {}) => (
  [...String(payload?.html ?? '').matchAll(
    /<a href="([^"]+)">[\s\S]*?<h3>([\s\S]*?)<\/h3>[\s\S]*?<div class="company">\s*<strong>([\s\S]*?)<\/strong>[\s\S]*?<div class="location">\s*([\s\S]*?)\s*<\/div>[\s\S]*?<li class="job-type [^"]*">([\s\S]*?)<\/li>/gi,
  )]
    .map((match) => ({
      title: extractAjaxField(match[2]),
      company: extractAjaxField(match[3]),
      location: extractAjaxField(match[4]),
      employmentType: extractAjaxField(match[5]),
      link: normalizeText(match[1]),
    }))
    .filter((listing) => listing.title && listing.company && listing.location && listing.employmentType && listing.link)
)

export const buildAjaxListingMap = (payload = {}) => new Map(
  extractAjaxListings(payload).map((listing) => [listing.link, listing]),
)

export const hasExpectedAjaxListingsSignal = (payload = {}) => {
  if (payload?.found_jobs !== true) return false
  if (Number(payload?.max_num_pages) < 1) return false

  const listings = extractAjaxListings(payload)

  return KNOWN_LIVE_JOBS.every((expectedJob) =>
    listings.some((listing) => listing.title === expectedJob.title && listing.link === expectedJob.link))
}

export const hasExpectedJobListingsApiSignal = (payload = {}) => (
  Array.isArray(payload)
  && KNOWN_LIVE_JOBS.every((expectedJob) =>
    payload.some((record) =>
      String(record?.status ?? '').toLowerCase() === 'publish'
      && String(record?.type ?? '').toLowerCase() === 'job_listing'
      && normalizeText(record?.title?.rendered) === expectedJob.title
      && normalizeText(record?.link) === expectedJob.link))
)

const extractExperienceRequired = (sections) => {
  const explicitExperience = getSectionLines(sections, 'Experience')[0]
  if (explicitExperience) return explicitExperience

  return getSectionLines(sections, 'Required Skills and Experience')
    .find((line) => /\byears?\b/i.test(line)) || null
}

const extractMinimumQualification = (sections) => {
  const qualifications = getSectionLines(sections, 'Qualifications')
  if (qualifications.length === 0) return null
  return qualifications.join('; ')
}

const extractRequiredSkills = (sections) => {
  const skills = getSectionLines(sections, 'Skills Required')
  if (skills.length > 0) return unique(skills)

  return unique(
    getSectionLines(sections, 'Required Skills and Experience')
      .filter((line) => !/\byears?\b/i.test(line)),
  )
}

const buildJobDescription = (lines = []) => lines
  .map((line) => (line === 'Qualifications' ? 'Qualifications:' : line))
  .join(' ')

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const defaultFetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain,*/*',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const extractSearchResults = (payload = [], ajaxListingMap = new Map()) => (
  Array.isArray(payload) ? payload : []
)
  .map((record) => {
    const title = normalizeText(record?.title?.rendered)
    const sourceUrl = normalizeText(record?.link)
    const ajaxListing = sourceUrl ? ajaxListingMap.get(sourceUrl) : null
    const location = firstNonEmpty(record?.meta?._job_location, ajaxListing?.location)

    if (!title || !sourceUrl) return null

    const { lines, sections } = extractSections(record?.content?.rendered)

    return {
      title,
      company: firstNonEmpty(record?.meta?._company_name, ajaxListing?.company, COMPANY),
      department: null,
      location,
      city: extractCity(location),
      country: 'India',
      jobId: normalizeText(record?.id),
      requisitionId: normalizeText(record?.slug),
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: firstNonEmpty(ajaxListing?.employmentType),
      experienceRequired: extractExperienceRequired(sections),
      minimumQualification: extractMinimumQualification(sections),
      preferredQualification: null,
      requiredSkills: extractRequiredSkills(sections),
      postingDate: normalizeText(String(record?.date ?? '').slice(0, 10)),
      closingDate: null,
      jobDescription: firstNonEmpty(buildJobDescription(lines), null),
    }
  })
  .filter(Boolean)

export const createAravindEyeCareSystemScraper = () => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchJson = defaultFetchJson,
  } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Aravind Eye Care System verified official homepage no longer matches the known public surface')
    }

    const careersPage = await fetchPage(CAREERS_PAGE_URL)
    if (careersPage.status !== 200 || !hasOfficialCareersPageSignal(careersPage.html)) {
      throw new Error('Aravind Eye Care System verified official careers page no longer matches the known public surface')
    }

    const pageSitemap = await fetchPage(PAGE_SITEMAP_URL)
    if (pageSitemap.status !== 200 || !hasExpectedPageSitemapSignal(pageSitemap.html)) {
      throw new Error('Aravind Eye Care System verified page sitemap no longer matches the known public surface')
    }

    const ajaxPayload = await fetchJson(JOB_LISTINGS_AJAX_URL)
    if (!hasExpectedAjaxListingsSignal(ajaxPayload)) {
      throw new Error('Aravind Eye Care System verified public ajax job feed no longer matches the known public surface')
    }

    const apiPayload = await fetchJson(JOB_LISTINGS_API_URL)
    if (!hasExpectedJobListingsApiSignal(apiPayload)) {
      throw new Error('Aravind Eye Care System verified public job feed no longer matches the known public surface')
    }

    const ajaxListingMap = buildAjaxListingMap(ajaxPayload)

    return extractSearchResults(apiPayload, ajaxListingMap).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createAravindEyeCareSystemScraper().run(options)

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
