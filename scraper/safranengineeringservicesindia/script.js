import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'safranengineeringservicesindia'
export const COMPANY = 'Safran Engineering Services India'
export const PUBLIC_COMPANY_NAME = 'Safran Engineering Services'
export const VERIFIED_ON = '2026-08-14'
export const CAREERS_HOST = 'https://careers.safran-group.com'
export const SEARCH_KEYWORDS = 'Safran Engineering Services'
export const SEARCH_URL =
  `${CAREERS_HOST}/offre-de-emploi/liste-toutes-offres.aspx?Keywords=Safran%20Engineering%20Services&LCID=1033`

const INDIA = 'India'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'

const SAFRAN_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const stripTags = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, ' ')
  .replace(/<li\b[^>]*>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(stripTags(value))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeSearchText = (value) => normalizeWhitespace(value)
  ?.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  || ''

const normalizeSlashDate = (value) => {
  const normalized = normalizeWhitespace(value)
  const match = normalized?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null

  const [, month, day, year] = match
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

const toAbsoluteUrl = (value, baseUrl = SEARCH_URL) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, baseUrl).toString()
  } catch {
    return null
  }
}

const extractTitleText = (html) =>
  normalizeWhitespace(String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1])

const extractMetaDescription = (html) =>
  decodeHtmlEntities(
    String(html ?? '').match(/<meta[^>]+name="Description"[^>]+content="([^"]+)"/i)?.[1] ?? '',
  ).trim() || null

const extractFieldById = (html, fieldId) =>
  normalizeWhitespace(String(html ?? '').match(new RegExp(`<p id="${fieldId}">([\\s\\S]*?)<\\/p>`, 'i'))?.[1])

const extractFieldListById = (html, fieldId) => [...String(html ?? '').matchAll(
  new RegExp(`<p id="${fieldId}">([\\s\\S]*?)<\\/p>`, 'gi'),
)]
  .map((match) => normalizeWhitespace(match[1]))
  .filter(Boolean)

const extractOfferIdFromUrl = (value) =>
  normalizeWhitespace(String(value ?? '').match(/_(\d+)\.aspx(?:\?|$)/i)?.[1])

const extractCountry = (geographicalArea) => {
  const parts = normalizeWhitespace(geographicalArea)
    ?.split(',')
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)
    || []

  return parts.at(-1) || null
}

const buildLocation = (city, country) => {
  const normalizedCity = normalizeWhitespace(city)
  const normalizedCountry = normalizeWhitespace(country)

  if (normalizedCity && normalizedCountry) {
    return `${normalizedCity}, ${normalizedCountry}`
  }

  return normalizedCity || normalizedCountry || null
}

const normalizeEmploymentType = (value) => normalizeWhitespace(value) || null

export const buildSearchUrl = (page = 1) => {
  const normalizedPage = Math.max(1, Number(page) || 1)
  if (normalizedPage <= 1) {
    return SEARCH_URL
  }

  return `${SEARCH_URL}&page=${normalizedPage}`
}

export const createDefaultFetchText = ({
  fetchImpl = fetch,
} = {}) => async (url) => {
  const response = await fetchImpl(url, {
    headers: SAFRAN_HEADERS,
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const hasVerifiedSearchPageSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalizedTitle = normalizeSearchText(extractTitleText(rawHtml))

  return normalizedTitle.startsWith(normalizeSearchText('Safran - Search results'))
    && normalizedTitle.includes(normalizeSearchText(`Keywords : ${SEARCH_KEYWORDS}`))
    && /offerRss\.ashx\?lcid=1033&amp;Keywords=Safran%20Engineering%20Services/i.test(rawHtml)
    && /ts-offer-list-item offerlist-item/i.test(rawHtml)
}

export const extractTotalPages = (html = '') => {
  const pageNumbers = [...String(html ?? '').matchAll(/liste-toutes-offres\.aspx\?[^"]*page=(\d+)/gi)]
    .map((match) => Number.parseInt(match[1], 10))
    .filter(Number.isFinite)

  if (!pageNumbers.length) {
    return extractSearchResults(html).length ? 1 : 0
  }

  return Math.max(...pageNumbers)
}

export const extractSearchResults = (html = '') => [...String(html ?? '').matchAll(
  /<li class="ts-offer-list-item offerlist-item[\s\S]*?<ul class="ts-offer-list-item__description [\s\S]*?<\/ul>/gi,
)]
  .map((match) => {
    const block = match[0]
    const titleAnchor = block.match(
      /<a[^>]*class="[^"]*\bts-offer-list-item__title-link\b[^"]*"[^>]*>[\s\S]*?<\/a>/i,
    )?.[0] || ''
    const sourceUrl = toAbsoluteUrl(titleAnchor.match(/href="([^"]+)"/i)?.[1], SEARCH_URL)
    const title = normalizeWhitespace(titleAnchor.match(/>([\s\S]*?)<\/a>/i)?.[1])
    const detailsHtml = block.match(/<ul class="ts-offer-list-item__description [\s\S]*?<\/ul>/i)?.[0] || ''
    const details = [...detailsHtml.matchAll(/<li(?: [^>]*)?>([\s\S]*?)<\/li>/gi)]
      .map((item) => normalizeWhitespace(item[1]))
      .filter(Boolean)
    const city = normalizeWhitespace(details[3])
    const requisitionId = normalizeWhitespace(details[0]?.match(/Ref\.\s*:\s*([A-Z0-9-]+)/i)?.[1])
    const offerId = extractOfferIdFromUrl(sourceUrl)

    if (!sourceUrl || !title || !requisitionId || !offerId || !city) {
      return null
    }

    return {
      title,
      company: COMPANY,
      department: null,
      location: city,
      city,
      country: null,
      jobId: offerId,
      requisitionId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: normalizeEmploymentType(details[2]),
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: normalizeSlashDate(details[1]),
      closingDate: null,
      jobDescription: null,
    }
  })
  .filter(Boolean)

export const hasVerifiedDetailSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalizedTitle = normalizeSearchText(extractTitleText(rawHtml))
  const metaDescription = extractMetaDescription(rawHtml)

  return normalizedTitle.startsWith(normalizeSearchText('Safran - '))
    && metaDescription?.includes(`Offre d'emploi ${PUBLIC_COMPANY_NAME} -`)
    && Boolean(extractFieldById(rawHtml, 'fldjobdescription_jobtitle'))
    && Boolean(extractFieldById(rawHtml, 'fldlocation_location_geographicalareacollection'))
    && Boolean(extractFieldById(rawHtml, 'fldlocation_joblocation'))
}

export const extractJobDetail = (html, listing = {}) => {
  const rawHtml = String(html ?? '')
  const geographicalArea = extractFieldById(rawHtml, 'fldlocation_location_geographicalareacollection')
  const city = extractFieldById(rawHtml, 'fldlocation_joblocation') || listing.city || null
  const country = extractCountry(geographicalArea) || listing.country || null
  const descriptionBlocks = [
    ...extractFieldListById(rawHtml, 'fldjobdescription_description1'),
    ...extractFieldListById(rawHtml, 'fldjobdescription_longtext2'),
    ...extractFieldListById(rawHtml, 'fldjobdescription_description2'),
  ]

  return {
    ...listing,
    title: extractFieldById(rawHtml, 'fldjobdescription_jobtitle') || listing.title || null,
    company: COMPANY,
    department: extractFieldById(rawHtml, 'fldjobdescription_primaryprofile') || listing.department || null,
    location: buildLocation(city, country),
    city,
    country,
    jobId: listing.jobId || extractOfferIdFromUrl(listing.sourceUrl || rawHtml) || null,
    requisitionId: listing.requisitionId || null,
    sourceUrl: listing.sourceUrl || null,
    applyUrl: listing.applyUrl || listing.sourceUrl || null,
    employmentType: normalizeEmploymentType(
      extractFieldById(rawHtml, 'fldjobdescription_contract') || listing.employmentType,
    ),
    experienceRequired: extractFieldById(rawHtml, 'fldapplicantcriteria_experiencelevel'),
    minimumQualification: extractFieldById(rawHtml, 'fldapplicantcriteria_educationlevel'),
    preferredQualification: null,
    requiredSkills: [],
    postingDate: listing.postingDate || null,
    closingDate: null,
    jobDescription: normalizeWhitespace(descriptionBlocks.join('\n\n')) || extractMetaDescription(rawHtml),
  }
}

const defaultFetchText = createDefaultFetchText()

export const createSafranEngineeringServicesIndiaScraper = ({
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY,
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : Number.POSITIVE_INFINITY,
  now: defaultNow = () => new Date().toISOString(),
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const now = options.now || defaultNow

    const firstPageHtml = await fetchText(buildSearchUrl(1))
    if (!hasVerifiedSearchPageSignal(firstPageHtml)) {
      throw new Error('The verified accessible Safran Engineering Services search page no longer matches the trusted first-party careers surface')
    }

    const totalPages = Math.min(extractTotalPages(firstPageHtml) || 1, maxPages)
    const jobs = []
    const seenJobIds = new Set()

    for (let page = 1; page <= totalPages; page += 1) {
      const pageHtml = page === 1
        ? firstPageHtml
        : await fetchText(buildSearchUrl(page))

      if (!hasVerifiedSearchPageSignal(pageHtml)) {
        throw new Error(`The verified accessible Safran Engineering Services search page no longer matches the trusted first-party careers surface on page ${page}`)
      }

      const listings = extractSearchResults(pageHtml)
      if (listings.length === 0) {
        throw new Error('The verified accessible Safran Engineering Services search page no longer exposes company-specific job cards')
      }

      for (const listing of listings) {
        if (!listing.jobId || seenJobIds.has(listing.jobId)) continue
        seenJobIds.add(listing.jobId)

        const detailHtml = await fetchText(listing.sourceUrl)
        if (!hasVerifiedDetailSignal(detailHtml)) {
          throw new Error(`The verified Safran Engineering Services detail page no longer matches the accessible first-party careers surface for ${listing.sourceUrl}`)
        }

        const job = extractJobDetail(detailHtml, listing)
        if (job.country !== INDIA) continue

        jobs.push({
          ...job,
          source: SOURCE,
          link: job.applyUrl || job.sourceUrl,
          scrapedAt: now(),
        })

        if (jobs.length >= maxJobs) {
          return jobs
        }
      }
    }

    return jobs
  },
})

export const run = async (options = {}) => createSafranEngineeringServicesIndiaScraper().run(options)

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
