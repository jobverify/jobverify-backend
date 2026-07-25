import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { LT_FINANCE_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = LT_FINANCE_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const JOBS_BOARD_URL = PROVIDER_METADATA.jobsBoardUrl
export const JOBS_API_URL = PROVIDER_METADATA.jobsApiUrl
export const JOBS_API_BODY = {
  JDFileName: '',
  OrgCode: '',
  KeyName: '',
  Type: 'D',
  StateCode: '',
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const WORKLINE_ORIGIN = new URL(JOBS_BOARD_URL).origin

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

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTagsToText(page)

  return /shape your future with us/i.test(text)
    && /current openings/i.test(text)
    && /https:\/\/myltfs\.ltfs\.com\/CPortal\/GeneralOpening\.aspx/i.test(page)
}

export const extractJobsBoardUrl = (html = '') => {
  const match = String(html ?? '').match(
    /href=["'](https:\/\/myltfs\.ltfs\.com\/CPortal\/GeneralOpening\.aspx[^"']*)["']/i,
  )

  return match?.[1] ?? null
}

export const hasOfficialJobsBoardSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTagsToText(page)

  return /<title>\s*LTFS - Workline - Possibilities Infinite\s*<\/title>/i.test(page)
    && /begin your search for greater opportunities/i.test(text)
    && /\bsearch jobs\b/i.test(text)
    && /\bpost resume\b/i.test(text)
    && /(GeneralOpenings7\.js|GeneralOpenings\.js|GetCurrentopening)/i.test(page)
}

export const hasVerifiedJobsPayloadContract = (payload) => {
  if (typeof payload?.d?.obj1 !== 'string') {
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
    throw new Error('L&T Finance verified jobs api no longer matches the known public response contract')
  }

  return JSON.parse(payload.d.obj1).filter((record) => record && typeof record === 'object')
}

const getTrackToken = (record) => normalizeField(record?.TrackToken)

const getSearchKeyword = (record) => normalizeField(record?.SearchKeyWord)

const buildLocation = (record = {}) => {
  const parts = uniqueParts([
    record.LOCATIONNAME ?? record.Field2,
    record.State ?? record.state_name,
    record.Country_Name ?? 'India',
  ])

  return parts.length > 0 ? parts.join(', ') : 'India'
}

const extractCity = (record = {}) => normalizeField(
  record.City_Name
    ?? record.City
    ?? record.LOCATIONNAME
    ?? record.Field2,
)

const buildJobDescription = (record = {}) => {
  const lines = [
    normalizeField(record.Company_Name)
      ? `Platform: ${normalizeField(record.Company_Name)}`
      : null,
    normalizeField(record.FunctionName)
      ? `Business unit: ${normalizeField(record.FunctionName)}`
      : null,
    normalizeField(record.FunName)
      ? `Function: ${normalizeField(record.FunName)}`
      : null,
    normalizeField(record.LOCATIONNAME ?? record.Field2)
      ? `Location: ${normalizeField(record.LOCATIONNAME ?? record.Field2)}`
      : null,
    extractCity(record)
      ? `City: ${extractCity(record)}`
      : null,
    Number.isFinite(Number(record.No_Of_Vacancies))
      ? `Open positions: ${Number(record.No_Of_Vacancies)}`
      : null,
    normalizeField(record.PublishDate)
      ? `Posted: ${normalizeField(record.PublishDate)}`
      : null,
  ].filter(Boolean)

  return lines.length > 0 ? lines.join('\n') : null
}

const isIndiaListingRecord = (record = {}) => {
  const country = normalizeField(record.Country_Name)
  return !country || /\bindia\b/i.test(country)
}

export const buildDetailUrl = (record = {}) => {
  const trackToken = getTrackToken(record)
  const searchKeyword = getSearchKeyword(record)

  if (!trackToken || !searchKeyword) return null

  return `${WORKLINE_ORIGIN}/CandidatePortal/${trackToken}/${encodeURIComponent(searchKeyword)}`
}

export const mapListingRecordToJob = (record, { scrapedAt = new Date().toISOString() } = {}) => {
  const title = normalizeField(record?.Position_Name)
  const sourceUrl = buildDetailUrl(record)
  const jobId = normalizeField(record?.ERF_Code ?? record?.ERFCode ?? record?.PRFCode)
  const requisitionId = normalizeField(record?.Req_No)

  if (!title || !sourceUrl || !jobId || !requisitionId) {
    return null
  }

  return {
    title,
    company: COMPANY,
    department: normalizeField(record?.FunName)
      || normalizeField(record?.FunctionName)
      || normalizeField(record?.Field1),
    location: buildLocation(record),
    city: extractCity(record),
    country: normalizeField(record?.Country_Name) || 'India',
    sourceUrl,
    applyUrl: sourceUrl,
    jobId: `${SOURCE}-${jobId}`,
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
    link: sourceUrl,
    scrapedAt,
  }
}

export const createLtFinanceScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchPage = defaultFetchPage, fetchJson = defaultFetchJson } = {}) {
    const careersPage = await fetchPage(CAREERS_URL)
    const jobsBoardUrl = extractJobsBoardUrl(careersPage.html)

    if (
      careersPage.status !== 200
      || careersPage.url !== CAREERS_URL
      || !hasOfficialCareersSignal(careersPage.html)
      || jobsBoardUrl !== JOBS_BOARD_URL
    ) {
      throw new Error('L&T Finance verified careers page no longer matches the known first-party handoff')
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
      throw new Error('L&T Finance verified jobs api no longer matches the known public response contract')
    }

    const scrapedAt = now()

    return extractListingRecords(payload)
      .filter(isIndiaListingRecord)
      .map((record) => mapListingRecordToJob(record, { scrapedAt }))
      .filter(Boolean)
  },
})

export const run = async (options = {}) => createLtFinanceScraper().run(options)

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
