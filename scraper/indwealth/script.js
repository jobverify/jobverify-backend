import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { INDWEALTH_CATALOG } from './catalog.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = INDWEALTH_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const OFFICIAL_REDIRECT_SOURCE_URL = PROVIDER_METADATA.officialRedirectSourceUrl
export const OFFICIAL_BRAND_HOMEPAGE_URL = PROVIDER_METADATA.officialBrandHomepageUrl
export const OFFICIAL_ABOUT_URL = PROVIDER_METADATA.officialAboutUrl
export const LINKEDIN_COMPANY_JOBS_URL = PROVIDER_METADATA.linkedinCompanyJobsUrl
export const LINKEDIN_COMPANY_PAGE_URL = PROVIDER_METADATA.linkedinCompanyPageUrl
export const LINKEDIN_PUBLIC_JOBS_URL = PROVIDER_METADATA.publicLinkedInJobsUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/&#8212;|&mdash;/gi, '-')
  .replace(/\u00a0/g, ' ')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  decodeHtmlEntities(value)
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (normalized === 'full_time' || normalized === 'full time') return 'Full-time'
  if (normalized === 'part_time' || normalized === 'part time') return 'Part-time'
  if (normalized.includes('contract')) return 'Contract'
  if (normalized.includes('intern')) return 'Internship'
  return normalizeWhitespace(value)
}

const normalizeUrl = (value) => String(value ?? '').replace(/\/+$/, '')

const parseLocation = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) {
    return {
      location: null,
      city: null,
      country: null,
    }
  }

  const parts = normalized.split(',').map((part) => normalizeWhitespace(part)).filter(Boolean)
  const city = parts[0] || null
  const country = parts.at(-1) === 'India' ? 'India' : parts.at(-1) || null

  return {
    location: normalized,
    city,
    country,
  }
}

const parseJobPostingJsonLd = (html) => {
  const scripts = [...String(html ?? '').matchAll(
    /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/gi,
  )]

  for (const [, rawJson] of scripts) {
    try {
      const parsed = JSON.parse(rawJson)
      if (parsed?.['@type'] === 'JobPosting') return parsed
    } catch {
      // Skip malformed JSON-LD payloads until the public JobPosting blob is found.
    }
  }

  return null
}

const isVerifiedLinkedInCompanyPageUrl = (value) => {
  try {
    const url = new URL(value)
    return /(^|\.)linkedin\.com$/i.test(url.hostname)
      && /^\/company\/indmoney\/?$/i.test(url.pathname)
  } catch {
    return false
  }
}

export const hasVerifiedRedirectHomepageSignal = ({ url, html } = {}) => {
  if (normalizeUrl(url) !== normalizeUrl(OFFICIAL_BRAND_HOMEPAGE_URL)) return false

  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)?.toLowerCase() || ''

  return /<title>\s*Indmoney:\s*Online Trading & Investing App for Indian & US Markets\s*<\/title>/i.test(rawHtml)
    && normalized.includes('trade & invest in indian & us markets from one app')
    && normalized.includes('about us')
    && normalized.includes('blog')
    && normalized.includes('learn')
    && normalized.includes('customer service')
    && normalized.includes('fraud awareness')
    && normalized.includes('sitemap')
}

export const extractLinkedInCompanyJobsUrl = (html) => {
  const match = String(html ?? '').match(
    /<a[^>]+href=["'](https:\/\/www\.linkedin\.com\/company\/indmoney\/jobs\/?)["'][^>]*>\s*Join Our Team\s*<\/a>/i,
  )

  return normalizeWhitespace(match?.[1] ?? null)
}

const hasJoinOurTeamAnchor = (html) =>
  /<a[^>]+href=["'][^"']+["'][^>]*>\s*Join Our Team\s*<\/a>/i.test(String(html ?? ''))

export const hasVerifiedAboutPageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)?.toLowerCase() || ''

  return normalized.includes('our company')
    && normalized.includes('super finance app')
    && normalized.includes('join us')
    && normalized.includes('join our team')
    && hasJoinOurTeamAnchor(rawHtml)
}

export const hasVerifiedLinkedInCompanySignal = ({ url, html } = {}) => {
  if (!isVerifiedLinkedInCompanyPageUrl(url)) return false

  const normalized = normalizeWhitespace(html)?.toLowerCase() || ''

  return normalized.includes('indmoney')
    && normalized.includes('financial services')
    && normalized.includes('invest in india and us markets from one app')
    && normalized.includes('https://www.indmoney.com')
    && /(gurgaon|gurugram), haryana/.test(normalized)
}

export const hasPublicLinkedInJobsSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)?.toLowerCase() || ''

  return /<title>\s*\d+\s*Indmoney jobs in India\s*<\/title>/i.test(rawHtml)
    && normalized.includes('indmoney jobs in india')
    && /job-search-card/i.test(rawHtml)
    && normalized.includes('indmoney')
}

export const extractSearchResults = (html) => [...String(html ?? '').matchAll(
  /<div class="base-card[\s\S]*?job-search-card"[\s\S]*?data-entity-urn="urn:li:jobPosting:([0-9]+)"[\s\S]*?<a class="base-card__full-link[^"]*" href="([^"]+)"[\s\S]*?<h3 class="base-search-card__title">\s*([\s\S]*?)\s*<\/h3>[\s\S]*?<h4 class="base-search-card__subtitle">[\s\S]*?<a[^>]*>\s*([\s\S]*?)\s*<\/a>[\s\S]*?<span class="job-search-card__location">\s*([\s\S]*?)\s*<\/span>[\s\S]*?<time class="job-search-card__listdate" datetime="([^"]+)"[^>]*>/gi,
)]
  .map((match) => {
    const [, jobId, rawHref, rawTitle, rawCompany, rawLocation, postingDate] = match
    const sourceUrl = normalizeWhitespace(rawHref)?.replace(/&amp;/g, '&')
    const title = stripTags(rawTitle)
    const company = stripTags(rawCompany)
    const locationData = parseLocation(stripTags(rawLocation))

    if (
      !title
      || !jobId
      || !sourceUrl
      || locationData.country !== 'India'
      || normalizeWhitespace(company)?.toLowerCase() !== OFFICIAL_BRAND_NAME.toLowerCase()
    ) {
      return null
    }

    return {
      title,
      company,
      department: null,
      location: locationData.location,
      city: locationData.city,
      country: locationData.country,
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: normalizeWhitespace(postingDate),
      closingDate: null,
      jobDescription: null,
    }
  })
  .filter(Boolean)

export const extractJobDetail = (html) => {
  const jobPosting = parseJobPostingJsonLd(html)
  if (!jobPosting) return {}

  const address = jobPosting?.jobLocation?.address || {}
  const country = address.addressCountry === 'IN'
    ? 'India'
    : normalizeWhitespace(address.addressCountry)
  const parts = [
    normalizeWhitespace(address.addressLocality),
    normalizeWhitespace(address.addressRegion),
    country,
  ].filter(Boolean)

  return {
    title: normalizeWhitespace(jobPosting?.title) || null,
    company: normalizeWhitespace(jobPosting?.hiringOrganization?.name) || null,
    location: parts.join(', ') || null,
    city: normalizeWhitespace(address.addressLocality),
    country,
    employmentType: normalizeEmploymentType(jobPosting?.employmentType),
    postingDate: normalizeWhitespace(jobPosting?.datePosted)?.slice(0, 10) || null,
    jobDescription: stripTags(jobPosting?.description) || null,
  }
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'indwealth-html',
  timeoutMs: 15000,
})

export const createIndwealthScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const homepage = await fetchPage(OFFICIAL_REDIRECT_SOURCE_URL)
    if (homepage.status !== 200 || !hasVerifiedRedirectHomepageSignal(homepage)) {
      throw new Error('The official INDwealth redirect no longer matches the verified INDmoney homepage surface')
    }

    const aboutPage = await fetchPage(OFFICIAL_ABOUT_URL)
    if (aboutPage.status !== 200 || !hasVerifiedAboutPageSignal(aboutPage.html)) {
      throw new Error('The official INDmoney about page no longer matches the verified public surface')
    }

    if (normalizeUrl(extractLinkedInCompanyJobsUrl(aboutPage.html)) !== normalizeUrl(LINKEDIN_COMPANY_JOBS_URL)) {
      throw new Error('The official INDmoney about-page LinkedIn handoff changed materially')
    }

    const linkedInCompanyPage = await fetchPage(LINKEDIN_COMPANY_JOBS_URL)
    if (linkedInCompanyPage.status !== 200 || !hasVerifiedLinkedInCompanySignal(linkedInCompanyPage)) {
      throw new Error('The verified LinkedIn company page changed materially')
    }

    const listingsHtml = await fetchText(LINKEDIN_PUBLIC_JOBS_URL)
    if (!hasPublicLinkedInJobsSignal(listingsHtml)) {
      throw new Error('The public INDmoney LinkedIn jobs surface changed materially')
    }

    const listings = extractSearchResults(listingsHtml)
    const selectedJobs = maxJobs ? listings.slice(0, maxJobs) : listings
    const enrichedJobs = []

    for (const listing of selectedJobs) {
      const detail = extractJobDetail(await fetchText(listing.sourceUrl))
      enrichedJobs.push({
        ...listing,
        ...Object.fromEntries(
          Object.entries(detail).filter(([, value]) => value != null),
        ),
      })
    }

    return enrichedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createIndwealthScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
