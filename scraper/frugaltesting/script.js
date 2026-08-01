import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import FRUGAL_TESTING_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = FRUGAL_TESTING_CATALOG
export const SOURCE = FRUGAL_TESTING_CATALOG.source
export const COMPANY = FRUGAL_TESTING_CATALOG.companyName
export const CAREERS_URL = FRUGAL_TESTING_CATALOG.companyCareerPage
export const APPLICATION_FORM_URL = FRUGAL_TESTING_CATALOG.applicationFormUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|a)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/[’]/g, "'")
    .replace(/&#39;|&apos;|&#x27;|&#8217;|&rsquo;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return normalized.replace(/([a-z])([A-Z])/g, '$1 $2')
}

const toAbsoluteUrl = (value) => {
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

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)

  return (
    normalized.includes('Careers at Frugal')
    || normalized.includes('Accelerate Your Career with Frugal Testing')
    || normalized === 'Careers'
  )
    && /We.?re looking for talented people to join us/i.test(normalized || '')
    && /\/job-openings\//i.test(String(html ?? ''))
}

export const extractJobDetailUrls = (html = '') => [...new Set(
  [...String(html ?? '').matchAll(/href=["']([^"']*\/job-openings\/[a-z0-9-]+)["']/gi)]
    .map((match) => toAbsoluteUrl(match[1]))
    .filter(Boolean),
)]

export const parseJobDetailPage = (detailUrl, html = '') => {
  const title = normalizeWhitespace(String(html ?? '').match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1])
  const applyUrl = toAbsoluteUrl(
    String(html ?? '').match(/href=["']([^"']*apply-to-frugal-testing[^"']*)["']/i)?.[1],
  )
  const liveDepartment = normalizeWhitespace(
    String(html ?? '').match(/<div[^>]*class=["'][^"']*text-block-92[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1],
  )
  const liveDescription = normalizeWhitespace(
    String(html ?? '').match(/<div[^>]*class=["'][^"']*uui-text-size-large-10[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1],
  )
  const liveDetailValues = [...String(html ?? '').matchAll(
    /<div[^>]*class=["'][^"']*uui-career05_detail-wrapper[^"']*["'][^>]*>[\s\S]*?<div[^>]*class=["'][^"']*(?:text-block-90|text-block-91|text-block-91-copy)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
  )]
    .map((match) => normalizeWhitespace(match[1]))
    .filter(Boolean)

  if (title && liveDepartment && liveDescription && applyUrl && liveDetailValues.length >= 3) {
    return {
      title,
      company: COMPANY,
      department: liveDepartment,
      location: liveDetailValues[0],
      city: normalizeWhitespace(liveDetailValues[0]?.split(',')[0]) || liveDetailValues[0],
      country: 'India',
      jobId: detailUrl.split('/').pop(),
      requisitionId: detailUrl.split('/').pop(),
      sourceUrl: detailUrl,
      applyUrl,
      employmentType: normalizeEmploymentType(liveDetailValues[1]),
      experienceRequired: liveDetailValues[2],
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: liveDescription,
    }
  }

  const paragraphs = [...String(html ?? '').matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => normalizeWhitespace(match[1]))
    .filter(Boolean)

  if (!title || paragraphs.length < 5 || !applyUrl) {
    throw new Error('The verified Frugal Testing detail page no longer matches the trusted first-party job-opening surface')
  }

  return {
    title,
    company: COMPANY,
    department: paragraphs[0],
    location: paragraphs[2],
    city: normalizeWhitespace(paragraphs[2]?.split(',')[0]) || paragraphs[2],
    country: 'India',
    jobId: detailUrl.split('/').pop(),
    requisitionId: detailUrl.split('/').pop(),
    sourceUrl: detailUrl,
    applyUrl,
    employmentType: normalizeEmploymentType(paragraphs[3]),
    experienceRequired: paragraphs[4],
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: paragraphs[1],
  }
}

export const createFrugalTestingScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Frugal Testing careers page no longer matches the trusted first-party listing surface')
    }

    const detailUrls = extractJobDetailUrls(careersHtml)
    if (detailUrls.length === 0) {
      throw new Error('The verified Frugal Testing careers page no longer exposes the trusted first-party job-opening links')
    }

    const jobs = await Promise.all(
      detailUrls.map(async (detailUrl) => parseJobDetailPage(detailUrl, await fetchText(detailUrl))),
    )

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createFrugalTestingScraper(options).run(options)

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
