import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { FULLERTON_INDIA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = FULLERTON_INDIA_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_AT = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const REDIRECTED_HOMEPAGE_URL = PROVIDER_METADATA.redirectedHomepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const JOBS_BOARD_ENTRY_URL = PROVIDER_METADATA.jobsBoardEntryUrl
export const JOBS_BOARD_URL = PROVIDER_METADATA.jobsBoardUrl
export const JOBS_API_URL = PROVIDER_METADATA.jobsApiUrl
export const JOBS_API_BODY = {
  JDFileName: '',
  OrgCode: '',
  KeyName: '',
}

const WORKLINE_ORIGIN = new URL(JOBS_BOARD_URL).origin

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const MONTHS = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(value)
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripTagsToText = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|button|a)>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const normalizeField = (value) => normalizeWhitespace(value) || null

const toAbsoluteUrl = (value, baseUrl = JOBS_BOARD_URL) => {
  if (!value) return null

  try {
    return new URL(decodeHtmlEntities(value), baseUrl).toString()
  } catch {
    return null
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

const defaultFetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
      ...(options.headers || {}),
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

const normalizeDate = (value) => {
  const normalized = normalizeField(value)
  if (!normalized) return null

  const match = normalized.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/)
  if (!match) return null

  const [, day, monthText, year] = match
  const month = MONTHS[monthText.toLowerCase()]
  if (!month) return null

  return `${year}-${month}-${day.padStart(2, '0')}`
}

const uniqueParts = (parts) => {
  const seen = new Set()
  const output = []

  for (const value of parts) {
    const normalized = normalizeField(value)
    if (!normalized) continue

    const key = normalized.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    output.push(normalized)
  }

  return output
}

const buildLocation = (record) => {
  const country = normalizeField(record?.Country_Name) || 'India'
  const locationName = normalizeField(record?.LOCATIONNAME || record?.Field2)
  const state = normalizeField(record?.State_Name)
  const parts = uniqueParts([locationName, state, country])

  return parts.length > 0 ? parts.join(', ') : country
}

const buildJobDescription = (record) => {
  const lines = [
    normalizeField(record?.Business_Name)
      ? `Business: ${normalizeField(record.Business_Name)}`
      : null,
    normalizeField(record?.Field1)
      ? `Line of business: ${normalizeField(record.Field1)}`
      : null,
    normalizeField(record?.FunName)
      ? `Function: ${normalizeField(record.FunName)}`
      : null,
    normalizeField(record?.LOCATIONNAME)
      ? `Location: ${normalizeField(record.LOCATIONNAME)}`
      : null,
    normalizeField(record?.GradeName)
      ? `Grade: ${normalizeField(record.GradeName)}`
      : null,
    Number.isFinite(Number(record?.No_Of_Vacancies))
      ? `Open positions: ${Number(record.No_Of_Vacancies)}`
      : null,
    normalizeField(record?.PublishDate)
      ? `Posted: ${normalizeField(record.PublishDate)}`
      : null,
  ].filter(Boolean)

  return lines.length > 0 ? lines.join('\n') : null
}

const getTrackToken = (recordOrTrackToken) => {
  if (typeof recordOrTrackToken === 'string') {
    return normalizeField(recordOrTrackToken)
  }

  return normalizeField(recordOrTrackToken?.TrackToken)
}

const getSearchKeyword = (record) => normalizeField(record?.SearchKeyWord)

const isIndiaListingRecord = (record) => {
  const country = normalizeField(record?.Country_Name)
  return !country || /\bindia\b/i.test(country)
}

export const hasOfficialHomepageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTagsToText(page)

  return /<title>\s*SMFG India Credit: Leading Financial Company for Loans\s*<\/title>/i.test(page)
    && /\bSMFG India Credit\b/i.test(text)
    && /href=["']https:\/\/www\.smfgindiacredit\.com\/careers\.aspx["']/i.test(page)
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTagsToText(page)

  return /<title>\s*SMFG India Credit Careers - Current Job Openings & Employee Testimonials\s*<\/title>/i.test(page)
    && /Careers - SMFG India Credit/i.test(text)
    && /Explore Jobs/i.test(text)
    && /Upload Your Profile/i.test(text)
    && /app52\.workline\.hr\/Candidate\/GeneralOpening\.aspx/i.test(page)
}

export const extractJobsBoardEntryUrl = (html = '') => {
  const match = String(html ?? '').match(
    /href=["']([^"']*app52\.workline\.hr\/Candidate\/GeneralOpening\.aspx[^"']*)["']/i,
  )

  return toAbsoluteUrl(match?.[1], CAREERS_URL)
}

export const hasOfficialJobsBoardSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTagsToText(page)

  return /<title>\s*SMFG - Workline - Possibilities Infinite\s*<\/title>/i.test(page)
    && /Begin your search for greater opportunities/i.test(text)
    && /\bSearch Jobs\b/i.test(text)
    && /\bPost Resume\b/i.test(text)
    && /(GeneralOpenings\.js|GetCurrentopening)/i.test(page)
}

export const hasVerifiedJobsPayloadContract = (payload) => {
  if (typeof payload?.d?.obj1 !== 'string' || typeof payload?.d?.obj2 !== 'string') {
    return false
  }

  try {
    return Array.isArray(JSON.parse(payload.d.obj1))
  } catch {
    return false
  }
}

export const extractListingRecords = (payload) => {
  if (!hasVerifiedJobsPayloadContract(payload)) {
    throw new Error('Fullerton India verified jobs api no longer matches the known public response contract')
  }

  return JSON.parse(payload.d.obj1).filter((record) => record && typeof record === 'object')
}

export const buildDetailUrl = (record = {}) => {
  const trackToken = getTrackToken(record)
  const searchKeyword = getSearchKeyword(record)

  if (!trackToken || !searchKeyword) return null

  return `${WORKLINE_ORIGIN}/CandidatePortal/${trackToken}/${encodeURIComponent(searchKeyword)}`
}

export const buildApplyUrl = (recordOrTrackToken) => {
  const trackToken = getTrackToken(recordOrTrackToken)
  if (!trackToken) return null

  return `${WORKLINE_ORIGIN}/Candidate/SignInv1.aspx?PRFCode=${encodeURIComponent(trackToken)}&Flag=C&DirectApply=1`
}

export const mapListingRecordToJob = (record, { scrapedAt = new Date().toISOString() } = {}) => {
  const title = normalizeField(record?.Position_Name)
  const requisitionId = normalizeField(record?.Req_No)
  const sourceUrl = buildDetailUrl(record)
  const applyUrl = buildApplyUrl(record)
  const city = normalizeField(record?.LOCATIONNAME || record?.Field2)

  if (!title || !requisitionId || !sourceUrl || !applyUrl) {
    return null
  }

  return {
    title,
    company: COMPANY,
    department: normalizeField(record?.FunName) || normalizeField(record?.Field1),
    location: buildLocation(record),
    city,
    country: normalizeField(record?.Country_Name) || 'India',
    sourceUrl,
    applyUrl,
    jobId: `${SOURCE}-${requisitionId}`,
    requisitionId,
    employmentType: null,
    workplaceType: null,
    experienceRequired: normalizeField(record?.Experience),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    compensation: null,
    postingDate: normalizeDate(record?.PublishDate),
    closingDate: null,
    jobDescription: buildJobDescription(record),
    source: SOURCE,
    companyCareerPage: CAREERS_URL,
    companyDomain: PROVIDER_METADATA.companyDomain,
    atsPlatform: PROVIDER_METADATA.atsPlatform,
    link: applyUrl,
    scrapedAt,
  }
}

export const createFullertonIndiaScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchPage = defaultFetchPage, fetchJson = defaultFetchJson } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (
      homepage.status !== 200
      || homepage.url !== REDIRECTED_HOMEPAGE_URL
      || !hasOfficialHomepageSignal(homepage.html)
    ) {
      throw new Error('Fullerton India verified official homepage no longer matches the known public surface')
    }

    const careersPage = await fetchPage(CAREERS_URL)
    const jobsBoardEntryUrl = extractJobsBoardEntryUrl(careersPage.html)
    if (
      careersPage.status !== 200
      || !hasOfficialCareersSignal(careersPage.html)
      || jobsBoardEntryUrl !== JOBS_BOARD_ENTRY_URL
    ) {
      throw new Error('Fullerton India verified careers page no longer matches the known first-party handoff')
    }

    const jobsBoard = await fetchPage(JOBS_BOARD_ENTRY_URL)
    if (
      jobsBoard.status !== 200
      || jobsBoard.url !== JOBS_BOARD_URL
      || !hasOfficialJobsBoardSignal(jobsBoard.html)
    ) {
      throw new Error('Fullerton India verified jobs board no longer matches the known public Workline surface')
    }

    const payload = await fetchJson(JOBS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        Origin: WORKLINE_ORIGIN,
        Referer: JOBS_BOARD_URL,
      },
      body: JSON.stringify(JOBS_API_BODY),
    })

    if (!hasVerifiedJobsPayloadContract(payload)) {
      throw new Error('Fullerton India verified jobs api no longer matches the known public response contract')
    }

    const scrapedAt = now()

    return extractListingRecords(payload)
      .filter(isIndiaListingRecord)
      .map((record) => mapListingRecordToJob(record, { scrapedAt }))
      .filter(Boolean)
  },
})

export const run = async (options = {}) => createFullertonIndiaScraper().run(options)

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
