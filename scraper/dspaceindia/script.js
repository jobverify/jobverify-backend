import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import DSPACE_INDIA_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = DSPACE_INDIA_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_LANDING_URL = PROVIDER_METADATA.officialCareersLandingUrl
export const CURRENT_POSITIONS_URL = PROVIDER_METADATA.companyCareerPage
export const JOB_FINDER_ENTRY_URL = PROVIDER_METADATA.jobFinderEntryUrl
export const INDIA_COUNTRY_FILTER_TERM = PROVIDER_METADATA.indiaCountryFilterTerm
export const INDIA_LOCATION_FILTER_TERM = PROVIDER_METADATA.indiaLocationFilterTerm
export const APPLICATION_EMAIL = PROVIDER_METADATA.applicationEmail
export const COMPANY_DOMAIN = PROVIDER_METADATA.companyDomain

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const JOBS_BASE_URL = `https://www.${COMPANY_DOMAIN}`

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&ndash;|&#8211;/gi, '-')
  .replace(/&mdash;|&#8212;/gi, '-')
  .replace(/&reg;/gi, '')
  .replace(/&trade;/gi, '')

const decodeRepeatedHtmlEntities = (value, maxPasses = 4) => {
  let current = String(value ?? '')

  for (let index = 0; index < maxPasses; index += 1) {
    const decoded = decodeHtmlEntities(current)
    if (decoded === current) break
    current = decoded
  }

  return current.replace(/\u00a0/g, ' ').trim()
}

const stripTags = (value) =>
  normalizeWhitespace(
    String(value ?? '')
      .replace(/<(br|\/p|\/div|\/li|\/ul|\/ol|\/h[1-6]|\/section)\b[^>]*>/gi, '\n')
      .replace(/<(p|div|li|ul|ol|h[1-6]|section)\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const extractJsonAttribute = (html, attributeName) => {
  const match = new RegExp(
    `${escapeRegex(attributeName)}\\s*=\\s*'(?<json>[\\s\\S]*?)'`,
    'i',
  ).exec(String(html ?? ''))

  if (!match?.groups?.json) {
    throw new Error(`dSpace India verified current positions page no longer exposes ${attributeName}`)
  }

  const decoded = decodeRepeatedHtmlEntities(match.groups.json)

  try {
    return JSON.parse(decoded)
  } catch {
    throw new Error(`dSpace India verified current positions page no longer exposes parseable ${attributeName}`)
  }
}

const getGroupFilters = (filterSections, groupId) =>
  Array.isArray(filterSections?.default?.groups)
    ? filterSections.default.groups.find((group) => group?.id === groupId)?.filters ?? []
    : []

const findCountryFilterTerm = (filterSections) => {
  const countryFilter = getGroupFilters(filterSections, 'country')
    .find((filter) => normalizeWhitespace(filter?.name) === 'India')

  if (!countryFilter?.value || countryFilter.value !== INDIA_COUNTRY_FILTER_TERM) {
    throw new Error('dSpace India verified current positions page no longer exposes the pinned India filter')
  }

  return countryFilter.value
}

const findLocationFilterTerm = (filterSections) => {
  const locationFilter = getGroupFilters(filterSections, 'location')
    .find((filter) => normalizeWhitespace(filter?.name) === PROVIDER_METADATA.indiaLocationName)

  if (!locationFilter?.value || locationFilter.value !== INDIA_LOCATION_FILTER_TERM) {
    throw new Error('dSpace India verified current positions page no longer exposes the pinned Trivandrum location filter')
  }

  return locationFilter.value
}

const lookupFilterNames = (filters = [], filterTerms = []) => filters
  .filter((filter) => filterTerms.includes(filter?.value))
  .map((filter) => normalizeWhitespace(filter?.name))
  .filter(Boolean)

const extractJobIdFromUrl = (url) => {
  try {
    return normalizeWhitespace(new URL(url).searchParams.get('jid'))
  } catch {
    return null
  }
}

const deriveCity = (location) => {
  const normalizedLocation = normalizeWhitespace(location)
  if (!normalizedLocation) return null

  return normalizeWhitespace(normalizedLocation.split(',')[0])
}

const normalizeCountry = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return 'India'
  if (/^IN$/i.test(normalized)) return 'India'
  return normalized
}

const buildIndiaLocation = (location) => {
  const normalizedLocation = normalizeWhitespace(location)
  if (!normalizedLocation) return 'India'
  if (/,\s*India$/i.test(normalizedLocation)) return normalizedLocation
  return `${normalizedLocation}, India`
}

const inferRemoteStatus = ({ location, description }) => {
  const haystack = [location, description].filter(Boolean).join(' | ')

  if (/\bhybrid\b/i.test(haystack)) return 'Hybrid'
  if (/\bremote\b/i.test(haystack)) return 'Remote'
  return 'On-site'
}

const extractExperienceRequired = (description) => {
  const normalizedDescription = normalizeWhitespace(description)
  if (!normalizedDescription) return null

  const explicitYears = normalizedDescription.match(/\b(?:minimum of|at least)\s+(\d+)\s+years?\b/i)
  if (explicitYears) return `${explicitYears[1]} years`

  const rangeMatch = normalizedDescription.match(/\b(\d+\s*-\s*\d+\s*years?)\b/i)
  if (rangeMatch) return normalizeWhitespace(rangeMatch[1])?.toLowerCase()

  const plusMatch = normalizedDescription.match(/\b(\d+\+\s*years?)\b/i)
  if (plusMatch) return normalizeWhitespace(plusMatch[1])?.toLowerCase()

  return null
}

export const buildAbsoluteUrl = (value) => {
  try {
    return new URL(String(value ?? ''), JOBS_BASE_URL).toString()
  } catch {
    return null
  }
}

export const hasOfficialCareersLandingSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Career\s*-\s*dSPACE\s*<\/title>/i.test(page)
    && /Shape the future of mobility with us/i.test(page)
    && /href=["'][^"']*\/en\/pub\/home\/career\/jobfinder\.cfm["']/i.test(page)
    && /Job Finder/i.test(page)
    && /Professionals/i.test(page)
}

export const hasVerifiedCurrentPositionsSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Current Positions\s*-\s*dSPACE\s*<\/title>/i.test(page)
    && /https:\/\/www\.dspace\.com\/en\/pub\/home\/career\/jobfinder\/stellen\.cfm/i.test(page)
    && /Job Finder/i.test(page)
    && /Current Positions/i.test(page)
    && /:filter-sections=/i.test(page)
    && /:results-data=/i.test(page)
    && /term-land-9/i.test(page)
    && /term-ort-1031/i.test(page)
}

export const extractIndiaJobsFromListingHtml = (
  html,
  {
    scrapedAt = new Date().toISOString(),
  } = {},
) => {
  if (!hasVerifiedCurrentPositionsSignal(html)) {
    throw new Error('dSpace India verified current positions page no longer matches the official first-party surface')
  }

  const filterSections = extractJsonAttribute(html, ':filter-sections')
  const resultsData = extractJsonAttribute(html, ':results-data')

  if (!Array.isArray(resultsData)) {
    throw new Error('dSpace India verified current positions page no longer exposes the expected results array')
  }

  const countryFilterTerm = findCountryFilterTerm(filterSections)
  findLocationFilterTerm(filterSections)

  const employmentTypeFilters = getGroupFilters(filterSections, 'employment_type')
  const tradeFilters = getGroupFilters(filterSections, 'trade')

  return resultsData
    .filter((job) => Array.isArray(job?.filterterms) && job.filterterms.includes(countryFilterTerm))
    .map((job) => {
      const sourceUrl = buildAbsoluteUrl(job?.href)
      const title = normalizeWhitespace(job?.title)
      const location = buildIndiaLocation(job?.location)
      const departmentNames = lookupFilterNames(tradeFilters, job?.filterterms ?? [])
      const employmentTypeNames = lookupFilterNames(employmentTypeFilters, job?.filterterms ?? [])
      const jobId = extractJobIdFromUrl(sourceUrl)
      const requisitionId = normalizeWhitespace(job?.code)

      if (!title || !sourceUrl || !jobId || !requisitionId) {
        throw new Error('dSpace India verified current positions page no longer matches the expected listing contract')
      }

      return {
        title,
        company: COMPANY,
        location,
        city: deriveCity(location),
        state: null,
        country: 'India',
        sourceUrl,
        applyUrl: sourceUrl,
        link: sourceUrl,
        source: SOURCE,
        jobId,
        requisitionId,
        department: departmentNames.join(', ') || null,
        employmentType: employmentTypeNames.join(', ') || null,
        experienceRequired: null,
        jobDescription: normalizeWhitespace(job?.description),
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        remoteStatus: inferRemoteStatus({
          location,
          description: job?.description,
        }),
        applicationEmail: APPLICATION_EMAIL,
        companyCareerPage: CURRENT_POSITIONS_URL,
        companyDomain: COMPANY_DOMAIN,
        atsPlatform: PROVIDER_METADATA.atsPlatform,
        scrapedAt,
      }
    })
}

export const extractJobPostingJsonLd = (html) => {
  const matches = String(html ?? '').matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )

  for (const match of matches) {
    const rawJson = normalizeWhitespace(match[1])
    if (!rawJson) continue

    try {
      const parsed = JSON.parse(rawJson)
      const candidates = Array.isArray(parsed) ? parsed : [parsed]
      const jobPosting = candidates.find((item) => normalizeWhitespace(item?.['@type']) === 'JobPosting')

      if (jobPosting) return jobPosting
    } catch {
      continue
    }
  }

  throw new Error('dSpace India detail page no longer exposes the expected JobPosting JSON-LD')
}

export const extractJobDetail = (
  html,
  baseJob,
  {
    scrapedAt = new Date().toISOString(),
  } = {},
) => {
  const jobPosting = extractJobPostingJsonLd(html)
  const title = normalizeWhitespace(jobPosting?.title)
  const requisitionId = normalizeWhitespace(jobPosting?.identifier?.value || jobPosting?.identifier)
  const country = normalizeCountry(jobPosting?.jobLocation?.address?.addressCountry)
  const locality = normalizeWhitespace(jobPosting?.jobLocation?.address?.addressLocality) || deriveCity(baseJob?.location)
  const location = buildIndiaLocation(locality || baseJob?.location)
  const description = stripTags(decodeRepeatedHtmlEntities(jobPosting?.description))
  const applicationEmailMatch = /mailto:([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i.exec(String(html ?? ''))
  const applicationEmail = normalizeWhitespace(applicationEmailMatch?.[1])

  if (!title || title !== baseJob.title) {
    throw new Error('dSpace India detail page no longer matches the verified job title contract')
  }

  if (requisitionId && baseJob?.requisitionId && requisitionId !== baseJob.requisitionId) {
    throw new Error('dSpace India detail page no longer matches the verified requisition contract')
  }

  if (!applicationEmail || applicationEmail.toLowerCase() !== APPLICATION_EMAIL.toLowerCase()) {
    throw new Error('dSpace India detail page no longer exposes the verified application email')
  }

  return {
    ...baseJob,
    title,
    location,
    city: deriveCity(location),
    state: null,
    country,
    sourceUrl: baseJob.sourceUrl,
    applyUrl: baseJob.sourceUrl,
    link: baseJob.sourceUrl,
    applicationEmail,
    employmentType: normalizeWhitespace(
      Array.isArray(jobPosting?.employmentType)
        ? jobPosting.employmentType[0]
        : jobPosting?.employmentType,
    ),
    experienceRequired: extractExperienceRequired(description),
    postingDate: normalizeWhitespace(jobPosting?.datePosted),
    jobDescription: description,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    remoteStatus: inferRemoteStatus({
      location,
      description,
    }),
    scrapedAt,
  }
}

export const createDSpaceIndiaScraper = ({
  maxJobs = null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const careersLandingHtml = await fetchText(CAREERS_LANDING_URL)
    if (!hasOfficialCareersLandingSignal(careersLandingHtml)) {
      throw new Error('dSpace India verified dSPACE careers landing page no longer matches the official first-party surface')
    }

    const currentPositionsHtml = await fetchText(CURRENT_POSITIONS_URL)
    const scrapedAt = now()
    const baseJobs = extractIndiaJobsFromListingHtml(currentPositionsHtml, { scrapedAt })
    const jobs = []

    for (const baseJob of baseJobs) {
      const detailHtml = await fetchText(baseJob.sourceUrl)
      jobs.push(extractJobDetail(detailHtml, baseJob, { scrapedAt }))
    }

    return Number.isFinite(maxJobs) ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async (options = {}) => createDSpaceIndiaScraper(options).run(options)

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
