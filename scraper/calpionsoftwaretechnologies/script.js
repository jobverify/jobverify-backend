import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { CALPION_SOFTWARE_TECHNOLOGIES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = CALPION_SOFTWARE_TECHNOLOGIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const toAbsoluteUrl = (value) => {
  try {
    const url = new URL(value, CAREERS_URL)
    if (url.hostname !== 'www.calpion.com') return null
    return url.toString()
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

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title[^>]*>\s*Careers\s*&\s*Job Opportunities\s*\|\s*Work Culture and Values\s*\|\s*Calpion\s*<\/title>/i.test(page)
    && normalized.includes('Careers')
    && normalized.includes('Apply Now')
    && /\bcareer-card\b/i.test(page)
  }

export const extractCareerCards = (html = '') => {
  const jobs = []

  for (const match of String(html ?? '').matchAll(/<div[^>]*class=["'][^"']*career-card[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)) {
    const cardHtml = match[1]
    const title = normalizeWhitespace(
      cardHtml.match(/<h3[^>]*class=["'][^"']*career-blog-title[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i)?.[1]
      || cardHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1],
    )
    const summary = normalizeWhitespace(
      cardHtml.match(/<p[^>]*class=["'][^"']*career-card-des[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1]
      || cardHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1],
    )
    const applyUrl = toAbsoluteUrl(cardHtml.match(/<a[^>]*href=["']([^"']+)["']/i)?.[1])

    if (!title || !applyUrl) continue

    jobs.push({
      title,
      summary: summary || `Apply via the first-party Calpion careers page for ${title}.`,
      sourceUrl: applyUrl,
      applyUrl,
    })
  }

  return jobs.filter((job, index, items) =>
    items.findIndex((candidate) => candidate.applyUrl === job.applyUrl) === index,
  )
}

export const createCalpionSoftwareTechnologiesScraper = ({
  now: defaultNow = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, now = defaultNow } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Calpion careers surface no longer matches the trusted first-party page')
    }

    return extractCareerCards(careersHtml).map((job) => ({
      title: job.title,
      company: COMPANY,
      department: null,
      location: 'India',
      city: null,
      country: 'India',
      jobId: slugify(job.title),
      requisitionId: slugify(job.title),
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: job.summary,
      remoteStatus: null,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createCalpionSoftwareTechnologiesScraper().run(options)

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
