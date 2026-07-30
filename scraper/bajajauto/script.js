import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { BAJAJ_AUTO_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = BAJAJ_AUTO_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_AT = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_HUB_URL = PROVIDER_METADATA.careersHubUrl
export const CAREERS_HUB_FINAL_URL = PROVIDER_METADATA.careersHubFinalUrl
export const SEARCH_RESULTS_URL = PROVIDER_METADATA.companyCareerPage
export const CAREER_HEADER_SCRIPT_URL = PROVIDER_METADATA.careerHeaderScriptUrl
export const REQUISITIONS_API_URL = PROVIDER_METADATA.requisitionsApiUrl
export const JOB_TYPES_API_URL = PROVIDER_METADATA.jobTypesApiUrl
export const APPLICATION_TRACKING_URL = PROVIDER_METADATA.applicationTrackingUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/&#8212;|&mdash;/gi, '-')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0|\u202f/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTagsToText = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(td|th|tr|p|div|li|ul|ol|h[1-6])>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const extractTitle = (html = '') =>
  normalizeWhitespace(String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1])

const toAbsoluteUrl = (value, baseUrl = SEARCH_RESULTS_URL) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const toIsoDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return null

  return date.toISOString().slice(0, 10)
}

const normalizeExperience = (record = {}) => {
  const explicit = normalizeWhitespace(record.cust_experience)
  if (explicit) return explicit

  const min = normalizeWhitespace(record.custMinexperience)
  const max = normalizeWhitespace(record.custMaxExperience)

  if (min && max) return `${min}-${max} years`
  if (min) return `${min}+ years`

  return null
}

const sanitizeJobSlug = (value) => String(value ?? '')
  .replaceAll('_', '-')
  .replaceAll('#', '-')
  .replaceAll('|', '')
  .replaceAll('--', '-')
  .trim()

const buildLocationParts = (...values) => {
  const seen = new Set()
  const parts = []

  for (const value of values) {
    const normalized = normalizeWhitespace(value)
    if (!normalized) continue

    const key = normalized.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    parts.push(normalized)
  }

  return parts
}

export const hasOfficialHomepageSignal = (html = '') => {
  const page = String(html ?? '')
  const title = extractTitle(page)

  return /^Bajaj Auto - Bikes, Scooters, Three Wheelers & Qute(?: \(2026\))?$/i.test(title || '')
    && /href=["'](?:https:\/\/www\.bajajauto\.com)?\/careers["']/i.test(page)
}

export const hasOfficialCareersHubSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTagsToText(page)
  const title = extractTitle(page)

  return /^Why Work With Bajaj Auto(?:\s*[-–—]\s*Careers & Opportunities)?$/i.test(title || '')
    && /Select your preferences to find a job/i.test(text || '')
    && /href=["'](?:https:\/\/www\.bajajauto\.com)?\/careers\/search-result["']/i.test(page)
}

export const hasSearchResultsSurfaceSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTagsToText(page)
  const title = extractTitle(page)

  return /^Bajaj Auto Careers(?:\s*[-–—]\s*Explore Latest Job Openings)?$/i.test(title || '')
    && /id=["']div_jobRequisitions["']/i.test(page)
    && /id=["']pagin["']/i.test(page)
    && /career-header\.js\?v=\d+/i.test(page)
    && /fnGetJobFamilyWithExperience\(\)/i.test(page)
    && /Showing latest job postings/i.test(text || '')
}

export const hasVerifiedCareerHeaderContract = (script = '') => {
  const value = String(script ?? '')

  return /\/handlers\/careers\/get-requisitions\.ashx/i.test(value)
    && /\/handlers\/careers\/get-job-types\.ashx/i.test(value)
    && /portal\s*=\s*"careers"/i.test(value)
    && /fnBindRequisitions/i.test(value)
    && /\+\s*portal\s*\+\s*["']\/job\//i.test(value)
}

export const hasVerifiedJobRequisitionsPayload = (payload) =>
  Array.isArray(payload?.jobRequisitions)
  && Array.isArray(payload?.CustExperience)
  && payload.jobRequisitions.every((record) => record && typeof record === 'object')

export const hasVerifiedJobTypesPayload = (payload) =>
  Array.isArray(payload?.jobCategories)
  && payload.jobCategories.every((category) => category && typeof category === 'object')

export const hasOfficialJobDetailShellSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTagsToText(page)

  return /Apply Now/i.test(text || '')
    && /fnSubmitApplyNow\(\)/i.test(page)
    && /id=["']jobRequisitionId["']/i.test(page)
    && /career-header\.js\?v=\d+/i.test(page)
    && page.includes(APPLICATION_TRACKING_URL)
}

export const buildDetailUrl = (record = {}) => {
  const requisitionId = normalizeWhitespace(record.jobReqId)
  const jobSlug = sanitizeJobSlug(record.jobUrl)
  if (!requisitionId || !jobSlug) return null

  return toAbsoluteUrl(`/careers/job/${jobSlug}/${requisitionId}`, SEARCH_RESULTS_URL)
}

export const extractLocationHintFromDescription = (html = '') => {
  const page = String(html ?? '')
  const match = page.match(
    /(?:Plant\s*\/\s*RO|Location)\s*<\/td>\s*<td[^>]*>\s*([^<]+?)\s*<\/td>/i,
  )

  return normalizeWhitespace(match?.[1])
}

export const mapJobRecordToJob = (record = {}, { scrapedAt = new Date().toISOString() } = {}) => {
  const title = normalizeWhitespace(record.jobTitle)
  const requisitionId = normalizeWhitespace(record.jobReqId)
  const sourceUrl = buildDetailUrl(record)
  const country = normalizeWhitespace(record.country) || 'India'
  const city =
    extractLocationHintFromDescription(record.jobDescription)
    || normalizeWhitespace(record.location)
    || null
  const location = buildLocationParts(city, record.State, country).join(', ') || country

  if (!title || !requisitionId || !sourceUrl) {
    return null
  }

  return {
    title,
    company: COMPANY,
    department: normalizeWhitespace(record.custjobRole) || normalizeWhitespace(record.custjobFamily),
    location,
    city,
    country,
    sourceUrl,
    applyUrl: sourceUrl,
    jobId: `${SOURCE}-${requisitionId}`,
    requisitionId,
    employmentType: normalizeWhitespace(record.jobType),
    workplaceType: null,
    experienceRequired: normalizeExperience(record),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    compensation: null,
    postingDate: toIsoDate(record.postStartDate || record.createdDateTime || record.jobStartDate),
    closingDate: toIsoDate(record.postEndDate),
    jobDescription: stripTagsToText(record.jobDescription),
    source: SOURCE,
    companyCareerPage: SEARCH_RESULTS_URL,
    companyDomain: PROVIDER_METADATA.companyDomain,
    atsPlatform: PROVIDER_METADATA.atsPlatform,
    link: sourceUrl,
    scrapedAt,
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

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/plain,text/javascript,application/javascript,*/*;q=0.8',
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

const isIndiaOpenRecord = (record = {}) =>
  /open/i.test(normalizeWhitespace(record.status) || '')
  && /india/i.test(normalizeWhitespace(record.country) || 'India')

export const createBajajAutoScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
  } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Bajaj Auto verified homepage no longer matches the known first-party surface')
    }

    const careersHub = await fetchPage(CAREERS_HUB_URL)
    if (
      careersHub.status !== 200
      || careersHub.url !== CAREERS_HUB_FINAL_URL
      || !hasOfficialCareersHubSignal(careersHub.html)
    ) {
      throw new Error('Bajaj Auto verified careers hub no longer matches the known first-party handoff')
    }

    const searchResultsPage = await fetchPage(SEARCH_RESULTS_URL)
    if (
      searchResultsPage.status !== 200
      || searchResultsPage.url !== SEARCH_RESULTS_URL
      || !hasSearchResultsSurfaceSignal(searchResultsPage.html)
    ) {
      throw new Error('Bajaj Auto verified search results page no longer matches the known first-party jobs surface')
    }

    const careerHeaderBundle = await fetchText(CAREER_HEADER_SCRIPT_URL)
    if (!hasVerifiedCareerHeaderContract(careerHeaderBundle)) {
      throw new Error('Bajaj Auto verified career header bundle no longer matches the known first-party jobs contract')
    }

    const requisitionsPayload = await fetchJson(REQUISITIONS_API_URL)
    if (!hasVerifiedJobRequisitionsPayload(requisitionsPayload)) {
      throw new Error('Bajaj Auto verified requisitions api no longer matches the known public response contract')
    }

    const jobTypesPayload = await fetchJson(JOB_TYPES_API_URL)
    if (!hasVerifiedJobTypesPayload(jobTypesPayload)) {
      throw new Error('Bajaj Auto verified job types api no longer matches the known public response contract')
    }

    const jobs = requisitionsPayload.jobRequisitions
      .filter(isIndiaOpenRecord)
      .map((record) => mapJobRecordToJob(record, { scrapedAt: now() }))
      .filter(Boolean)

    if (jobs.length === 0) {
      return []
    }

    const detailShell = await fetchPage(jobs[0].sourceUrl)
    if (detailShell.status !== 200 || !hasOfficialJobDetailShellSignal(detailShell.html)) {
      throw new Error('Bajaj Auto verified detail shell no longer matches the known public apply surface')
    }

    return jobs
  },
})

export const run = async (options = {}) => createBajajAutoScraper().run(options)

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
