import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import MOTIVITYLABS_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = MOTIVITYLABS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const JOB_OPENINGS_URL = PROVIDER_METADATA.officialCareersPageUrl
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

const stripScriptsAndStyles = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const htmlToLines = (value) => decodeHtmlEntities(
  stripScriptsAndStyles(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6|a)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)
  .split(/\r?\n/)
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const extractSectionLines = (lines, startLabels, endLabels) => {
  const startIndex = lines.findIndex((line) => startLabels.includes(line))
  if (startIndex < 0) return []

  const values = []
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (endLabels.includes(line)) break
    values.push(line)
  }

  return values
}

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = (normalizeWhitespace(stripScriptsAndStyles(html)) || '').toLowerCase()

  return normalized.includes('join the circle of motivating innovators')
    && normalized.includes('current roles available')
    && normalized.includes('careers@motivitylabs.com')
}

export const hasJobOpeningsSignal = (html = '') => {
  const normalized = (normalizeWhitespace(stripScriptsAndStyles(html)) || '').toLowerCase()

  return normalized.includes('current openings')
    && normalized.includes('more details')
    && normalized.includes('hyderabad')
}

export const extractJobCards = (html = '') => [...String(html ?? '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
  .map((match) => {
    const href = match[1]
    const text = normalizeWhitespace(match[2])
    if (!href || !text || !text.includes('More Details')) return null

    const cleaned = text.replace(/\s+More Details$/i, '')
    const parts = cleaned.match(/^(.*)\s+(\d+\+\s*(?:Years|years))\s+([A-Za-z]+)$/)
    if (!parts) return null

    return {
      title: normalizeWhitespace(parts[1]),
      experienceRequired: normalizeWhitespace(parts[2]),
      location: normalizeWhitespace(parts[3]),
      detailUrl: href,
    }
  })
  .filter(Boolean)

export const extractJobDetail = (html = '', card = {}, { scrapedAt } = {}) => {
  const lines = htmlToLines(html)
  const title = lines.find((line) => line.startsWith('Job Title:'))?.replace(/^Job Title:\s*/i, '')
    || normalizeWhitespace(card.title)
  const experienceRequired = lines.find((line) => line.startsWith('Experience:'))?.replace(/^Experience:\s*/i, '')
    || normalizeWhitespace(card.experienceRequired)
  const employmentType = lines.find((line) => line.startsWith('Job Type:'))?.replace(/^Job Type:\s*/i, '')
    || null
  const location = lines.find((line) => line.startsWith('Job Location:'))?.replace(/^Job Location:\s*/i, '')
    || normalizeWhitespace(card.location)
  const jobDescription = extractSectionLines(
    lines,
    ['Area Role & Responsibilities'],
    ['Required Competencies', 'Technical Skill Set / Competencies', 'Experience:', 'Job Type:', 'Job Location:'],
  )[0] || null
  const requiredSkills = extractSectionLines(
    lines,
    ['Required Competencies'],
    ['Technical Skill Set / Competencies', 'Please share your references to Talent@motivitylabs.com / referrals@motivitylabs.com', 'Experience:', 'Job Type:', 'Job Location:'],
  ).filter(Boolean)
  const applyEmail = String(html ?? '').match(/Talent@motivitylabs\.com/i) ? 'mailto:talent@motivitylabs.com' : null
  const jobId = String(card.detailUrl ?? '').split('/').filter(Boolean).at(-1) || null

  if (!title || !jobId) return null

  return {
    title: normalizeWhitespace(title),
    company: COMPANY,
    department: null,
    location: location ? `${normalizeWhitespace(location)}, India` : 'India',
    city: normalizeWhitespace(location),
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl: card.detailUrl,
    applyUrl: applyEmail,
    employmentType: normalizeWhitespace(employmentType),
    experienceRequired: normalizeWhitespace(experienceRequired),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills,
    postingDate: null,
    closingDate: null,
    jobDescription: normalizeWhitespace(jobDescription),
    remoteStatus: 'On-site',
    source: SOURCE,
    link: card.detailUrl,
    scrapedAt,
  }
}

export const createMotivityLabsScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Motivity Labs careers page no longer matches the trusted first-party surface')
    }

    const listingsHtml = await fetchText(JOB_OPENINGS_URL)
    if (!hasJobOpeningsSignal(listingsHtml)) {
      throw new Error('The verified Motivity Labs job openings page no longer matches the trusted first-party surface')
    }

    const jobs = []
    for (const card of extractJobCards(listingsHtml)) {
      const detailHtml = await fetchText(card.detailUrl)
      const job = extractJobDetail(detailHtml, card, { scrapedAt: now() })
      if (job) jobs.push(job)
    }

    if (jobs.length === 0) {
      throw new Error('Motivity Labs verified first-party detail pages no longer return normalized jobs')
    }

    return jobs
  },
})

export const run = async (options = {}) => createMotivityLabsScraper().run(options)

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
