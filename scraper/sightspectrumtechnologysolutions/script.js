import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import SIGHTSPECTRUM_TECHNOLOGY_SOLUTIONS_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = SIGHTSPECTRUM_TECHNOLOGY_SOLUTIONS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const extractListItems = (html = '') => [...String(html ?? '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => normalizeWhitespace(match[1]))
  .filter(Boolean)

const inferRemoteStatus = (location) => {
  if (/\bremote\b/i.test(location)) return 'Remote'
  return 'On-site'
}

const inferCountry = (location) => {
  if (/\bdallas|usa|united states\b/i.test(location)) return null
  return 'India'
}

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('Join Our Team')
    && normalized.includes('positions currently open at SightSpectrum')
  }

export const extractJobs = (html = '') => [...String(html ?? '').matchAll(
  /<section[^>]*class=["'][^"']*job-opening[^"']*["'][^>]*>([\s\S]*?)<\/section>/gi,
)]
  .map((match) => {
    const block = match[1]
    const title = normalizeWhitespace(block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1])
    const paragraphs = [...block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((paragraph) => normalizeWhitespace(paragraph[1]))
      .filter(Boolean)
    const location = paragraphs[0] || null
    const rawDescription = paragraphs[1] || null
    const jobDescription = rawDescription?.replace(/^Role Summary:\s*/i, '') || rawDescription
    const requiredSkills = extractListItems(block.match(/<h3[^>]*>\s*Requirements\s*<\/h3>([\s\S]*?)<\/ul>/i)?.[1])
    const country = inferCountry(location || '')

    if (!title || !location || country !== 'India') return null

    return {
      title,
      company: COMPANY,
      department: null,
      location,
      city: normalizeWhitespace(location.split(',')[0] || location),
      country,
      jobId: slugify(title),
      requisitionId: slugify(title),
      sourceUrl: `${CAREERS_URL}#${slugify(title)}`,
      applyUrl: `${CAREERS_URL}#${slugify(title)}`,
      employmentType: null,
      experienceRequired: /\bdata engineer\b/i.test(title) ? '2+ years' : null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills,
      postingDate: null,
      closingDate: null,
      jobDescription,
      remoteStatus: inferRemoteStatus(location),
    }
  })
  .filter(Boolean)

export const createSightSpectrumTechnologySolutionsScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified SightSpectrum Technology Solutions careers surface changed materially')
    }

    return extractJobs(careersHtml).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createSightSpectrumTechnologySolutionsScraper().run(options)

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
