import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'drreddyslaboratories'
export const COMPANY_NAME = 'Dr. Reddy\'s Laboratories'
export const COMPANY_DOMAIN = 'careers.drreddys.com'
export const VERIFIED_AT = '2026-07-15'
export const HOMEPAGE_URL = 'https://www.drreddys.com/'
export const CAREERS_LANDING_PAGE_URL = 'https://careers.drreddys.com/'
export const JOBS_PAGE_URL = 'https://careers.drreddys.com/jobs'
export const VERIFIED_JOB_URL =
  'https://careers.drreddys.com/job/data-analyst-hr-analytics-in-hyderabad-jid-5118'
export const VERIFIED_APPLY_URL =
  'https://careers.drreddys.com/Workflow?workflowId=20a2c445-dcb2-41c7-84cc-87cd0423c8a2&vacancyId=5118'

export const PROVIDER_METADATA = {
  source: SOURCE,
  companyName: COMPANY_NAME,
  companyCareerPage: CAREERS_LANDING_PAGE_URL,
  jobsPageUrl: JOBS_PAGE_URL,
  companyDomain: COMPANY_DOMAIN,
  countryFilter: 'India',
  atsPlatform: 'first-party-attrax',
  paginationStrategy: 'first-party-attrax-html-pagination',
  extractionStrategy:
    'verified-homepage-handoff+verified-careers-landing+attrax-india-cards+detail-page-workflow-apply',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, '\'')
  .replace(/[\u2018\u2019]/g, '\'')
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

const toAbsoluteUrl = (value) => {
  try {
    return new URL(decodeHtmlEntities(value), CAREERS_LANDING_PAGE_URL).toString()
  } catch {
    return null
  }
}

const getCardStartIndexes = (html) => [...String(html ?? '').matchAll(/<div class="attrax-vacancy-tile\b/gi)]
  .map((match) => match.index)

const splitJobCards = (html) => {
  const pageHtml = String(html ?? '')
  const indexes = getCardStartIndexes(pageHtml)

  return indexes.map((start, index) => {
    const end = indexes[index + 1] ?? pageHtml.length
    return pageHtml.slice(start, end)
  })
}

const extractTitleAndUrl = (cardHtml) => {
  const match = /<a[^>]*class="[^"]*attrax-vacancy-tile__title[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(cardHtml)
  return {
    sourceUrl: toAbsoluteUrl(match?.[1]),
    title: normalizeWhitespace(match?.[2]),
  }
}

const extractLabeledValues = (html) => {
  const values = new Map()
  const pattern = /<p[^>]*class="[^"]*attrax-vacancy-tile__item-label[^"]*"[^>]*>([\s\S]*?)<\/p>[\s\S]*?<p[^>]*class="[^"]*attrax-vacancy-tile__item-value[^"]*"[^>]*>([\s\S]*?)<\/p>/gi

  for (const match of String(html ?? '').matchAll(pattern)) {
    const label = normalizeWhitespace(match[1])?.toLowerCase()
    const value = normalizeWhitespace(match[2])

    if (!label || !value) continue

    const existing = values.get(label) ?? []
    existing.push(value)
    values.set(label, existing)
  }

  return values
}

const getFieldValues = (fields, ...labels) => labels.flatMap((label) => fields.get(label.toLowerCase()) ?? [])

const getFirstFieldValue = (fields, ...labels) => getFieldValues(fields, ...labels).find(Boolean) ?? null

const extractJobId = (cardHtml, sourceUrl) =>
  /data-jobid="(\d+)"/i.exec(cardHtml)?.[1]
  || /vacancyId=(\d+)/i.exec(sourceUrl ?? '')?.[1]
  || /jid-(\d+)/i.exec(sourceUrl ?? '')?.[1]
  || null

const normalizeClosingDate = (value) => {
  const normalized = normalizeWhitespace(value)

  if (!normalized) return null
  if (/^(?:0?1\/0?1\/0{3}[01]|jan\s+1,\s+0{3}[01])$/i.test(normalized)) return null

  return normalized
}

const locationImpliesIndia = (value) => /\bindia\b/i.test(value ?? '')

const getNormalizedLocation = (fields, cardHtml) => {
  const locationValue = getFirstFieldValue(fields, 'location')
  const location = normalizeWhitespace(locationValue)

  if (!location) return { location: null, city: null }

  const normalizedLocation = locationImpliesIndia(location) || !/attrax-vacancy-tile--india\b/i.test(cardHtml)
    ? location
    : `${location}, India`
  const cityToken = normalizedLocation.split(',')[0]

  return {
    location: normalizedLocation,
    city: normalizeCity(cityToken) || normalizeWhitespace(cityToken),
  }
}

const isIndiaCard = (cardHtml, location) =>
  /attrax-vacancy-tile--india\b/i.test(cardHtml)
  || locationImpliesIndia(location)

const extractDescriptionWidgetHtml = (html) => {
  const pageHtml = String(html ?? '')
  const markerIndex = pageHtml.indexOf('description-widget')
  if (markerIndex === -1) return null

  const start = pageHtml.lastIndexOf('<div', markerIndex)
  const tail = pageHtml.slice(start === -1 ? markerIndex : start)
  const nextScriptIndex = tail.search(/<script\b/i)

  return nextScriptIndex === -1 ? tail : tail.slice(0, nextScriptIndex)
}

const extractQualificationsSectionHtml = (html) => {
  const descriptionWidgetHtml = extractDescriptionWidgetHtml(html)
  if (!descriptionWidgetHtml) return null

  const markerIndex = descriptionWidgetHtml.indexOf('jobad-qualifications')
  if (markerIndex === -1) return null

  return descriptionWidgetHtml.slice(markerIndex)
}

const extractListItems = (html) => [...String(html ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => normalizeWhitespace(match[1]))
  .filter(Boolean)

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const extractSectionParagraphValue = (html, label) => {
  const pattern = new RegExp(
    `<p[^>]*>\\s*<strong>\\s*${escapeRegex(label)}\\s*<\\/strong>\\s*<\\/p>\\s*<p[^>]*>([\\s\\S]*?)<\\/p>`,
    'i',
  )

  return normalizeWhitespace(pattern.exec(String(html ?? ''))?.[1])
}

export const extractCareersHandoffUrl = (html) =>
  toAbsoluteUrl(/<a[^>]*href="([^"]*careers\.drreddys\.com\/?[^"]*)"[^>]*>\s*Careers\s*<\/a>/i.exec(String(html ?? ''))?.[1])

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')

  return /Dr\. Reddy's - Good Health Can.?t Wait/i.test(page)
    && extractCareersHandoffUrl(page) === CAREERS_LANDING_PAGE_URL
    && /Work with us/i.test(page)
}

export const hasOfficialCareersLandingSignal = (html) => {
  const page = String(html ?? '')

  return /spark magic/i.test(page)
    && /Global Job Search/i.test(page)
}

export const buildJobsPageUrl = (page = 1) => {
  const normalizedPage = Math.max(1, Number(page) || 1)
  return normalizedPage === 1 ? JOBS_PAGE_URL : `${JOBS_PAGE_URL}?page=${normalizedPage}`
}

export const hasOfficialJobsPageSignal = (html) => {
  const page = String(html ?? '')

  return /Job results \| Dr Reddy/i.test(page)
    && /attrax-vacancy-tile/i.test(page)
    && /(result\(s\)|jobs-results-page|attrax-pagination__container)/i.test(page)
}

export const hasOfficialDetailPageSignal = (html) => {
  const page = String(html ?? '')

  return /job in [^<]+ \| Dr Reddy/i.test(page)
    && (/jobad-jobdescription/i.test(page) || /aria-label=["']Job description["']/i.test(page))
    && /(jobApplyBtn|\/Workflow\?workflowId=)/i.test(page)
}

export const extractTotalPages = (html) => {
  const pageNumbers = [...String(html ?? '').matchAll(/pagination\((\d+)\)|(?:\?|&)page=(\d+)/gi)]
    .map((match) => Number.parseInt(match[1] || match[2], 10))
    .filter(Number.isFinite)

  if (!pageNumbers.length) {
    return splitJobCards(html).length ? 1 : 0
  }

  return Math.max(...pageNumbers)
}

export const extractSearchResults = (html) => splitJobCards(html)
  .map((cardHtml) => {
    const { title, sourceUrl } = extractTitleAndUrl(cardHtml)
    const fields = extractLabeledValues(cardHtml)
    const { location, city } = getNormalizedLocation(fields, cardHtml)
    const jobId = extractJobId(cardHtml, sourceUrl)

    if (!isIndiaCard(cardHtml, location)) return null
    if (!title || !sourceUrl || !location || !city || !jobId) return null

    return {
      title,
      company: COMPANY_NAME,
      department: getFirstFieldValue(fields, 'job family', 'department'),
      location,
      city,
      country: 'India',
      jobId,
      requisitionId: getFirstFieldValue(fields, 'reference', 'requisition id', 'req id') || jobId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: getFirstFieldValue(fields, 'type of working', 'job type', 'employment type'),
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: normalizeClosingDate(getFirstFieldValue(fields, 'expiry date', 'closing date')),
      jobDescription: getFirstFieldValue(fields, 'description'),
    }
  })
  .filter(Boolean)

export const extractJobDetail = (html, listing = {}) => {
  if (!hasOfficialDetailPageSignal(html)) {
    throw new Error('Dr. Reddy\'s verified detail page no longer matches the trusted first-party surface')
  }

  const descriptionWidgetHtml = extractDescriptionWidgetHtml(html)
  const qualificationsSectionHtml = extractQualificationsSectionHtml(html)

  return {
    ...listing,
    applyUrl: toAbsoluteUrl(
      /<a[^>]*href="([^"]*\/Workflow\?workflowId=[^"]+)"/i.exec(html)?.[1]
        || /<a[^>]*class="[^"]*jobApplyBtn[^"]*"[^>]*href="([^"]+)"/i.exec(html)?.[1],
    ) || listing.applyUrl,
    minimumQualification:
      extractSectionParagraphValue(qualificationsSectionHtml, 'Educational qualification')
      || listing.minimumQualification
      || null,
    experienceRequired:
      extractSectionParagraphValue(qualificationsSectionHtml, 'Minimum work Experience')
      || listing.experienceRequired
      || null,
    requiredSkills: extractListItems(qualificationsSectionHtml),
    jobDescription: normalizeWhitespace(descriptionWidgetHtml) || listing.jobDescription || null,
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  label: SOURCE,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  timeoutMs: 15000,
})

export const createDrReddysLaboratoriesScraper = ({
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY,
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  fetchText = defaultFetchText,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText: overrideFetchText, now: overrideNow } = {}) {
    const fetcher = overrideFetchText || fetchText
    const getTimestamp = overrideNow || now

    const homepageHtml = await fetcher(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Dr. Reddy\'s verified official homepage no longer matches the trusted first-party careers handoff')
    }

    if (extractCareersHandoffUrl(homepageHtml) !== CAREERS_LANDING_PAGE_URL) {
      throw new Error('Dr. Reddy\'s verified homepage careers handoff no longer points to the trusted first-party careers site')
    }

    const careersLandingHtml = await fetcher(CAREERS_LANDING_PAGE_URL)
    if (!hasOfficialCareersLandingSignal(careersLandingHtml)) {
      throw new Error('Dr. Reddy\'s verified careers landing page no longer matches the trusted first-party surface')
    }

    const firstPageHtml = await fetcher(buildJobsPageUrl(1))
    if (!hasOfficialJobsPageSignal(firstPageHtml)) {
      throw new Error('Dr. Reddy\'s verified jobs page no longer matches the trusted first-party Attrax surface')
    }

    const totalPages = extractTotalPages(firstPageHtml)
    const pageLimit = Math.min(totalPages || 1, maxPages)
    const jobs = []
    const seenJobIds = new Set()

    for (let page = 1; page <= pageLimit; page += 1) {
      const pageHtml = page === 1
        ? firstPageHtml
        : await fetcher(buildJobsPageUrl(page))

      if (!hasOfficialJobsPageSignal(pageHtml)) {
        throw new Error(`Dr. Reddy's verified jobs page ${page} no longer matches the trusted first-party Attrax surface`)
      }

      const listings = extractSearchResults(pageHtml)

      for (const listing of listings) {
        if (seenJobIds.has(listing.jobId)) continue
        seenJobIds.add(listing.jobId)

        const detailHtml = await fetcher(listing.sourceUrl)
        const job = extractJobDetail(detailHtml, listing)

        jobs.push({
          ...job,
          company: COMPANY_NAME,
          source: SOURCE,
          companyCareerPage: CAREERS_LANDING_PAGE_URL,
          companyDomain: COMPANY_DOMAIN,
          atsPlatform: 'first-party-attrax',
          link: job.applyUrl || job.sourceUrl,
          scrapedAt: getTimestamp(),
        })

        if (maxJobs && jobs.length >= maxJobs) {
          return jobs
        }
      }
    }

    return jobs
  },
})

export const run = async (options = {}) => createDrReddysLaboratoriesScraper().run(options)

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
