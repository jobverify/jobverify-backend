import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'
import { filterIndiaJobs } from '../../scraper-support/utils/indiaLocationFilter.js'
import { getValidIndiaCityForJob } from '../../src/utils/publicJobLocationScope.js'

import { VALTECH_INDIA_SYSTEMS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = VALTECH_INDIA_SYSTEMS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const JOBS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&amp;/gi, '&')
  .replace(/&nbsp;/gi, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim() || null

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '').replace(/<[^>]+>/g, ' '),
)

const extractFirst = (pattern, value) => pattern.exec(String(value ?? ''))?.[1] ?? null

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

const toAbsoluteUrl = (value, baseUrl = JOBS_URL) => {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const buildLocationData = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) {
    return {
      location: null,
      city: null,
      country: null,
      remoteStatus: null,
    }
  }

  if (/remote/i.test(normalized)) {
    return {
      location: normalized,
      city: null,
      country: null,
      remoteStatus: 'Remote',
    }
  }

  const normalizedCity = normalizeCity(normalized)
  const indiaCity = getValidIndiaCityForJob({
    city: normalizedCity,
    location: normalized,
    country: /india/i.test(normalized) ? 'India' : null,
  })

  if (indiaCity) {
    return {
      location: /india/i.test(normalized) ? normalized : `${normalized}, India`,
      city: indiaCity,
      country: 'India',
      remoteStatus: null,
    }
  }

  return {
    location: normalized,
    city: null,
    country: null,
    remoteStatus: null,
  }
}

export const hasOfficialJobsPageSignal = (html = '') => {
  const page = String(html ?? '')

  return /<title>\s*Career\s*\|\s*Valtech\s*<\/title>/i.test(page)
    && /Wanted:\s*Innovators,\s*Thinkers,\s*Doers/i.test(page)
    && /\/en-in\/career\/jobs\/4944510101\//i.test(page)
    && /\/en-in\/career\/jobs\/4945513101\//i.test(page)
}

export const extractJobListings = (html = '') => Array.from(
  String(html ?? '').matchAll(
    /<a[^>]+href=["']([^"']*\/en-in\/career\/jobs\/\d+\/?)["'][^>]*class=["'][^"']*\brow\b[^"']*slide-fade-in[^"']*["'][^>]*>[\s\S]*?<h4[^>]*class=["'][^"']*jobs__list__title[^"']*["'][^>]*>([\s\S]*?)<\/h4>[\s\S]*?<h5[^>]*class=["'][^"']*jobs__list__city[^"']*["'][^>]*>([\s\S]*?)<\/h5>[\s\S]*?<\/a>/gi,
  ),
)
  .map((match) => {
    const sourceUrl = toAbsoluteUrl(match[1])
    const title = stripTags(match[2])
    const locationData = buildLocationData(stripTags(match[3]))

    if (!sourceUrl || !title || !locationData.location) return null

    return {
      title,
      company: COMPANY,
      department: null,
      location: locationData.location,
      city: locationData.city,
      country: locationData.country,
      remoteStatus: locationData.remoteStatus,
      sourceUrl,
      applyUrl: sourceUrl,
      requiredSkills: [],
    }
  })
  .filter(Boolean)

const extractSectionParagraph = (html = '', heading) => {
  const pattern = new RegExp(
    `<h[23][^>]*>\\s*${heading}\\s*<\\/h[23]>\\s*<p[^>]*>([\\s\\S]*?)<\\/p>`,
    'i',
  )
  return stripTags(extractFirst(pattern, html))
}

export const extractJobDetail = (html = '', listing = {}) => {
  const title = stripTags(
    extractFirst(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html)
      || extractFirst(/<title>\s*([\s\S]*?)\s*\|\s*Valtech\s*<\/title>/i, html),
  ) || listing.title
  const detailLocation = stripTags(extractFirst(/<h2[^>]*>([\s\S]*?)<\/h2>/i, html))
  const locationData = buildLocationData(detailLocation || listing.location)
  const applyUrl = toAbsoluteUrl(
    extractFirst(/<a[^>]+href=["'](https:\/\/job-boards\.eu\.greenhouse\.io\/valtech\/jobs\/[^"']+)["'][^>]*>\s*Apply/i, html),
    listing.sourceUrl,
  ) || listing.sourceUrl
  const whyValtech = extractSectionParagraph(html, 'Why Valtech\\?')
  const opportunity = extractSectionParagraph(html, 'The opportunity')
  const jobDescription = [whyValtech, opportunity].filter(Boolean).join(' ')

  return {
    title,
    company: COMPANY,
    department: listing.department,
    location: locationData.location || listing.location,
    city: locationData.city || listing.city,
    country: locationData.country || listing.country,
    remoteStatus: locationData.remoteStatus || listing.remoteStatus,
    sourceUrl: listing.sourceUrl,
    applyUrl,
    requiredSkills: [],
    employmentType: null,
    postingDate: null,
    jobDescription: jobDescription || null,
  }
}

export const createValtechindiasystemsScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now: overrideNow = now,
  } = {}) {
    const listingHtml = await fetchText(JOBS_URL)
    if (!hasOfficialJobsPageSignal(listingHtml)) {
      throw new Error('Valtech verified Valtech careers page no longer matches the known public jobs surface')
    }

    const scrapedAt = overrideNow()
    const jobs = []

    for (const listing of extractJobListings(listingHtml)) {
      const detail = extractJobDetail(await fetchText(listing.sourceUrl), listing)
      jobs.push({
        ...detail,
        link: detail.applyUrl || detail.sourceUrl,
        source: SOURCE,
        scrapedAt,
      })
    }

    return filterIndiaJobs(jobs)
  },
})

export const run = async (options = {}) => createValtechindiasystemsScraper(options).run(options)

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
