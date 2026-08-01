import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { RESERVE_BANK_INFORMATION_TECHNOLOGY_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = RESERVE_BANK_INFORMATION_TECHNOLOGY_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const CAREERS_PORTAL_BASE_URL = PROVIDER_METADATA.careersPortalBaseUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value = '') => String(value)
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&ndash;|&#8211;/gi, '–')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const toAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) {
    return {
      location: null,
      city: null,
      state: null,
      country: null,
    }
  }

  if (/multiple locations/i.test(normalized)) {
    return {
      location: 'Multiple locations, India',
      city: null,
      state: null,
      country: 'India',
    }
  }

  const parts = normalized.split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const [city, state] = parts
    return {
      location: `${city}, ${state}, India`,
      city,
      state,
      country: 'India',
    }
  }

  return {
    location: `${normalized}, India`,
    city: normalized,
    state: null,
    country: 'India',
  }
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html)
  return /<title>\s*Join Us\s*\|\s*Reserve Bank Information Technology Private Limited \(ReBIT\)\s*<\/title>/i.test(page)
    && /career-bx/i.test(page)
    && /position-title/i.test(page)
    && /rebithr\.darwinbox\.in\/ms\/candidate\/careers/i.test(page)
}

export const extractVisibleJobCards = (html = '') => {
  const page = String(html)
  const cardPattern = /<div class="card-bx">\s*<p class="position-title">\s*([\s\S]*?)\s*<\/p>\s*<p class="dept-nm">\s*Dept:\s*([\s\S]*?)\s*Location:\s*([\s\S]*?)\s*<\/p>\s*<\/div>\s*<a href="(https:\/\/rebithr\.darwinbox\.in\/ms\/candidate\/careers\/[^"]+)"[^>]*class="apply-now"/gi
  const jobs = []

  for (const match of page.matchAll(cardPattern)) {
    const title = normalizeWhitespace(match[1])
    const department = normalizeWhitespace(match[2])
    const locationDetails = normalizeLocation(match[3])
    const applyUrl = toAbsoluteUrl(match[4])

    if (!title || !department || !locationDetails.location || !applyUrl) {
      continue
    }

    jobs.push({
      title,
      department,
      ...locationDetails,
      sourceUrl: applyUrl,
      applyUrl,
    })
  }

  return jobs
}

const buildJobDescription = (job) => {
  const lines = [
    `Official ReBIT Join Us opening for ${job.title}.`,
    `Department: ${job.department}.`,
    `Location: ${job.location}.`,
    'Applications route through the linked official ReBIT Darwinbox board.',
  ]

  return lines.join(' ')
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createReserveBankInformationTechnologyScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Reserve Bank Information Technology verified join-us page no longer matches the trusted first-party contract')
    }

    const jobs = extractVisibleJobCards(careersHtml)
      .map((job) => ({
        ...job,
        company: COMPANY,
        remoteStatus: null,
        jobDescription: buildJobDescription(job),
        source: SOURCE,
        link: job.applyUrl,
        scrapedAt: now(),
      }))
      .sort((left, right) => left.title.localeCompare(right.title))

    return jobs
  },
})

export const run = async (options = {}) => createReserveBankInformationTechnologyScraper().run(options)

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
