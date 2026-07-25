import path from 'node:path'
import { fileURLToPath } from 'node:url'

import CODEWAVE_TECHNOLOGIES_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = CODEWAVE_TECHNOLOGIES_CATALOG.source
export const COMPANY = CODEWAVE_TECHNOLOGIES_CATALOG.companyName
export const CAREERS_URL = CODEWAVE_TECHNOLOGIES_CATALOG.companyCareerPage
export const VERIFIED_ON = CODEWAVE_TECHNOLOGIES_CATALOG.verifiedOn

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

const normalizeUrl = (value) => {
  try {
    return new URL(String(value), CAREERS_URL).toString()
  } catch {
    return null
  }
}

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

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /<title>\s*Join Codewave:\s*React,\s*Python,\s*Flutter Jobs\s*\|\s*Remote & Bengaluru\s*<\/title>/i.test(page)
    && text.includes('Codewave Careers')
    && text.includes('Open Positions.')
}

export const extractOpeningCards = (html = '') => Array.from(
  String(html ?? '').matchAll(
    /<section\b[^>]*class=["'][^"']*opening[^"']*["'][^>]*>[\s\S]*?<h3>([\s\S]*?)<\/h3>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>\s*Find out more\s*<\/a>/gi,
  ),
  (match) => ({
    title: stripTags(match[1]),
    location: stripTags(match[2]),
    detailUrl: normalizeUrl(match[3]),
  }),
).filter((job) => job.title && job.location && job.detailUrl)

export const extractDetailSignals = (html = '') => {
  const page = String(html ?? '')
  const locationMatch = page.match(/<p>\s*(Bangalore)\s*<\/p>/i)
  const employmentTypeMatch = page.match(/<p>\s*(Full-time|Part-time|Contract)\s*<\/p>/i)
  const applyMatch = page.match(/<a[^>]+href=["']([^"']+)["'][^>]*>\s*Apply for this job\s*<\/a>/i)

  return {
    employmentType: normalizeWhitespace(employmentTypeMatch?.[1]),
    location: normalizeWhitespace(locationMatch?.[1]),
    applyUrl: normalizeUrl(applyMatch?.[1]),
  }
}

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const normalizeJob = (opening, detailSignals, scrapedAt) => ({
  title: opening.title,
  company: COMPANY,
  department: null,
  location: `${detailSignals.location}, India`,
  city: detailSignals.location,
  country: 'India',
  jobId: slugify(opening.title),
  requisitionId: slugify(opening.title),
  sourceUrl: opening.detailUrl,
  applyUrl: detailSignals.applyUrl || opening.detailUrl,
  employmentType: detailSignals.employmentType,
  experienceRequired: null,
  minimumQualification: null,
  preferredQualification: null,
  requiredSkills: [],
  postingDate: null,
  closingDate: null,
  jobDescription: null,
  source: SOURCE,
  link: opening.detailUrl,
  scrapedAt,
  companyCareerPage: CAREERS_URL,
  companyDomain: CODEWAVE_TECHNOLOGIES_CATALOG.companyDomain,
  atsPlatform: CODEWAVE_TECHNOLOGIES_CATALOG.atsPlatform,
})

export const createCodewaveTechnologiesScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Codewave careers page no longer matches the trusted first-party surface')
    }

    const openings = extractOpeningCards(careersHtml)
    if (openings.length === 0) {
      throw new Error('Codewave first-party careers page no longer exposes public openings')
    }

    const jobs = []
    for (const opening of openings) {
      const detailHtml = await fetchText(opening.detailUrl)
      const detailSignals = extractDetailSignals(detailHtml)
      if (!detailSignals.location || !detailSignals.employmentType) {
        throw new Error(`Codewave verified detail page changed materially: ${opening.detailUrl}`)
      }

      jobs.push(normalizeJob(opening, detailSignals, now()))
    }

    return jobs
  },
})

export const run = async (options = {}) => createCodewaveTechnologiesScraper(options).run(options)

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
