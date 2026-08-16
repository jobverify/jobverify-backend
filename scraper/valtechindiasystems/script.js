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
export const CAREER_LANDING_URL = PROVIDER_METADATA.homepageUrl
export const JOBS_URL = PROVIDER_METADATA.jobListingsUrl || PROVIDER_METADATA.companyCareerPage
export const JOBS_API_URL = PROVIDER_METADATA.jobsApiUrl
export const INDIA_COUNTRY_TAG = PROVIDER_METADATA.indiaCountryTag

const DEFAULT_API_LIMIT = 100
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

const defaultFetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
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

const buildOfficesLabel = (offices = []) => (
  Array.isArray(offices)
    ? offices.map((value) => stripTags(value)).filter(Boolean).join(' | ')
    : stripTags(offices)
) || null

const extractRequisitionIdFromUrl = (url) => extractFirst(/\/(\d+)\/?$/i, url)

export const hasOfficialCareerLandingSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = stripTags(page) || ''
  const jobDetailMatches = [...page.matchAll(/\/en-in\/career\/jobs\/\d+\/?/gi)]

  return /<title>\s*Career\s*\|\s*Valtech\s*<\/title>/i.test(page)
    && normalized.includes('Wanted: Innovators, Thinkers, Doers')
    && normalized.includes('Joblist')
    && normalized.includes('View All')
    && jobDetailMatches.length >= 3
    && /href=["']\/en-in\/career\/jobs\/["']/i.test(page)
}

export const extractJobsApiUrl = (html = '') => {
  const relativeUrl = normalizeWhitespace(extractFirst(
    /<react[^>]+data-react-component-name=["']JobsPage["'][^>]+data-url=["']([^"']+)["']/i,
    html,
  ))?.replace(/&amp;/gi, '&')

  return relativeUrl ? toAbsoluteUrl(relativeUrl, JOBS_URL) : null
}

export const hasOfficialJobsPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = stripTags(page) || ''
  const jobsApiUrl = extractJobsApiUrl(page)

  return /<title>\s*Jobs\s*\|\s*Valtech\s*<\/title>/i.test(page)
    && normalized.includes('Joblist')
    && jobsApiUrl === JOBS_API_URL
    && /data-react-component-name=["']JobsPage["']/i.test(page)
}

export const buildIndiaJobsApiUrl = ({
  jobsApiUrl = JOBS_API_URL,
  countryTag = INDIA_COUNTRY_TAG,
  offset = 0,
  limit = DEFAULT_API_LIMIT,
} = {}) => {
  const url = new URL(jobsApiUrl)
  url.searchParams.set('offset', String(offset))
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('country', countryTag)
  return url.toString()
}

export const extractJobListingsFromApi = (payload = {}) => (
  Array.isArray(payload?.list)
    ? payload.list
      .map((item) => {
        const sourceUrl = toAbsoluteUrl(item?.url, CAREER_LANDING_URL)
        const title = normalizeWhitespace(item?.title)
        const officesLabel = buildOfficesLabel(item?.offices)
        const primaryOffice = Array.isArray(item?.offices) ? item.offices[0] : item?.offices
        const locationData = buildLocationData(primaryOffice || officesLabel)
        const requisitionId = extractRequisitionIdFromUrl(sourceUrl)

        if (!sourceUrl || !title || !officesLabel || !locationData.location) return null

        return {
          title,
          company: COMPANY,
          department: null,
          location: officesLabel.includes('|') ? officesLabel : locationData.location,
          city: locationData.city,
          country: locationData.country,
          remoteStatus: locationData.remoteStatus,
          sourceUrl,
          applyUrl: sourceUrl,
          requisitionId,
          requiredSkills: [],
        }
      })
      .filter(Boolean)
    : []
)

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
    requisitionId: listing.requisitionId || extractRequisitionIdFromUrl(listing.sourceUrl),
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
    fetchJson = defaultFetchJson,
    now: overrideNow = now,
  } = {}) {
    const landingHtml = await fetchText(CAREER_LANDING_URL)
    if (!hasOfficialCareerLandingSignal(landingHtml)) {
      throw new Error('Valtech verified Valtech careers landing page no longer matches the known public jobs surface')
    }

    const jobsPageHtml = await fetchText(JOBS_URL)
    if (!hasOfficialJobsPageSignal(jobsPageHtml)) {
      throw new Error('Valtech verified Valtech jobs page no longer matches the known public jobs surface')
    }

    const discoveredJobsApiUrl = extractJobsApiUrl(jobsPageHtml)
    if (discoveredJobsApiUrl !== JOBS_API_URL) {
      throw new Error('Valtech verified first-party jobs API handoff no longer matches the known public surface')
    }

    const scrapedAt = overrideNow()
    const jobs = []
    let offset = 0

    while (true) {
      const payload = await fetchJson(buildIndiaJobsApiUrl({ offset }))
      const listings = extractJobListingsFromApi(payload)

      if (offset === 0 && listings.length === 0) {
        return []
      }

      for (const listing of listings) {
        const detail = extractJobDetail(await fetchText(listing.sourceUrl), listing)
        jobs.push({
          ...detail,
          link: detail.applyUrl || detail.sourceUrl,
          source: SOURCE,
          scrapedAt,
        })
      }

      const itemTotal = Number(payload?.page?.itemTotal)
      const pageLimit = Number(payload?.page?.pageLimit || DEFAULT_API_LIMIT)
      offset += listings.length

      const hasMore = Number.isFinite(itemTotal)
        ? offset < itemTotal && listings.length === pageLimit
        : false

      if (!hasMore) break
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
