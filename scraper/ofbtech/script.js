import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { normalizeCity } from '../utils/cityNormalizer.js'
import OFB_TECH_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = OFB_TECH_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const HOMEPAGE_URL = PROVIDER_METADATA.officialHomepageUrl
export const LISTINGS_PAGE_URL = PROVIDER_METADATA.officialListingsPageUrl
export const JOB_DETAILS_BASE_URL = PROVIDER_METADATA.officialJobDetailsBaseUrl

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
  .replace(/\u00a0/g, ' ')

const stripTags = (value) => decodeHtmlEntities(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/p>/gi, '\n')
  .replace(/<\/div>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')

const normalizeWhitespace = (value) => stripTags(value)
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n[ \t]+/g, '\n')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n+/g, '\n')
  .trim()

const normalizeInlineText = (value) =>
  normalizeWhitespace(value)
    .replace(/\s+/g, ' ')
    .trim() || null

const normalizeEmploymentType = (value) => {
  const normalized = normalizeInlineText(value)?.toLowerCase()
  if (!normalized) return null
  if (/intern/.test(normalized)) return 'Internship'
  if (/contract|consultant/.test(normalized)) return 'Contract'
  if (/part.?time/.test(normalized)) return 'Part-time'
  if (/full.?time/.test(normalized)) return 'Full-time'
  return normalizeInlineText(value)
}

const normalizeLocation = (value) => {
  const normalized = normalizeInlineText(value)
  if (!normalized) {
    return {
      location: null,
      city: null,
      country: null,
      remoteStatus: 'On-site',
    }
  }

  const hasIndia = /india/i.test(normalized)
  const remote = /remote/i.test(normalized)
  const cityLabel = remote
    ? 'Remote'
    : normalizeCity((normalized.split(',')[0] || normalized).trim())
  const location = hasIndia ? normalized : `${normalized}, India`

  return {
    location,
    city: cityLabel || null,
    country: 'India',
    remoteStatus: remote ? 'Remote' : 'On-site',
  }
}

const normalizeComparableUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''), HOMEPAGE_URL)
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return String(value ?? '').replace(/\/$/, '')
  }
}

const sameUrl = (left, right) => normalizeComparableUrl(left) === normalizeComparableUrl(right)

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*OfBusiness Careers\s*\|\s*Explore High-Growth roles with us\s*<\/title>/i.test(
    page,
  )
    && /Careers\s*@\s*OfBusiness/i.test(page)
    && /https:\/\/www\.ofbcareers\.com\/categories/i.test(page)
    && /OFB Tech Pvt\. Ltd/i.test(page)
}

export const hasOfficialListingsPageSignal = (html) => {
  const page = String(html ?? '')

  return /View Details/i.test(page)
    && page.includes('wix-warmup-data')
    && /link-jobs-jobTitle/i.test(page)
    && /jobTitle/i.test(page)
}

export const extractWarmupData = (html = '') => {
  const page = String(html ?? '')
  const match = page.match(
    /<!--\s*warmup data start\s*-->\s*<script[^>]*>([\s\S]*?)<\/script>\s*<!--\s*warmup data end\s*-->/i,
  ) || page.match(
    /<script[^>]+id=["']wix-warmup-data["'][^>]*>([\s\S]*?)<\/script>/i,
  )

  if (!match?.[1]) {
    throw new Error('OFB Tech verified listings page no longer exposes the embedded warmup dataset')
  }

  try {
    return JSON.parse(match[1])
  } catch {
    throw new Error('OFB Tech embedded warmup dataset is no longer valid JSON')
  }
}

const findJobsContainer = (value, seen = new Set()) => {
  if (!value || typeof value !== 'object' || seen.has(value)) return null
  seen.add(value)

  if (
    value.Jobs
    && typeof value.Jobs === 'object'
    && Object.values(value.Jobs).some((record) => record && typeof record === 'object' && record.jobTitle)
  ) {
    return value.Jobs
  }

  for (const nested of Object.values(value)) {
    const match = findJobsContainer(nested, seen)
    if (match) return match
  }

  return null
}

export const extractJobsDataset = (warmupData) => {
  const dataset = findJobsContainer(warmupData)
  if (!dataset) {
    throw new Error('OFB Tech verified listings dataset no longer exposes a Jobs collection')
  }

  return dataset
}

const buildJobUrl = (value) => {
  const normalized = normalizeInlineText(value)
  if (!normalized) return null
  return new URL(normalized, HOMEPAGE_URL).toString()
}

const buildJobDescription = (record = {}) => {
  const sections = [
    ['About the business', record.jobDescription],
    ['What you will do', record.whatYouWillDo],
    ['What we are looking for', record.whatWeAreLookingFor],
    ['What we offer', record.whatWeAreOffering],
  ]

  const description = sections
    .map(([label, value]) => {
      const text = normalizeInlineText(value)
      return text ? `${label}: ${text}` : null
    })
    .filter(Boolean)
    .join(' ')

  return description || null
}

export const extractJobs = (html = '') => {
  const dataset = extractJobsDataset(extractWarmupData(html))
  const jobs = []

  for (const record of Object.values(dataset)) {
    if (!record || typeof record !== 'object') continue

    const title = normalizeInlineText(record.jobTitle)
    const jobId = normalizeInlineText(record._id)
    const requisitionId = normalizeInlineText(record.empId)
    const sourceUrl = buildJobUrl(record['link-jobs-jobTitle'])
    const department = normalizeInlineText(record?.category?.category)
    const employmentType = normalizeEmploymentType(record.jobType)
    const experienceRequired = normalizeInlineText(record.experienceRequiredRangeyrs)
    const postingDate = normalizeInlineText(record?._createdDate?.$date)
    const { location, city, country, remoteStatus } = normalizeLocation(record.location)

    if (!title || !jobId || !sourceUrl || !location) continue

    jobs.push({
      jobId,
      requisitionId,
      title,
      company: COMPANY,
      department,
      location,
      city,
      country,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType,
      experienceRequired,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate,
      closingDate: null,
      jobDescription: buildJobDescription(record),
      remoteStatus,
    })
  }

  return jobs.sort((left, right) => left.title.localeCompare(right.title) || left.jobId.localeCompare(right.jobId))
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  attempts: 3,
  baseDelayMs: 2000,
  timeoutMs: 20000,
  label: SOURCE,
})

export const createOfbTechScraper = ({
  now: defaultNow = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = defaultNow,
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('OFB Tech verified homepage no longer matches the trusted first-party surface')
    }

    const listingsUrlMatch = String(homepageHtml).match(/href=["'](https:\/\/www\.ofbcareers\.com\/categories)["']/i)
    if (!sameUrl(listingsUrlMatch?.[1], LISTINGS_PAGE_URL)) {
      throw new Error('OFB Tech verified homepage handoff changed materially')
    }

    const listingsPageHtml = await fetchText(LISTINGS_PAGE_URL)
    if (!hasOfficialListingsPageSignal(listingsPageHtml)) {
      throw new Error('OFB Tech verified listings page no longer matches the trusted public surface')
    }

    const scrapedAt = now()

    return extractJobs(listingsPageHtml).map((job) => ({
      ...job,
      link: job.applyUrl || job.sourceUrl,
      source: SOURCE,
      scrapedAt,
    }))
  },
})

export const run = async (options = {}) => createOfbTechScraper(options).run(options)

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
