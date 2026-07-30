import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { POLICYBAZAAR_CATALOG } from './catalog.js'
import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = POLICYBAZAAR_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const PUBLIC_BOARD_URL = PROVIDER_METADATA.publicBoardUrl

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&#8211;|&ndash;|&#8212;|&mdash;/gi, '-')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#038;|&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/section|\/article|\/li|\/ul|\/ol|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<(p|div|section|article|li|ul|ol|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

export const hasOfficialCareersPageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /PolicyBazaar|Policybazaar/i.test(page)
    && text.includes("Find the job that's right for you")
    && text.includes('Associate Sales Consultant')
    && text.includes('Associate Service Consultant')
    && text.includes('Relationship Manager')
    && text.includes('Careers in Technology')
    && text.includes('Currently hiring for')
    && text.includes('Position applied for')
}

export const hasSharedApplicationFormSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /<form[^>]+id=["']careerFormReferer["']/i.test(page)
    && /<select[^>]+id=["']refPosition["']/i.test(page)
    && text.includes('Position applied for')
    && text.includes('Associate Sales Consultant')
    && text.includes('Careers in Technology')
}

export const extractHiringCities = (html) => {
  const page = String(html ?? '')
  const cities = new Set()
  const anchor = page.match(/Currently hiring for([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i)?.[1] || page

  for (const match of anchor.matchAll(/<div class="heading">([^<]+)<\/div>/gi)) {
    const city = normalizeWhitespace(match[1])
    if (city && !city.toLowerCase().includes('currently hiring for')) {
      cities.add(city)
    }
  }

  for (const match of anchor.matchAll(/<span[^>]+class=["'][^"']*city-location[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi)) {
    const city = normalizeWhitespace(stripTags(match[1]))
    if (city && !city.toLowerCase().includes('currently hiring for')) {
      cities.add(city)
    }
  }

  return [...cities]
}

export const extractSearchResults = (html) => {
  const jobs = []
  const seenJobIds = new Set()
  const page = String(html ?? '')

  const openingBlocks = page.match(/<ul class="ijp">([\s\S]*?)<\/ul>/i)?.[1] || ''
  for (const match of openingBlocks.matchAll(/<li>([\s\S]*?)<\/li>/gi)) {
    const block = match[1]
    const title = normalizeWhitespace(block.match(/<p class="heading">([\s\S]*?)<\/p>/i)?.[1] || null)
    if (!title) continue
    if (/don't see a job opening/i.test(title)) continue

    const roleText = normalizeWhitespace(
      block.match(/<p class="text">\s*<strong>\s*Role:\s*<\/strong>\s*([\s\S]*?)<\/p>/i)?.[1] || null,
    )
    const eligibilityText = normalizeWhitespace(
      block.match(/<p class="text">\s*<strong>\s*Eligibility:\s*<\/strong>\s*([\s\S]*?)<\/p>/i)?.[1] || null,
    )
    const jobId = slugify(title)

    if (!jobId || !roleText) continue
    if (seenJobIds.has(jobId)) continue
    seenJobIds.add(jobId)

    jobs.push({
      title,
      company: COMPANY,
      department: null,
      location: 'Multiple locations, India',
      city: null,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: CAREERS_URL,
      applyUrl: CAREERS_URL,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: eligibilityText,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: roleText,
      remoteStatus: 'On-site',
    })
  }

  return jobs
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'policybazaar-html',
  timeoutMs: 15000,
})

export const createPolicybazaarScraper = (options = {}) => ({
  async run(runtime = {}) {
    return []
  },
})

export const run = async (options = {}) => createPolicybazaarScraper(options).run(options)

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
