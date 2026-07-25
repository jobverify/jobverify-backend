import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCity } from '../utils/cityNormalizer.js'
import { fetchTextWithRetry } from '../utils/fetch.js'
import { OF_BUSINESS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = OF_BUSINESS_CATALOG.source
export const COMPANY = OF_BUSINESS_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = OF_BUSINESS_CATALOG.officialBrandName
export const VERIFIED_ON = OF_BUSINESS_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = OF_BUSINESS_CATALOG.verifiedSurfaceSummary
export const CAREERS_HOME_URL = OF_BUSINESS_CATALOG.officialCareersLandingUrl
export const CATEGORIES_URL = OF_BUSINESS_CATALOG.companyCareerPage
export const WIX_WARMUP_DATA_SCRIPT_ID = OF_BUSINESS_CATALOG.wixWarmupScriptId
export const PAGINATION_QUERY_PARAM = OF_BUSINESS_CATALOG.paginationQueryParam

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

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(String(value ?? ''))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) =>
  normalizeWhitespace(
    String(value ?? '')
      .replace(/<(br|\/p|\/div|\/li|\/ul|\/ol|\/h[1-6]|\/section)\b[^>]*>/gi, '\n')
      .replace(/<(p|div|li|ul|ol|h[1-6]|section)\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )

const defaultFetchPage = async (url) => {
  const html = await fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    label: SOURCE,
    timeoutMs: 20000,
  })

  return {
    status: 200,
    url,
    html,
  }
}

const resolveCategoryName = (category, categories = {}) => {
  if (!category) return null

  if (typeof category === 'string') {
    return normalizeWhitespace(categories[category]?.category) || normalizeWhitespace(category)
  }

  return normalizeWhitespace(category?.category) || normalizeWhitespace(category?._id)
}

const buildJobDescription = (job) =>
  [
    stripTags(job?.jobDescription),
    stripTags(job?.whatYouWillDo),
    stripTags(job?.whatWeAreLookingFor),
    stripTags(job?.whatWeAreOffering),
  ]
    .filter(Boolean)
    .join(' ')

export const hasOfficialCareersHomeSignal = (html) => {
  const page = String(html ?? '')

  return /Careers @ OfBusiness/i.test(page)
    && /OfBusiness Group is India'?s largest and most efficient supply chain platform/i.test(page)
    && /Explore Roles/i.test(page)
    && /Why join us\?/i.test(page)
    && /How we hire\?/i.test(page)
    && /career@ofbusiness\.in/i.test(page)
    && /OFB Tech Pvt\. Ltd/i.test(page)
}

export const extractPaginationQueryParam = (html) => {
  const match = String(html ?? '').match(
    /https:\/\/www\.ofbcareers\.com\/categories\?([^="'&\s]+)=2/i,
  )

  return match?.[1] ?? null
}

export const hasOfficialCategoriesSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*OfBusiness Careers \| Explore High-Growth roles with us\s*<\/title>/i.test(page)
    && /Filter by Job Function/i.test(page)
    && /Filter by Location/i.test(page)
    && /Didn'?t find a role that suits you\?/i.test(page)
    && /career@ofbusiness\.in/i.test(page)
    && /earlycareers@ofbusiness\.in/i.test(page)
}

export const parseWixWarmupData = (html) => {
  const match = String(html ?? '').match(
    /<script type="application\/json" id="wix-warmup-data">([\s\S]*?)<\/script>/i,
  )

  if (!match) {
    throw new Error('OfBusiness categories page no longer exposes the verified Wix warmup-data payload')
  }

  return JSON.parse(match[1])
}

export const extractTotalPagesFromWarmupData = (warmupData) => {
  const updates = Array.isArray(warmupData?.platform?.ssrPropsUpdates)
    ? warmupData.platform.ssrPropsUpdates
    : []

  for (const update of updates) {
    for (const value of Object.values(update)) {
      if (value && typeof value === 'object' && Number.isInteger(value.totalPages)) {
        return value.totalPages
      }
    }
  }

  return null
}

export const extractJobsFromWarmupData = (warmupData) => {
  const jobs = warmupData?.appsWarmupData?.dataBinding?.dataStore?.recordsByCollectionId?.Jobs

  if (!jobs || typeof jobs !== 'object' || Array.isArray(jobs)) {
    throw new Error('OfBusiness warmup data no longer exposes the verified Jobs collection')
  }

  return Object.values(jobs)
}

export const extractCategoriesFromWarmupData = (warmupData) => {
  const categories = warmupData?.appsWarmupData?.dataBinding?.dataStore?.recordsByCollectionId?.Categories
  return categories && typeof categories === 'object' && !Array.isArray(categories) ? categories : {}
}

export const buildCategoriesPageUrl = (page) => {
  if (!Number.isInteger(page) || page <= 1) {
    return CATEGORIES_URL
  }

  return `${CATEGORIES_URL}?${PAGINATION_QUERY_PARAM}=${page}`
}

export const normalizeOfBusinessJob = (job, categories = {}) => {
  const location = normalizeWhitespace(job?.location)
  const sourceUrl = normalizeWhitespace(job?.['link-jobs-jobTitle'])
    ? new URL(job['link-jobs-jobTitle'], CAREERS_HOME_URL).toString()
    : null

  if (!location || !sourceUrl) {
    throw new Error('OfBusiness job payload no longer exposes the verified location or detail link')
  }

  return {
    title: normalizeWhitespace(job?.jobTitle),
    company: COMPANY,
    department: resolveCategoryName(job?.category, categories),
    location,
    city: normalizeCity(location),
    country: 'India',
    jobId: normalizeWhitespace(job?._id),
    requisitionId: normalizeWhitespace(job?.empId),
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: normalizeWhitespace(job?.jobType),
    experienceRequired: normalizeWhitespace(job?.experienceRequiredRangeyrs),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: job?._createdDate?.$date ? new Date(job._createdDate.$date).toISOString() : null,
    closingDate: null,
    jobDescription: buildJobDescription(job),
  }
}

export const createOfBusinessScraper = ({
  now: defaultNow = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchPage = defaultFetchPage,
    now = defaultNow,
  } = {}) {
    const careersHome = await fetchPage(CAREERS_HOME_URL)
    if (careersHome.status !== 200 || !hasOfficialCareersHomeSignal(careersHome.html)) {
      throw new Error('OfBusiness verified careers homepage no longer matches the official first-party surface')
    }

    const firstCategoriesPage = await fetchPage(CATEGORIES_URL)
    if (firstCategoriesPage.status !== 200 || !hasOfficialCategoriesSignal(firstCategoriesPage.html)) {
      throw new Error('OfBusiness verified categories page no longer matches the official first-party surface')
    }

    if (extractPaginationQueryParam(firstCategoriesPage.html) !== PAGINATION_QUERY_PARAM) {
      throw new Error('OfBusiness verified pagination contract changed on the official categories page')
    }

    const firstWarmupData = parseWixWarmupData(firstCategoriesPage.html)
    const totalPages = extractTotalPagesFromWarmupData(firstWarmupData)
    if (!Number.isInteger(totalPages) || totalPages < 1) {
      throw new Error('OfBusiness warmup data no longer exposes the verified pagination metadata')
    }

    const aggregatedCategories = new Map(Object.entries(extractCategoriesFromWarmupData(firstWarmupData)))
    const aggregatedJobs = new Map()
    for (const job of extractJobsFromWarmupData(firstWarmupData)) {
      aggregatedJobs.set(job._id, job)
    }

    for (let page = 2; page <= totalPages; page += 1) {
      const pageUrl = buildCategoriesPageUrl(page)
      const response = await fetchPage(pageUrl)

      if (response.status !== 200 || !hasOfficialCategoriesSignal(response.html)) {
        throw new Error('OfBusiness categories pagination changed materially or no longer exposes the verified jobs surface')
      }

      if (extractPaginationQueryParam(response.html) !== PAGINATION_QUERY_PARAM) {
        throw new Error('OfBusiness verified pagination contract changed on the official categories page')
      }

      const warmupData = parseWixWarmupData(response.html)
      for (const [key, value] of Object.entries(extractCategoriesFromWarmupData(warmupData))) {
        aggregatedCategories.set(key, value)
      }
      for (const job of extractJobsFromWarmupData(warmupData)) {
        aggregatedJobs.set(job._id, job)
      }
    }

    const categories = Object.fromEntries(aggregatedCategories.entries())
    const scrapedAt = now()

    return Array.from(aggregatedJobs.values()).map((job) => {
      const normalized = normalizeOfBusinessJob(job, categories)
      return {
        ...normalized,
        source: SOURCE,
        link: normalized.applyUrl,
        companyCareerPage: CATEGORIES_URL,
        companyDomain: OF_BUSINESS_CATALOG.companyDomain,
        atsPlatform: OF_BUSINESS_CATALOG.atsPlatform,
        scrapedAt,
      }
    })
  },
})

export const run = async (options = {}) => createOfBusinessScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
