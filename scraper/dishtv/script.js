import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { DISH_TV_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = DISH_TV_CATALOG
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const SOURCE = PROVIDER_METADATA.source
export const COUNTRY_FILTER = PROVIDER_METADATA.countryFilter
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_PAGE_URL = PROVIDER_METADATA.careersPageUrl
export const SITEMAP_URL = PROVIDER_METADATA.sitemapUrl
export const JOBS_CONTACT_EMAIL = PROVIDER_METADATA.jobsContactEmail
export const SAMPLE_APPLY_URL = PROVIDER_METADATA.sampleApplyUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeUrl = (value) => String(value ?? '').replace(/\/+$/, '')

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&#039;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&#8211;|&ndash;|\u2013/gi, '-')
  .replace(/&#8212;|&mdash;|\u2014/gi, '-')
  .replace(/â€“/g, '-')
  .replace(/â€”/g, '-')
  .replace(/â€™/g, "'")
  .replace(/Â/g, ' ')

const normalizeWhitespace = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/\r/g, '')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeOptionalValue = (value) => {
  const normalized = normalizeWhitespace(value)
  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  decodeHtmlEntities(String(value ?? ''))
    .replace(/<(?:br|\/p|\/div|\/li|\/ul|\/ol|\/h[1-6]|\/span|\/strong)\b[^>]*>/gi, '\n')
    .replace(/<(?:p|div|li|ul|ol|h[1-6]|span|strong)\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const extractTitle = (html = '') => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1]) || null
}

const getFinalUrl = (page, fallbackUrl) => page?.url || page?.finalUrl || fallbackUrl

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

const isTrustedApplyUrl = (value) => {
  try {
    const url = new URL(value)
    const hostname = url.hostname.replace(/^www\./i, '').toLowerCase()
    return hostname === 'forms.office.com'
      || hostname === 'forms.gle'
      || hostname === 'docs.google.com'
  } catch {
    return false
  }
}

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/\+/g, ' plus ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const extractListItems = (html) => [...String(html ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const parseLocation = (value) => {
  const location = normalizeOptionalValue(value)
  if (!location) {
    return {
      location: null,
      city: null,
      state: null,
      country: 'India',
    }
  }

  if (/^noida$/i.test(location)) {
    return {
      location,
      city: 'Noida',
      state: 'Uttar Pradesh',
      country: 'India',
    }
  }

  return {
    location,
    city: null,
    state: null,
    country: 'India',
  }
}

const buildJobId = (card) => {
  const identity = slugify([
    card.title,
    card.department || 'na',
    card.location || 'any',
    card.experience || 'na',
  ].join('-'))

  return `${SOURCE}-${identity}`
}

const extractCustomDescription = (block) => [...String(block ?? '').matchAll(
  /<div class="job-card__custom-desc">([\s\S]*?)<\/div>/gi,
)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)
  .join('\n')

const extractAllApplyUrls = (html) => [...String(html ?? '').matchAll(
  /<a href="([^"]+)" class="job-card__apply-btn"/gi,
)]
  .map((match) => match[1])

export const hasOfficialHomepageSignal = (page) => {
  const html = typeof page === 'string' ? page : page?.html
  const status = typeof page === 'string' ? 200 : Number(page?.status)
  const finalUrl = normalizeUrl(getFinalUrl(page, HOMEPAGE_URL))
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return status === 200
    && finalUrl === normalizeUrl(HOMEPAGE_URL)
    && extractTitle(rawHtml) === 'DishTV Recharge Online & New DTH Connection'
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.dishtv\.in\/["']/i.test(rawHtml)
    && normalized.includes('Snack on the content you love.')
    && normalized.includes('All day, every day.')
}

export const sitemapIncludesCareersPage = (xml = '') =>
  /<loc>\s*https:\/\/www\.dishtv\.in\/careers\.html\s*<\/loc>/i.test(String(xml ?? ''))

export const hasOfficialCareersPageSignal = (page) => {
  const html = typeof page === 'string' ? page : page?.html
  const status = typeof page === 'string' ? 200 : Number(page?.status)
  const finalUrl = normalizeUrl(getFinalUrl(page, CAREERS_PAGE_URL))
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)
  const applyUrls = extractAllApplyUrls(rawHtml)

  return status === 200
    && finalUrl === normalizeUrl(CAREERS_PAGE_URL)
    && extractTitle(rawHtml) === 'DISHTV Jobs - Job Openings in DISHTV'
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.dishtv\.in\/careers\.html["']/i.test(rawHtml)
    && /<meta[^>]+property=["']og:url["'][^>]+content=["']https:\/\/www\.dishtv\.in\/careers\.html["']/i.test(rawHtml)
    && normalized.includes('jobs@dishd2h.com')
    && normalized.includes('CURRENT OPENINGS')
    && normalized.includes('All Locations')
    && normalized.includes('All Experience Levels')
    && normalized.includes('No openings match your search. Try adjusting the filters.')
    && applyUrls.length > 0
    && applyUrls.some(isTrustedApplyUrl)
}

export const extractJobCards = (html) => {
  const cards = []

  for (const match of String(html ?? '').matchAll(
    /<div class="jobCard">[\s\S]*?<div class="job-card"([^>]*)>([\s\S]*?)<div class="job-card__footer">[\s\S]*?<a href="([^"]+)" class="job-card__apply-btn"[\s\S]*?>\s*Apply Now\s*<\/a>[\s\S]*?<p class="job-card__contact">[\s\S]*?<strong>([^<]*)<\/strong>[\s\S]*?<a href="mailto:([^"]+)"[\s\S]*?>/gi,
  )) {
    const attrs = match[1]
    const block = match[2]
    const titleMatch = block.match(/<h3 class="job-card__title">([\s\S]*?)<\/h3>/i)
    const title = normalizeOptionalValue(titleMatch?.[1])
    const department = normalizeOptionalValue(/data-department="([^"]*)"/i.exec(attrs)?.[1])
    const location = normalizeOptionalValue(/data-location="([^"]*)"/i.exec(attrs)?.[1])
    const experience = normalizeOptionalValue(/data-experience="([^"]*)"/i.exec(attrs)?.[1])
    const applyUrl = normalizeOptionalValue(match[3])
    const contactName = normalizeOptionalValue(match[4])
    const contactEmail = normalizeOptionalValue(match[5])
    const jobDescription = normalizeOptionalValue(extractCustomDescription(block))
    const requiredSkills = extractListItems(block)

    if (!title || !applyUrl || !contactName || !contactEmail || !isTrustedApplyUrl(applyUrl)) {
      throw new Error('DishTV verified current openings cards no longer match the trusted public surface')
    }

    cards.push({
      title,
      department,
      location,
      experience,
      applyUrl,
      contactName,
      contactEmail,
      jobDescription,
      requiredSkills,
    })
  }

  if (cards.length === 0) {
    throw new Error('DishTV verified current openings cards no longer match the trusted public surface')
  }

  return cards
}

export const buildJobFromCard = (card = {}) => {
  if (!card.title || !card.applyUrl || !isTrustedApplyUrl(card.applyUrl)) {
    throw new Error('DishTV verified current openings card is incomplete')
  }

  const locationBits = parseLocation(card.location)
  const jobId = buildJobId(card)

  return {
    title: card.title,
    company: COMPANY_NAME,
    department: card.department || null,
    location: locationBits.location,
    city: locationBits.city,
    state: locationBits.state,
    country: locationBits.country,
    jobId,
    requisitionId: jobId,
    sourceUrl: CAREERS_PAGE_URL,
    applyUrl: card.applyUrl,
    employmentType: null,
    experienceRequired: card.experience || null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: card.requiredSkills || [],
    contactName: card.contactName || null,
    contactEmail: card.contactEmail || null,
    postingDate: null,
    closingDate: null,
    jobDescription: card.jobDescription || null,
  }
}

const normalizeScrapedAt = (value) => {
  if (value instanceof Date) return value.toISOString()

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid now() value supplied to DishTV scraper')
  }

  return parsed.toISOString()
}

export const createDishTvScraper = ({
  maxJobs = null,
  now = () => new Date(),
} = {}) => ({
  async run(options = {}) {
    const fetchPage = options.fetchPage || defaultFetchPage

    const homepage = await fetchPage(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepage)) {
      throw new Error('DishTV verified official homepage no longer matches the trusted first-party surface')
    }

    const sitemapPage = await fetchPage(SITEMAP_URL)
    if (Number(sitemapPage?.status) !== 200 || !sitemapIncludesCareersPage(sitemapPage?.html)) {
      throw new Error('DishTV verified sitemap no longer exposes the trusted careers page')
    }

    const careersPage = await fetchPage(CAREERS_PAGE_URL)
    if (!hasOfficialCareersPageSignal(careersPage)) {
      throw new Error('DishTV verified careers page no longer matches the trusted public surface')
    }

    const cards = extractJobCards(careersPage.html)
    const limit = Number.isInteger(options.maxJobs) ? options.maxJobs : maxJobs
    const selectedCards = limit ? cards.slice(0, limit) : cards
    const scrapedAt = normalizeScrapedAt((options.now || now)())

    return selectedCards.map((card) => {
      const job = buildJobFromCard(card)

      return {
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt,
      }
    })
  },
})

export const run = async (options = {}) => createDishTvScraper().run(options)

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
