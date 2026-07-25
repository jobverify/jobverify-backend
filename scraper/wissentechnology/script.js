import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { WISSEN_TECHNOLOGY_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = WISSEN_TECHNOLOGY_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const CONTACT_URL = PROVIDER_METADATA.contactPageUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value = '') => String(value)
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const parseLocation = (value = '') => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) {
    return {
      location: null,
      city: null,
      state: null,
      country: null,
    }
  }

  if (normalized.includes('/')) {
    return {
      location: normalized,
      city: null,
      state: null,
      country: 'India',
    }
  }

  return {
    location: normalized,
    city: normalized,
    state: null,
    country: 'India',
  }
}

const toSlug = (value = '') => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('Opportunities at Wissen Technology')
    && normalized.includes('Important Notice - Fraudulent Job Offers in the Name of Wissen Technology Pvt. Ltd.')
    && normalized.includes('All legitimate job openings are published only on our official website www.wissen.com in the career section.')
    && normalized.includes('Send resume now')
}

export const extractVisibleJobs = (html = '') => {
  const page = String(html)
  const jobs = []
  const cardPattern = /<section class="job-card">([\s\S]*?)<\/section>/gi

  for (const match of page.matchAll(cardPattern)) {
    const card = match[1]
    const title = normalizeWhitespace(card.match(/<h2>([\s\S]*?)<\/h2>/i)?.[1] || '')
    const summary = normalizeWhitespace(card.match(/<p>(Wissen Technology[\s\S]*?)<\/p>/i)?.[1] || '')
    const employmentType = normalizeWhitespace(card.match(/<p>(Full-time|Part-time|Contract)<\/p>/i)?.[1] || '')
    const location = normalizeWhitespace(card.match(/<p>Location<\/p>\s*<p>([\s\S]*?)<\/p>/i)?.[1] || '')
    const applyUrl = normalizeWhitespace(card.match(/<a href="(https:\/\/www\.wissen\.com\/contact\/writetous)">\s*Send resume now\s*<\/a>/i)?.[1] || '')

    if (!title || !summary || !employmentType || !location || !applyUrl) {
      continue
    }

    jobs.push({
      title,
      summary,
      employmentType,
      ...parseLocation(location),
      sourceUrl: CAREERS_URL,
      applyUrl,
      link: applyUrl,
      jobId: toSlug(`${title}-${location}`),
      requisitionId: toSlug(`${title}-${location}`),
    })
  }

  return jobs
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createWissenTechnologyScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Wissen Technology verified openings page no longer matches the trusted first-party contract')
    }

    const jobs = extractVisibleJobs(careersHtml)
      .map((job) => ({
        title: job.title,
        company: COMPANY,
        location: job.location,
        city: job.city,
        state: job.state,
        country: job.country,
        employmentType: job.employmentType,
        remoteStatus: null,
        jobDescription: job.summary,
        sourceUrl: job.sourceUrl,
        applyUrl: job.applyUrl,
        link: job.link,
        jobId: job.jobId,
        requisitionId: job.requisitionId,
        source: SOURCE,
        scrapedAt: now(),
      }))
      .sort((left, right) => left.title.localeCompare(right.title))

    if (jobs.length === 0) {
      throw new Error('Wissen Technology openings page no longer exposes trusted visible jobs')
    }

    return jobs
  },
})

export const run = async (options = {}) => createWissenTechnologyScraper().run(options)

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
