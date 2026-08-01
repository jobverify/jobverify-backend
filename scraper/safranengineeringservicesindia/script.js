import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createOptimizedPage, launchBrowser } from '../../scraper-support/utils/browser.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'safranengineeringservicesindia'
export const COMPANY = 'Safran Engineering Services India'
export const PUBLIC_COMPANY_NAME = 'Safran Engineering Services'
export const COMPANY_PAGE_URL = 'https://www.safran-group.com/companies/safran-engineering-services'
export const LISTING_URL = 'https://www.safran-group.com/jobs?companies%5B%5D=636-safran-engineering-services&countries%5B%5D=1083-india'

const LISTING_QUERY_COMPANY = '636-safran-engineering-services'
const LISTING_QUERY_COUNTRY = '1083-india'
const SAFRAN_HOSTNAME = 'www.safran-group.com'
const INDIA = 'India'
const NAVIGATION_TIMEOUT_MS = Math.max(config.jobListingTimeoutMs || 0, 120000)

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

const toAbsoluteUrl = (value, baseUrl = LISTING_URL) => {
  if (!value) return null

  try {
    return new URL(decodeHtmlEntities(value), baseUrl).toString()
  } catch {
    return null
  }
}

const getSplitIndexes = (html) => [...String(html ?? '').matchAll(/<div class="c-offer-item js-block-link">/gi)]
  .map((match) => match.index)

const splitOfferCards = (html) => {
  const pageHtml = String(html ?? '')
  const indexes = getSplitIndexes(pageHtml)

  return indexes.map((start, index) => {
    const end = indexes[index + 1] ?? pageHtml.length
    return pageHtml.slice(start, end)
  })
}

const extractInfoItems = (cardHtml) => {
  const infoHtml = String(cardHtml ?? '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<span class="c-offer-item__infos__item__icon[^"]*"[^>]*><\/span>/gi, '')

  return [...infoHtml.matchAll(/<span class="c-offer-item__infos__item">([\s\S]*?)<\/span>/gi)]
    .map((match) => normalizeWhitespace(match[1]))
    .filter(Boolean)
}

const getLastPathId = (value) => {
  try {
    const pathname = new URL(value).pathname.replace(/\/+$/, '')
    return pathname.match(/-(\d+)$/)?.[1] || null
  } catch {
    return null
  }
}

const buildLocation = (city, country = INDIA) => {
  const normalizedCity = normalizeWhitespace(city)
  const normalizedCountry = normalizeWhitespace(country)

  if (normalizedCity && normalizedCountry) {
    return `${normalizedCity}, ${normalizedCountry}`
  }

  return normalizedCity || normalizedCountry || null
}

const extractCity = (location) => normalizeWhitespace(String(location ?? '').split(',')[0])

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (/permanent/i.test(normalized)) return 'Permanent'
  if (/fixed term/i.test(normalized)) return 'Fixed Term contract'
  if (/intern/i.test(normalized)) return 'Internship'
  if (/contract/i.test(normalized)) return 'Contract'
  if (/full[\s-]?time/i.test(normalized)) return 'Full-time'
  return normalized
}

const flattenJsonLdNodes = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value.flatMap((item) => flattenJsonLdNodes(item))
  if (Array.isArray(value['@graph'])) return flattenJsonLdNodes(value['@graph'])
  return [value]
}

const extractJsonLdNodes = (html) => {
  const nodes = []

  for (const match of String(html ?? '').matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const raw = decodeHtmlEntities(match[1]).trim()
    if (!raw) continue

    try {
      nodes.push(...flattenJsonLdNodes(JSON.parse(raw)))
    } catch {
      continue
    }
  }

  return nodes
}

const findJobPostingNode = (html) => extractJsonLdNodes(html)
  .find((node) => {
    const type = node?.['@type']
    if (Array.isArray(type)) return type.includes('JobPosting')
    return type === 'JobPosting'
  }) || null

const isSafranGroupUrl = (value) => {
  try {
    return new URL(value).hostname === SAFRAN_HOSTNAME
  } catch {
    return false
  }
}

const buildDetailApplyUrl = (html, sourceUrl) => {
  const applyCandidates = [
    /<a[^>]+id="simple-apply"[^>]+href="([^"]+)"/i,
    /<a[^>]+id="one-click-apply"[^>]+href="([^"]+)"/i,
  ]

  for (const pattern of applyCandidates) {
    const relativeUrl = pattern.exec(String(html ?? ''))?.[1]
    const absoluteUrl = toAbsoluteUrl(relativeUrl, sourceUrl)
    if (absoluteUrl && isSafranGroupUrl(absoluteUrl)) {
      return absoluteUrl
    }
  }

  return null
}

const extractDetailLocation = (jobPosting = {}, listing = {}) => {
  const address = jobPosting.jobLocation?.address || {}
  const city = normalizeWhitespace(address.addressLocality) || listing.city || null
  const country = normalizeWhitespace(address.addressCountry) || listing.country || INDIA

  return {
    city,
    country,
    location: buildLocation(city, country) || listing.location || INDIA,
  }
}

const extractDescription = (jobPosting = {}, html = '', listing = {}) =>
  normalizeWhitespace(jobPosting.description)
  || normalizeWhitespace(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i.exec(html)?.[1])
  || listing.jobDescription
  || null

export const buildListingUrl = (pageNumber = 1) => {
  const normalizedPageNumber = Math.max(1, Number(pageNumber) || 1)
  const url = new URL(LISTING_URL)

  if (normalizedPageNumber > 1) {
    url.searchParams.set('page', String(normalizedPageNumber - 1))
  } else {
    url.searchParams.delete('page')
  }

  return url.toString()
}

export const hasVerifiedCompanyPageSignal = (html) => {
  const rawHtml = String(html ?? '')

  return /<title>\s*Safran Engineering Services\b[\s\S]*\|\s*Safran\s*<\/title>/i.test(rawHtml)
    && /"name"\s*:\s*"Safran Engineering Services"/i.test(rawHtml)
    && /<a href="\/countries\/india">India<\/a>/i.test(rawHtml)
    && /Join Safran Engineering Services and take a look at our/i.test(rawHtml)
    && /href="\/jobs\?companies%5B%5D=636-safran-engineering-services"/i.test(rawHtml)
}

export const hasVerifiedListingPageSignal = (html) => {
  const rawHtml = String(html ?? '')

  return /<body[^>]+class="[^"]*\blist_job_offers\b/i.test(rawHtml)
    && /<title>\s*Job openings\s*\|\s*Safran\s*<\/title>/i.test(rawHtml)
    && /c-structured-news-list__results--nb/i.test(rawHtml)
    && new RegExp(PUBLIC_COMPANY_NAME, 'i').test(rawHtml)
    && /https:\/\/www\.safran-group\.com\/jobs\/india\//i.test(rawHtml)
    && new RegExp(LISTING_QUERY_COMPANY, 'i').test(rawHtml)
    && new RegExp(LISTING_QUERY_COUNTRY, 'i').test(rawHtml)
}

const hasVerifiedDetailSignal = (html) => {
  const rawHtml = String(html ?? '')
  const jobPosting = findJobPostingNode(rawHtml)
  const country = normalizeWhitespace(jobPosting?.jobLocation?.address?.addressCountry)
  const detailApplyUrl = buildDetailApplyUrl(rawHtml, LISTING_URL)

  return /<body[^>]+class="[^"]*\bjob_offer\b/i.test(rawHtml)
    && /Safran Engineering Services/i.test(rawHtml)
    && jobPosting != null
    && country === INDIA
    && Boolean(detailApplyUrl)
  }

export const extractTotalPages = (html) => {
  const pageNumbers = [...String(html ?? '').matchAll(/(?:aria-label="Page\s*\d+"[^>]*>|class="pagination__page"[^>]*>)(?:<span[^>]*>[^<]*<\/span>)?(\d+)/gi)]
    .map((match) => Number.parseInt(match[1], 10))
    .filter(Number.isFinite)

  if (!pageNumbers.length) {
    return splitOfferCards(html).length ? 1 : 0
  }

  return Math.max(...pageNumbers)
}

export const extractSearchResults = (html) => splitOfferCards(html)
  .map((cardHtml) => {
    const titleAnchor = /<a[^>]*class="[^"]*\bc-offer-item__title\b[^"]*"[^>]*>([\s\S]*?)<\/a>/i.exec(cardHtml)?.[0] || null
    const sourceUrl = toAbsoluteUrl(/href="([^"]+)"/i.exec(titleAnchor || '')?.[1], LISTING_URL)
    const title = normalizeWhitespace(/<a[^>]*>([\s\S]*?)<\/a>/i.exec(titleAnchor || '')?.[1])
    const infoItems = extractInfoItems(cardHtml)
    const companyLabel = infoItems[0] || null
    const location = infoItems[1] || null
    const employmentType = infoItems[3] || null
    const department = infoItems[4] || null
    const postingDate = normalizeWhitespace(/<span class="c-offer-item__date">([^<]+)<\/span>/i.exec(cardHtml)?.[1])
    const jobId = getLastPathId(sourceUrl)

    if (!sourceUrl || !title || !jobId) return null
    if (companyLabel !== PUBLIC_COMPANY_NAME) return null
    if (!/\bIndia\b/i.test(location || '')) return null

    return {
      title,
      company: COMPANY,
      department: normalizeWhitespace(department),
      location: normalizeWhitespace(location),
      city: extractCity(location),
      country: INDIA,
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: normalizeEmploymentType(employmentType),
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate,
      closingDate: null,
      jobDescription: null,
    }
  })
  .filter(Boolean)

export const extractJobDetail = (html, listing = {}) => {
  const rawHtml = String(html ?? '')
  const jobPosting = findJobPostingNode(rawHtml) || {}
  const { city, country, location } = extractDetailLocation(jobPosting, listing)

  return {
    ...listing,
    title: normalizeWhitespace(jobPosting.title) || listing.title || null,
    company: COMPANY,
    department: normalizeWhitespace(jobPosting.industry) || listing.department || null,
    location,
    city,
    country,
    jobId: getLastPathId(listing.sourceUrl || LISTING_URL) || listing.jobId || null,
    requisitionId: normalizeWhitespace(jobPosting.identifier) || listing.requisitionId || listing.jobId || null,
    applyUrl: buildDetailApplyUrl(rawHtml, listing.sourceUrl || LISTING_URL) || listing.applyUrl || null,
    employmentType: normalizeEmploymentType(jobPosting.employmentType || listing.employmentType),
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: listing.postingDate || null,
    closingDate: null,
    jobDescription: extractDescription(jobPosting, rawHtml, listing),
  }
}

const createBrowserTextFetcher = async () => {
  const browser = await launchBrowser()
  const page = await createOptimizedPage(browser)

  return {
    fetchText: async (url) => {
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: NAVIGATION_TIMEOUT_MS,
      })

      return page.content()
    },
    close: async () => browser.close(),
  }
}

export const createSafranEngineeringServicesIndiaScraper = ({
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY,
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : Number.POSITIVE_INFINITY,
  now: defaultNow = () => new Date().toISOString(),
} = {}) => ({
  async run(options = {}) {
    let browserContext = null
    let fetchText = options.fetchText
    const now = options.now || defaultNow

    try {
      if (!fetchText) {
        browserContext = await createBrowserTextFetcher()
        fetchText = browserContext.fetchText
      }

      const companyPageHtml = await fetchText(COMPANY_PAGE_URL)
      if (!hasVerifiedCompanyPageSignal(companyPageHtml)) {
        throw new Error('The verified Safran Engineering Services company page no longer matches the known public surface')
      }

      const firstListingPageHtml = await fetchText(buildListingUrl(1))
      if (!hasVerifiedListingPageSignal(firstListingPageHtml)) {
        throw new Error('The verified Safran India jobs listing no longer matches the known public surface')
      }

      const totalPages = extractTotalPages(firstListingPageHtml)
      const pageLimit = Math.min(totalPages || 1, maxPages)
      const jobs = []
      const seenJobIds = new Set()

      for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
        const listingPageHtml = pageNumber === 1
          ? firstListingPageHtml
          : await fetchText(buildListingUrl(pageNumber))

        if (!hasVerifiedListingPageSignal(listingPageHtml)) {
          throw new Error(`The verified Safran India jobs listing no longer matches the known public surface on page ${pageNumber}`)
        }

        const listings = extractSearchResults(listingPageHtml)

        for (const listing of listings) {
          if (!listing.jobId || seenJobIds.has(listing.jobId)) continue
          seenJobIds.add(listing.jobId)

          const detailHtml = await fetchText(listing.sourceUrl)
          if (!hasVerifiedDetailSignal(detailHtml)) {
            throw new Error(`The verified Safran detail page no longer matches the known public surface for ${listing.sourceUrl}`)
          }

          const job = extractJobDetail(detailHtml, listing)

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
    } finally {
      if (browserContext) {
        await browserContext.close()
      }
    }
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
