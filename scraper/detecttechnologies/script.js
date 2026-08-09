import path from 'path'
import { fileURLToPath } from 'url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://detecttechnologies.com/current-openings/'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;/gi, "'")
    .replace(/&ndash;|&mdash;/gi, '-')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const extractField = (html, label) => normalizeWhitespace(
  String(html ?? '').match(new RegExp(`<p\\b[^>]*>\\s*${label}\\s*:\\s*([\\s\\S]*?)<\\/p>`, 'i'))?.[1],
)

const extractJobCards = (html) => [...String(html ?? '').matchAll(
  /<div\b[^>]*class=["'][^"']*\bcurrent-job-list\b[^"']*["'][^>]*>([\s\S]*?<a\b[^>]*href=["']([^"']*\/career\/[^"']+)["'][^>]*>\s*Apply Now[\s\S]*?<\/a>)[\s\S]*?<\/div>/gi,
)]

const getRequisitionId = (applyUrl, title) => {
  try {
    const pathParts = new URL(applyUrl).pathname.split('/').filter(Boolean)
    return pathParts.at(-1) || slugify(title)
  } catch {
    return slugify(title)
  }
}

const formatLocation = (value) => {
  const city = normalizeWhitespace(value)?.replace(/\s*\([^)]*\)\s*$/u, '') || null

  return {
    city,
    location: city ? `${city}, India` : 'India',
  }
}

export const buildSearchUrl = () => CAREER_PAGE_URL

export const pageIndicatesJobCards = (html) => (
  /class=["'][^"']*\bcurrent-job-list\b/i.test(String(html ?? ''))
  && /href=["'][^"']*\/career\/[^"']+["'][^>]*>\s*Apply Now/i.test(String(html ?? ''))
)

export const extractSearchResults = (html) => extractJobCards(html)
  .map((match) => {
    const card = match[1]
    const applyUrl = normalizeWhitespace(match[2])
    const title = normalizeWhitespace(card.match(/<h5\b[^>]*>([\s\S]*?)<\/h5>/i)?.[1])
    const requisitionId = getRequisitionId(applyUrl, title)
    const { city, location } = formatLocation(extractField(card, 'Location'))

    if (!title || !applyUrl || !requisitionId) return null

    return {
      title,
      company: 'Detect Technologies',
      department: null,
      location,
      city,
      country: 'India',
      jobId: `detecttechnologies-${requisitionId}`,
      requisitionId,
      sourceUrl: CAREER_PAGE_URL,
      applyUrl,
      employmentType: extractField(card, 'Job Type'),
      experienceRequired: extractField(card, 'Exp'),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Apply via the official Detect Technologies job page.',
    }
  })
  .filter(Boolean)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'detecttechnologies',
  timeoutMs: 15000,
})

export const createDetectTechnologiesScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(buildSearchUrl())

    if (!pageIndicatesJobCards(html)) {
      throw new Error('Detect Technologies careers page no longer exposes the expected job cards')
    }

    const jobs = extractSearchResults(html)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: 'detecttechnologies',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createDetectTechnologiesScraper().run()
