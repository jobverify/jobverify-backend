import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { SHOPCLUES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = SHOPCLUES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const CURRENT_OPENINGS_URL = PROVIDER_METADATA.currentOpeningsUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobverify scraper)'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripScriptsAndStyles = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')

const htmlToLines = (value) => decodeHtmlEntities(
  stripScriptsAndStyles(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)
  .split(/\r?\n/)
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  || null

const normalizeDepartment = (value) => normalizeWhitespace(value)?.replace(/\s+\(\d+\)$/, '') || null

const looksLikeDepartmentHeading = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return false
  if (normalized.length > 60) return false
  if (normalized.includes(':')) return false
  return !/^(current opening|careers|open positions|apply for this position|send us your resume)/i.test(normalized)
}

const parseLocation = (value) => {
  const normalized = normalizeWhitespace(value)?.replace(/\.+$/, '') || null
  if (!normalized) {
    return {
      location: 'India',
      city: null,
      state: null,
      country: 'India',
    }
  }

  const parts = normalized.split(',').map((part) => normalizeWhitespace(part)).filter(Boolean)
  const city = parts[0] || null
  const state = parts[1] || null

  return {
    location: `${normalized}, India`,
    city,
    state,
    country: 'India',
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'shopclues-official',
  timeoutMs: 15000,
})

export const hasOfficialCareersLandingSignal = (html = '') => {
  const normalized = (normalizeWhitespace(stripScriptsAndStyles(html)) || '').toLowerCase()

  return normalized.includes('career')
    && normalized.includes('interested in exploring a career with disruptive & innovative startup?')
    && normalized.includes('jobs by group')
    && normalized.includes('view all jobs')
    && normalized.includes('career@shopclues.com')
  }

export const hasOfficialCurrentOpeningsSignal = (html = '') => {
  const normalized = (normalizeWhitespace(stripScriptsAndStyles(html)) || '').toLowerCase()

  return normalized.includes('current opening')
    && normalized.includes('open positions')
    && normalized.includes("interested in exploring a career with a pathbreaking company? you've reached the right place!")
    && normalized.includes('career@shopclues.com')
    && normalized.includes('position:')
  }

export const extractOpenPositionBlocks = (html = '') => {
  const lines = htmlToLines(html)
  const startIndex = lines.findIndex((line) => /^open positions$/i.test(line))
  if (startIndex < 0) return []

  const blocks = []
  let currentDepartment = null
  let currentBlock = null

  const finalizeCurrentBlock = () => {
    if (!currentBlock?.title || !currentBlock?.location) return

    blocks.push({
      department: currentBlock.department,
      title: currentBlock.title,
      location: currentBlock.location,
      description: normalizeWhitespace(currentBlock.descriptionLines.join(' ')),
    })
  }

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]
    const nextLine = lines[index + 1] || ''

    if (/^position:/i.test(line)) {
      if (currentBlock) finalizeCurrentBlock()

      currentBlock = {
        department: currentDepartment,
        title: normalizeWhitespace(line.replace(/^position:/i, '')),
        location: null,
        descriptionLines: [],
      }
      continue
    }

    if (currentBlock) {
      if (looksLikeDepartmentHeading(line) && /^position:/i.test(nextLine)) {
        finalizeCurrentBlock()
        currentBlock = null
        currentDepartment = normalizeDepartment(line)
        continue
      }

      if (/^apply for this position location:/i.test(line)) {
        currentBlock.location = normalizeWhitespace(line.replace(/^apply for this position location:/i, ''))
        continue
      }

      if (!/^apply for this position$/i.test(line)) {
        currentBlock.descriptionLines.push(line)
      }
      continue
    }

    if (looksLikeDepartmentHeading(line) && /^position:/i.test(nextLine)) {
      currentDepartment = normalizeDepartment(line)
    }
  }

  if (currentBlock) finalizeCurrentBlock()

  return blocks.filter((block) => block.title && block.location)
}

const buildJobsFromOpenPositionBlocks = (blocks = [], { scrapedAt } = {}) => blocks.map((block) => {
  const normalizedTitle = normalizeWhitespace(block.title)
  const jobId = slugify(normalizedTitle)
  const parsedLocation = parseLocation(block.location)

  return {
    title: normalizedTitle,
    company: COMPANY_NAME,
    department: normalizeDepartment(block.department),
    location: parsedLocation.location,
    city: parsedLocation.city,
    state: parsedLocation.state,
    country: parsedLocation.country,
    jobId,
    requisitionId: jobId,
    sourceUrl: CURRENT_OPENINGS_URL,
    applyUrl: CURRENT_OPENINGS_URL,
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: normalizeWhitespace(block.description),
    remoteStatus: 'On-site',
    source: SOURCE,
    link: CURRENT_OPENINGS_URL,
    scrapedAt,
  }
}).filter((job) => job.title && job.jobId)

export const createShopCluesScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersLandingHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersLandingSignal(careersLandingHtml)) {
      throw new Error('The official ShopClues careers landing no longer matches the verified public surface')
    }

    const currentOpeningsHtml = await fetchText(CURRENT_OPENINGS_URL)
    if (!hasOfficialCurrentOpeningsSignal(currentOpeningsHtml)) {
      throw new Error('The official ShopClues current openings page no longer matches the verified public surface')
    }

    const jobs = buildJobsFromOpenPositionBlocks(
      extractOpenPositionBlocks(currentOpeningsHtml),
      { scrapedAt: now() },
    )

    if (jobs.length === 0) {
      throw new Error('ShopClues public static openings page no longer exposes verified position blocks')
    }

    return jobs
  },
})

export const run = async (options = {}) => createShopCluesScraper().run(options)

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
