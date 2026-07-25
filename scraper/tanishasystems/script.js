import path from 'node:path'
import { fileURLToPath } from 'node:url'

import TANISHA_SYSTEMS_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = TANISHA_SYSTEMS_CATALOG.source
export const COMPANY = TANISHA_SYSTEMS_CATALOG.companyName
export const CAREERS_URL = TANISHA_SYSTEMS_CATALOG.companyCareerPage
export const VERIFIED_ON = TANISHA_SYSTEMS_CATALOG.verifiedOn

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(String(value ?? '').replace(/<[^>]+>/g, ' '))

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const parseOpeningsCount = (value) => {
  const match = String(value ?? '').match(/(\d+)\s+Openings?/i)
  return match ? Number.parseInt(match[1], 10) : null
}

export const hasOfficialCurrentOpeningsSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /<title>\s*Current Openings - Tanisha Systems Inc\.\s*<\/title>/i.test(page)
    && text.includes('Current Openings')
    && text.includes('You can view our most current openings below on this page.')
}

export const extractCurrentOpenings = (html = '') => Array.from(
  String(html ?? '').matchAll(/<section\b[^>]*class=["'][^"']*opening[^"']*["'][^>]*>([\s\S]*?)<\/section>/gi),
  (match) => {
    const section = match[1]
    const title = stripTags(section.match(/<h2>([\s\S]*?)<\/h2>/i)?.[1])
    const openingsCount = parseOpeningsCount(stripTags(section.match(/<p>([\s\S]*?Openings[\s\S]*?)<\/p>/i)?.[1]))
    const detailLocationLine = Array.from(
      section.matchAll(/<p>([\s\S]*?)<\/p>/gi),
      (lineMatch) => stripTags(lineMatch[1]),
    ).find((line) => /^Job Locations:/i.test(line))
    const jobId = slugify(title)

    return {
      title,
      location: normalizeWhitespace(String(detailLocationLine ?? '').replace(/^Job Locations:\s*/i, '')),
      sourceUrl: `${CAREERS_URL}#${jobId}`,
      jobId,
      openingsCount,
    }
  },
).filter((job) => job.title && job.location && job.jobId)

export const createTanishaSystemsScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREERS_URL)
    if (!hasOfficialCurrentOpeningsSignal(html)) {
      throw new Error('The verified Tanisha Systems current openings page no longer matches the trusted first-party surface')
    }

    const openings = extractCurrentOpenings(html)
    if (openings.length === 0) {
      throw new Error('Tanisha Systems current openings page no longer exposes trusted public openings')
    }

    return openings.map((opening) => ({
      title: opening.title,
      company: COMPANY,
      department: null,
      location: opening.location,
      city: null,
      country: 'United States',
      jobId: opening.jobId,
      requisitionId: opening.jobId,
      sourceUrl: opening.sourceUrl,
      applyUrl: opening.sourceUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      source: SOURCE,
      link: opening.sourceUrl,
      scrapedAt: now(),
      companyCareerPage: CAREERS_URL,
      companyDomain: TANISHA_SYSTEMS_CATALOG.companyDomain,
      atsPlatform: TANISHA_SYSTEMS_CATALOG.atsPlatform,
      openingsCount: opening.openingsCount,
    }))
  },
})

export const run = async (options = {}) => createTanishaSystemsScraper(options).run(options)

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
