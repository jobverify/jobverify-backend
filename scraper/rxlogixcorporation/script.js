import path from 'node:path'
import { fileURLToPath } from 'node:url'

import RX_LOGIX_CORPORATION_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = RX_LOGIX_CORPORATION_CATALOG.source
export const COMPANY = RX_LOGIX_CORPORATION_CATALOG.companyName
export const CAREERS_URL = RX_LOGIX_CORPORATION_CATALOG.companyCareerPage

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&#x27;|&#8217;/gi, "'")
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const absoluteUrl = (value) => {
  try {
    return new URL(value, CAREERS_URL).toString()
  } catch {
    return null
  }
}

const inferCity = (location) => normalizeWhitespace(String(location ?? '').split(',')[0]) || null

export const hasOfficialRxLogixCareersSignal = (html) => {
  const page = String(html ?? '')
  return /<title>\s*Careers at RxLogix\s*\|\s*Join Our Team\s*<\/title>/i.test(page)
    && /Interested to join our growing team\?\s*Browse our current openings:/i.test(page)
    && /Technical Architect\s+Noida,\s*India/i.test(page)
}

export const extractCareerListings = (html) => {
  if (!hasOfficialRxLogixCareersSignal(html)) {
    throw new Error('RxLogix verified first-party careers page no longer matches the trusted openings surface')
  }

  const listings = []

  for (const sectionMatch of String(html ?? '').matchAll(/<h2>\s*([\s\S]*?)\s*<\/h2>([\s\S]*?)(?=<h2>|<\/body>|$)/gi)) {
    const department = normalizeWhitespace(sectionMatch[1]) || null
    const sectionHtml = sectionMatch[2]

    for (const anchorMatch of String(sectionHtml ?? '').matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>\s*([\s\S]*?)\s*<\/a>/gi)) {
      const sourceUrl = absoluteUrl(anchorMatch[1])
      const text = normalizeWhitespace(anchorMatch[2])
      if (!sourceUrl || !text || !/india/i.test(text)) continue

      const titleAndLocationMatch = text.match(/^(.*)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*,\s*India)\s*$/)
      const title = titleAndLocationMatch ? normalizeWhitespace(titleAndLocationMatch[1]) : null
      const location = titleAndLocationMatch ? normalizeWhitespace(titleAndLocationMatch[2]) : null
      const jobIdMatch = sourceUrl.match(/\/careers\/([^/]+)\/?$/i)
      const jobId = jobIdMatch ? jobIdMatch[1] : null

      if (!title || !location || !jobId) continue

      listings.push({
        jobId,
        requisitionId: jobId,
        title,
        department,
        location,
        city: inferCity(location),
        country: 'India',
        sourceUrl,
      })
    }
  }

  return listings
}

const extractField = (html, label) => {
  const pattern = new RegExp(`<p>\\s*${label}:\\s*([^<]+)<\\/p>`, 'i')
  const match = pattern.exec(String(html ?? ''))
  return match ? normalizeWhitespace(match[1]) : null
}

const extractTitle = (html) => {
  const match = /<h1>\s*([\s\S]*?)\s*<\/h1>/i.exec(String(html ?? ''))
  return match ? normalizeWhitespace(match[1]) : null
}

const extractDescription = (html) => {
  const match = /<p>\s*(?:General Purpose|Role Overview|Job Summary):\s*([\s\S]*?)<\/p>/i.exec(String(html ?? ''))
  return match ? normalizeWhitespace(match[1]) : null
}

export const extractCareerDetail = (html, listing = {}) => ({
  jobId: listing.jobId,
  requisitionId: listing.requisitionId,
  title: extractTitle(html) || listing.title,
  company: COMPANY,
  department: extractField(html, 'Department') || listing.department || null,
  location: extractField(html, 'Location') || listing.location,
  city: inferCity(extractField(html, 'Location') || listing.location),
  country: 'India',
  sourceUrl: listing.sourceUrl,
  applyUrl: listing.sourceUrl,
  employmentType: null,
  experienceRequired: extractField(html, 'Experience'),
  minimumQualification: null,
  preferredQualification: null,
  requiredSkills: [],
  postingDate: null,
  closingDate: null,
  jobDescription: extractDescription(html) || `Official RxLogix careers detail for ${listing.title}.`,
})

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const createRxLogixCorporationScraper = () => ({
  async run({ fetchPage = defaultFetchPage, now = () => new Date().toISOString() } = {}) {
    const page = await fetchPage(CAREERS_URL)
    const listings = extractCareerListings(page.html)
    const jobs = []

    for (const listing of listings) {
      const detailPage = await fetchPage(listing.sourceUrl)
      const job = extractCareerDetail(detailPage.html, listing)
      jobs.push({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: now(),
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createRxLogixCorporationScraper().run(options)

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
