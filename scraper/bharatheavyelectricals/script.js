import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCity } from '../utils/cityNormalizer.js'
import { loadConfig } from '../utils/loadConfig.js'

import { BHARAT_HEAVY_ELECTRICALS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = BHARAT_HEAVY_ELECTRICALS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_AT = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const HOMEPAGE_LINKED_CAREERS_URL = PROVIDER_METADATA.homepageLinkedCareersUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const TRUSTED_OPENING_HOSTS = [
  'careers.bhel.in',
  'careers1.bhel.in',
  'sbdapp.bhel.in',
  'edn.bhel.com',
  'ednnet.bhel.in',
  'hpep.bhel.com',
  'bpl.bhel.com',
  'cdn.digialm.com',
  'www.digialm.com',
  'digialm.com',
  'secure-web.cisco.com',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const SECTION_HEADING_PATTERN = /<table[\s\S]*?<span[^>]*class\s*=\s*"lrgblb"[^>]*>\s*<strong>([\s\S]*?)<\/strong>\s*<\/span>[\s\S]*?<\/table>/gi
const CAREERS_SECTION_PATTERN = /<div[^>]+id\s*=\s*"openings"[\s\S]*?(?=<div[^>]+id\s*=\s*"whybhel"|$)/i
const LOCATION_HINTS = [
  'Bengaluru',
  'Bangalore',
  'Bhopal',
  'Hyderabad',
  'Haridwar',
  'Noida',
  'Trichy',
  'Ranipet',
  'Jhansi',
  'Jagdishpur',
  'Delhi',
  'Mumbai',
  'Visakhapatnam',
  'Kapurthala',
]

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#8211;|&ndash;/gi, '-')
    .replace(/&#8217;|&rsquo;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const stripComments = (value) => String(value ?? '').replace(/<!--[\s\S]*?-->/g, ' ')

const escapeRegex = (value) => String(value ?? '').replace(/[|\\{}()[\]^$+*?.-]/g, '\\$&')

const slugify = (value) =>
  normalizeWhitespace(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const toAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const getFinalUrl = (page, fallbackUrl) => page?.url || page?.finalUrl || fallbackUrl

const decodeCiscoWrappedUrl = (value) => {
  const absoluteUrl = toAbsoluteUrl(value)
  if (!absoluteUrl) return null

  try {
    const url = new URL(absoluteUrl)
    if (url.hostname !== 'secure-web.cisco.com') {
      return absoluteUrl
    }

    const encodedTarget = absoluteUrl.match(/(https%3A%2F%2F.+)$/i)?.[1]
    if (!encodedTarget) {
      return absoluteUrl
    }

    return decodeURIComponent(encodedTarget)
  } catch {
    return absoluteUrl
  }
}

const isTrustedOpeningUrl = (value) => {
  const canonicalUrl = decodeCiscoWrappedUrl(value)
  if (!canonicalUrl) return false

  try {
    const url = new URL(canonicalUrl)
    return TRUSTED_OPENING_HOSTS.includes(url.hostname)
  } catch {
    return false
  }
}

const extractLinks = (html = '') => Array.from(
  String(html ?? '').matchAll(/<a[^>]+href\s*=\s*"([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi),
  (match) => ({
    href: match[1],
    text: normalizeWhitespace(match[2]),
    absoluteUrl: toAbsoluteUrl(match[1]),
  }),
)

const getSectionMarker = (heading) => `[[SECTION:${normalizeWhitespace(heading)}]]`

const extractOpeningBlocks = (html = '') => {
  const sectionHtml = String(html ?? '').match(CAREERS_SECTION_PATTERN)?.[0]
  if (!sectionHtml) {
    return []
  }

  const transformed = stripComments(sectionHtml).replace(
    SECTION_HEADING_PATTERN,
    (_, heading) => getSectionMarker(heading),
  )
  const tokens = transformed
    .split(/(\[\[SECTION:[^\]]+\]\]|<img\s+src\s*=\s*"arrow3\.gif"[^>]*>)/i)
    .filter(Boolean)
  const blocks = []
  let currentSection = null

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    const sectionMatch = token.match(/^\[\[SECTION:(.+)\]\]$/)

    if (sectionMatch) {
      currentSection = sectionMatch[1]
      continue
    }

    if (!/^<img\s+src\s*=\s*"arrow3\.gif"/i.test(token)) {
      continue
    }

    blocks.push({
      department: currentSection || 'Current Openings',
      html: `${token}${tokens[index + 1] || ''}`,
    })
  }

  return blocks
}

const extractOpeningTitle = (html = '') => {
  const titleMatch = String(html ?? '').match(/<b>([\s\S]*?)<\/b>/i)
  const title = normalizeWhitespace(titleMatch?.[1] ?? '')
  return title || null
}

const findTrustedLink = (links = [], matcher) => {
  const matchingLinks = links.filter((link) => matcher(link.text))
  if (matchingLinks.length === 0) return null

  const trustedLink = matchingLinks.find((link) => isTrustedOpeningUrl(link.absoluteUrl))
  if (!trustedLink) {
    throw new Error('Bharat Heavy Electricals verified trusted public opening link changed materially')
  }

  return decodeCiscoWrappedUrl(trustedLink.absoluteUrl)
}

const selectBestOpeningUrl = (title, links) => {
  const applyUrl = findTrustedLink(links, (text) => /\b(apply online|apply online|apply|login)\b/i.test(text))
  if (applyUrl) {
    return applyUrl
  }

  const titleLink = links.find((link) =>
    link.text === title
    && link.href !== '#'
    && isTrustedOpeningUrl(link.absoluteUrl))
  if (titleLink) {
    return decodeCiscoWrappedUrl(titleLink.absoluteUrl)
  }

  const advertisementUrl = findTrustedLink(links, (text) =>
    /\b(detailed advertisement|advertisement|advt|how to apply)\b/i.test(text))
  if (advertisementUrl) {
    return advertisementUrl
  }

  const fallbackLink = links.find((link) =>
    link.href !== '#'
    && isTrustedOpeningUrl(link.absoluteUrl))
  if (fallbackLink) {
    return decodeCiscoWrappedUrl(fallbackLink.absoluteUrl)
  }

  throw new Error('Bharat Heavy Electricals verified trusted public opening link changed materially')
}

const extractLocation = (title) => {
  const matchedCity = LOCATION_HINTS.find((hint) =>
    new RegExp(`\\b${escapeRegex(hint)}\\b`, 'i').test(title))
  if (!matchedCity) {
    return { city: null, location: null }
  }

  const city = normalizeCity(matchedCity)
  if (!city) {
    return { city: null, location: null }
  }

  return {
    city,
    location: `${city}, India`,
  }
}

const inferEmploymentType = (title) => {
  if (/\bpart[- ]time\b/i.test(title)) return 'Part-time'
  if (/\bfixed tenure\b|\bfta\b/i.test(title)) return 'Fixed-term'
  return null
}

const normalizeJob = ({ department, html }, scrapedAt) => {
  const title = extractOpeningTitle(html)
  if (!title) {
    return null
  }

  const links = extractLinks(html)
  const selectedUrl = selectBestOpeningUrl(title, links)
  const { city, location } = extractLocation(title)

  return {
    jobId: slugify(title),
    title,
    company: COMPANY,
    department,
    location,
    city,
    state: null,
    country: location ? 'India' : null,
    sourceUrl: selectedUrl,
    applyUrl: selectedUrl,
    employmentType: inferEmploymentType(title),
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: normalizeWhitespace(html) || null,
    requisitionId: slugify(title),
    source: SOURCE,
    link: selectedUrl,
    scrapedAt,
  }
}

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

export const extractHomepageCareersUrl = (html = '') => {
  const links = extractLinks(html)

  return links.find((link) =>
    /working at bhel|current job openings/i.test(link.text)
    && decodeCiscoWrappedUrl(link.absoluteUrl) === HOMEPAGE_LINKED_CAREERS_URL)
    ? HOMEPAGE_LINKED_CAREERS_URL
    : null
}

export const hasOfficialHomepageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Official Website of Bharat Heavy Electricals Limited, New Delhi, India \|\s*<\/title>/i.test(page)
    && /Career with BHEL/i.test(normalized)
    && extractHomepageCareersUrl(page) === HOMEPAGE_LINKED_CAREERS_URL
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = stripComments(String(html ?? ''))
  const normalized = normalizeWhitespace(page)

  return (/<title>\s*BHEL Careers Portal\s*<\/title>/i.test(page) || /BHEL Careers Portal/i.test(normalized))
    && /Current Openings/i.test(normalized)
    && /Regular Recruitment/i.test(normalized)
    && /Recruitment of Consultants\/Experts\/Deputation/i.test(normalized)
    && /Recruitment of FTA\/ Part-Time positions/i.test(normalized)
    && /arrow3\.gif/i.test(page)
}

export const extractJobsFromCareersPage = (html = '', scrapedAt = new Date().toISOString()) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('Bharat Heavy Electricals verified public careers surface changed materially')
  }

  const jobs = []
  const seenKeys = new Set()

  for (const block of extractOpeningBlocks(html)) {
    const job = normalizeJob(block, scrapedAt)
    if (!job) continue

    const dedupeKey = `${job.jobId}::${job.sourceUrl}`
    if (seenKeys.has(dedupeKey)) continue

    seenKeys.add(dedupeKey)
    jobs.push(job)
  }

  if (jobs.length === 0) {
    throw new Error('Bharat Heavy Electricals verified public careers surface returned no openings')
  }

  return jobs
}

export const createBharatHeavyElectricalsScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Bharat Heavy Electricals verified official homepage no longer matches the known public surface')
    }

    if (extractHomepageCareersUrl(homepage.html) !== HOMEPAGE_LINKED_CAREERS_URL) {
      throw new Error('Bharat Heavy Electricals verified homepage careers handoff changed materially')
    }

    const careersPage = await fetchPage(CAREERS_URL)
    if (careersPage.status !== 200 || getFinalUrl(careersPage, CAREERS_URL) !== CAREERS_URL) {
      throw new Error('Bharat Heavy Electricals verified public careers surface changed materially')
    }

    const jobs = extractJobsFromCareersPage(careersPage.html, now())
    return maxJobs ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async (options = {}) => createBharatHeavyElectricalsScraper(options).run(options)

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
