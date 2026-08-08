import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { AVENUE_SUPERMARTS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = AVENUE_SUPERMARTS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_PAGE_URL = PROVIDER_METADATA.companyCareerPage
export const SUCCESSFACTORS_BOARD_URL = PROVIDER_METADATA.successFactorsBoardUrl
export const SUCCESSFACTORS_SEARCH_URL = PROVIDER_METADATA.successFactorsSearchUrl
export const SUCCESSFACTORS_COMPANY_TOKEN = PROVIDER_METADATA.successFactorsCompanyToken
export const DETAIL_URL_PREFIX = `https://career10.successfactors.com/career?career_ns=job_listing&company=${SUCCESSFACTORS_COMPANY_TOKEN}&navBarLevel=JOB_SEARCH&rcm_site_locale=en_GB`

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const toIsoDate = (value) => {
  const normalized = normalizeWhitespace(value)
  const match = normalized?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)

  if (!match) return normalized

  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

export const buildDetailUrl = (requisitionId) =>
  `${DETAIL_URL_PREFIX}&career_job_req_id=${encodeURIComponent(String(requisitionId))}&selected_lang=en_GB&jobAlertController_jobAlertId=&jobAlertController_jobAlertName=&browserTimeZone=Asia/Calcutta`

export const buildSearchUrl = () => SUCCESSFACTORS_SEARCH_URL

export const extractSuccessFactorsHandoffUrl = (html) => {
  const match = String(html ?? '').match(/href=["'](https:\/\/career10\.successfactors\.com\/career\?company=avenuesupe)["']/i)
  return match ? match[1] : null
}

export const hasOfficialCareersPageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)
  const hasKnownTitle = /<title>\s*Careers\s*\|\s*DMart\s*<\/title>/i.test(rawHtml)
  const hasLegacyCareersCopy = /DMart is constantly expanding/i.test(normalized || '')
    && /CURRENT OPENINGS/i.test(normalized || '')
    && /Explore our current openings below\. Good Luck!/i.test(normalized || '')
  const hasCurrentFirstPartyNav = /About us/i.test(normalized || '')
    && /Partner with us/i.test(normalized || '')
    && /Investor Relations/i.test(normalized || '')

  return hasKnownTitle
    && (hasLegacyCareersCopy || hasCurrentFirstPartyNav)
}

export const hasSuccessFactorsSearchPageSignal = (html) => {
  const rawHtml = String(html ?? '')
  return /<title>\s*Career Opportunities\s*<\/title>/i.test(rawHtml)
    && /class="jobResultItem"/i.test(rawHtml)
    && new RegExp(`company=${SUCCESSFACTORS_COMPANY_TOKEN}`, 'i').test(rawHtml)
}

const hasNextPage = (html) => /<a[^>]+title="Next Page"[^>]*>/i.test(String(html ?? ''))

const buildLocation = ({ city, state }) => {
  const parts = [normalizeWhitespace(city), normalizeWhitespace(state), 'India'].filter(Boolean)
  return parts.join(', ') || 'India'
}

const parseRow = (rowHtml) => {
  const title = stripTags(rowHtml.match(/<a[^>]*class="jobTitle"[^>]*>([\s\S]*?)<\/a>/i)?.[1] || '')
  const values = [...String(rowHtml ?? '').matchAll(/<span class="jobContentEM">([\s\S]*?)<\/span>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)

  const requisitionId = normalizeWhitespace(values[0])
  const postingDate = toIsoDate(String(values[1] ?? '').replace(/^Posted on\s*/i, ''))
  const hiringEntity = normalizeWhitespace(values[2])
  const state = normalizeWhitespace(values[3])
  const city = normalizeWhitespace(values[4])
  const department = normalizeWhitespace(values[5])

  if (!title || !requisitionId) return null

  const detailUrl = buildDetailUrl(requisitionId)

  return {
    title,
    company: COMPANY_NAME,
    hiringEntity,
    department,
    location: buildLocation({ city, state }),
    city,
    state,
    country: 'India',
    jobId: requisitionId,
    requisitionId,
    sourceUrl: detailUrl,
    applyUrl: detailUrl,
    link: detailUrl,
    postingDate,
    jobDescription: null,
  }
}

export const extractSearchResults = (html) => {
  const rows = []

  for (const match of String(html ?? '').matchAll(/<tr[^>]*class="jobResultItem"[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = parseRow(match[1])
    if (row) rows.push(row)
  }

  return rows
}

const extractDescriptionFromText = (text) => {
  const normalized = normalizeWhitespace(text)
  if (!normalized) return null

  const explicitSection = normalized.match(/FUNCTION\s*:\s*[\s\S]+$/i)?.[0]
  if (explicitSection) {
    return normalizeWhitespace(
      explicitSection.replace(/\s*Apply Save Job Email Job to Friend Return to List\s*$/i, ''),
    )
  }

  return normalized
}

export const extractJobDetail = (html, listing = {}) => {
  const rawHtml = String(html ?? '')
  const bodyText = stripTags(rawHtml) || ''
  const detailSectionHtml = rawHtml.match(/<div[^>]*class="jobdescription"[^>]*>([\s\S]*?)<\/div>/i)?.[1]
  const title = normalizeWhitespace(
    (stripTags(rawHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || listing.title || '') || '')
      .replace(/^Career Opportunities:\s*/i, '')
      .replace(/\s*\(\d+\)\s*$/i, ''),
  )
  const requisitionId = normalizeWhitespace(
    bodyText.match(/\bRequisition ID\s*([0-9]+)\b/i)?.[1] || listing.requisitionId || listing.jobId,
  )
  const postingDate = toIsoDate(
    bodyText.match(/\bPosted\s*([0-9/]{10})\b/i)?.[1] || listing.postingDate,
  )
  const jobDescription = detailSectionHtml
    ? stripTags(detailSectionHtml)
    : extractDescriptionFromText(bodyText)

  return {
    title: title || listing.title || null,
    requisitionId,
    postingDate,
    applyUrl: buildDetailUrl(requisitionId || listing.requisitionId || listing.jobId),
    jobDescription: jobDescription || listing.jobDescription || null,
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  attempts: 3,
  baseDelayMs: 500,
  timeoutMs: 30000,
  label: `${SOURCE}-html`,
})

export const getLiveSearchPages = async ({
  fetchText = defaultFetchText,
  searchUrl = SUCCESSFACTORS_SEARCH_URL,
} = {}) => {
  const html = await fetchText(searchUrl)

  if (hasNextPage(html)) {
    throw new Error(
      'Avenue Supermarts API-only migration required: the verified SuccessFactors board requires pagination, but no HTTP pagination request contract is available; browser automation is disabled.',
    )
  }

  return [html]
}

const collectSummaryPages = (pages) => {
  const listings = []
  const seenRequisitionIds = new Set()

  if (!Array.isArray(pages) || pages.length === 0 || !hasSuccessFactorsSearchPageSignal(pages[0])) {
    throw new Error('Avenue Supermarts verified SuccessFactors search surface no longer matches the known public page')
  }

  for (const html of pages) {
    const pageJobs = extractSearchResults(html)

    for (const job of pageJobs) {
      if (seenRequisitionIds.has(job.requisitionId)) continue
      seenRequisitionIds.add(job.requisitionId)
      listings.push(job)
    }

  }

  return listings
}

export const createAvenueSupermartsScraper = ({
  fetchText = defaultFetchText,
  getSearchPages = (options = {}) => getLiveSearchPages({ ...options, fetchText }),
  now = () => new Date().toISOString(),
} = {}) => ({
  async run() {
    const careersHtml = await fetchText(CAREERS_PAGE_URL)
    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Avenue Supermarts verified DMart careers page no longer matches the known public surface')
    }

    const handoffUrl = extractSuccessFactorsHandoffUrl(careersHtml)
    if (handoffUrl !== SUCCESSFACTORS_BOARD_URL) {
      throw new Error('Avenue Supermarts verified DMart careers page no longer exposes the known SuccessFactors handoff')
    }

    const searchPages = await getSearchPages({ searchUrl: buildSearchUrl(), fetchText })
    const listings = collectSummaryPages(searchPages)
    const jobs = []

    for (const listing of listings) {
      const detailHtml = await fetchText(listing.sourceUrl)
      const detail = extractJobDetail(detailHtml, listing)

      jobs.push({
        ...listing,
        ...detail,
        source: SOURCE,
        company: COMPANY_NAME,
        country: 'India',
        companyCareerPage: CAREERS_PAGE_URL,
        companyDomain: PROVIDER_METADATA.companyDomain,
        atsPlatform: PROVIDER_METADATA.atsPlatform,
        link: detail.applyUrl || listing.applyUrl || listing.sourceUrl,
        scrapedAt: now(),
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createAvenueSupermartsScraper(options).run()

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
