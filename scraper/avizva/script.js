import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { AVIZVA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = AVIZVA_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const stripHtmlComments = (value = '') => String(value).replace(/<!--[\s\S]*?-->/g, ' ')

const normalizeWhitespace = (value = '') => String(value)
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const toSlug = (value = '') => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const toAbsoluteUrl = (value = '') => {
  try {
    return new URL(value, CAREERS_URL).toString()
  } catch {
    return null
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const KEKA_JOBDETAIL_PATTERN = /https:\/\/avizva\.keka\.com\/careers\/jobdetails\/\d+/gi

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  const kekaJobLinks = [...String(html).matchAll(KEKA_JOBDETAIL_PATTERN)]

  return /Avizva Careers\s*\|/i.test(normalized)
    && normalized.includes('We Aim, Learn, and Grow Each Day with Passion and Purpose')
    && normalized.includes('Select Role')
    && normalized.includes('Select Location')
    && normalized.includes('Locations')
    && normalized.includes('Apply Now')
    && kekaJobLinks.length >= 2
    && /avizva\.keka\.com/i.test(String(html))
}

const extractLegacyRoleSections = (html = '') => {
  const page = stripHtmlComments(html)

  return [...page.matchAll(/<section[^>]*class=["'][^"']*job-card[^"']*["'][^>]*>([\s\S]*?)<\/section>/gi)]
    .map((match) => match[1])
}

const extractCurrentJobBoxes = (html = '') => {
  const page = stripHtmlComments(html)

  return [...page.matchAll(
    /<div[^>]*class=["'][^"']*\bjob-box\b[^"']*["'][^>]*>[\s\S]*?<a[^>]+href=["'][^"']*avizva\.keka\.com[^"']+["'][^>]*>\s*Apply Now\s*<\/a>\s*<\/div>/gi,
  )]
    .map((match) => match[0])
}

const extractRoleBlocks = (html = '') => [
  ...extractLegacyRoleSections(html),
  ...extractCurrentJobBoxes(html),
]

const normalizeLocationLabel = (value = '') => normalizeWhitespace(value)
  .replace(/\s*-\s*India$/i, ', India')

const extractLocations = (block = '') =>
  [...block.matchAll(/<li[^>]*>\s*([^<]+?)\s*<\/li>/gi)]
    .map((match) => normalizeLocationLabel(match[1]))
    .filter((location) => /,\s*India$/i.test(location))

const extractParagraphValues = (block = '') =>
  [...block.matchAll(/<p[^>]*>\s*([^<]+?)\s*<\/p>/gi)]
    .map((match) => normalizeWhitespace(match[1]))
    .filter(Boolean)

const extractListValues = (block = '') =>
  [...block.matchAll(/<li[^>]*>\s*([^<]+?)\s*<\/li>/gi)]
    .map((match) => normalizeWhitespace(match[1]))
    .filter(Boolean)

export const extractJobs = (html = '') =>
  extractRoleBlocks(html)
    .map((block) => {
      const paragraphValues = extractParagraphValues(block)
      const listValues = extractListValues(block)
      const title = normalizeWhitespace(block.match(/<h3[^>]*>\s*([\s\S]*?)\s*<\/h3>/i)?.[1] || '')
      const department = paragraphValues[0] || listValues[0] || ''
      const years = paragraphValues[1] || listValues[1] || ''
      const locations = extractLocations(block)
      const applyUrl = toAbsoluteUrl(
        block.match(/<a[^>]+href=["']([^"']*avizva\.keka\.com[^"']+)["'][^>]*>\s*Apply Now\s*<\/a>/i)?.[1]
          || '',
      )

      return {
        title,
        department,
        experienceRequired: years,
        locations,
        applyUrl,
      }
    })
    .filter((job) => job.title && job.applyUrl && job.locations.length > 0)

export const createAvizvaScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('AVIZVA careers page no longer matches the verified first-party surface')
    }

    const jobs = extractJobs(careersHtml)
      .map((job) => ({
        title: job.title,
        company: COMPANY,
        location: job.locations.join('; '),
        city: job.locations[0].replace(/,\s*India$/i, '').trim(),
        country: 'India',
        department: job.department || null,
        employmentType: null,
        experienceRequired: job.experienceRequired || null,
        jobId: toSlug(job.title),
        requisitionId: toSlug(job.title),
        sourceUrl: CAREERS_URL,
        applyUrl: job.applyUrl,
        link: job.applyUrl,
        jobDescription: `${job.department}. Experience: ${job.experienceRequired}. Locations: ${job.locations.join(', ')}.`,
        source: SOURCE,
        scrapedAt: now(),
      }))
      .sort((left, right) => left.title.localeCompare(right.title))

    if (jobs.length === 0) {
      throw new Error('AVIZVA careers page no longer exposes trusted inline openings')
    }

    return jobs
  },
})

export const run = async (options = {}) => createAvizvaScraper(options).run(options)

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
