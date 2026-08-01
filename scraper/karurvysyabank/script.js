import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { KARUR_VYSYA_BANK_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = KARUR_VYSYA_BANK_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_LANDING_URL = PROVIDER_METADATA.careersLandingUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const COMPANY_CONFIGURATION_URL = PROVIDER_METADATA.zwayamCompanyConfigurationUrl
export const SEARCH_API_URL = PROVIDER_METADATA.zwayamSearchApiUrl

const COMPANY_ID = PROVIDER_METADATA.zwayamDetailCompanyId
const COMPANY_URL = `${PROVIDER_METADATA.companyDomain}/`
const CAREERS_BASE_URL = CAREERS_LANDING_URL.replace(/\/$/, '')

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&ndash;|&#8211;|&mdash;|&#8212;/gi, '-')
  .replace(/&amp;/gi, '&')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const splitCsv = (value) => normalizeWhitespace(value)
  ?.split(',')
  .map((part) => normalizeWhitespace(part))
  .filter(Boolean) || []

const splitSemicolonList = (value) => normalizeWhitespace(value)
  ?.split(';')
  .map((part) => normalizeWhitespace(part))
  .filter(Boolean) || []

const normalizeDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const dashMonth = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(normalized)
  if (dashMonth) {
    const [, day, monthName, year] = dashMonth
    const monthMap = {
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
    const month = monthMap[monthName.toLowerCase()]
    if (month) return `${year}-${month}-${day.padStart(2, '0')}`
  }

  if (/^\d{13}$/.test(normalized)) {
    const parsed = new Date(Number.parseInt(normalized, 10))
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return normalized
  return parsed.toISOString().slice(0, 10)
}

const normalizeLocation = (value) => {
  const segments = splitSemicolonList(value)
  if (segments.length > 1) return segments.join('; ')
  return normalizeWhitespace(value)
}

const extractCity = (value) => {
  const firstLocation = splitSemicolonList(value)[0] || normalizeWhitespace(value)
  if (!firstLocation) return null
  return normalizeWhitespace(firstLocation.split(',')[0])
}

const isClosedRecord = (record = {}) => [
  record?.displayStatus,
  record?.jobStatus,
  record?.status,
  record?.otherStatusOne,
  record?.otherStatusTwo,
  record?.otherStatusThree,
].some((value) => /(closed|archiv)/i.test(normalizeWhitespace(value) || ''))

export const hasOfficialHomepageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return normalized.includes('Karur Vysya Bank')
    && normalized.includes('Personal Banking')
    && normalized.includes('Business Loans')
    && /href=["']https:\/\/careers\.karurvysya\.bank\.in\/karurvysyabank\/jobslist["']/i.test(page)
}

export const hasOfficialCareersShellSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return /<title>\s*Home\s*<\/title>/i.test(page)
    && /<base\s+href=["']\/karurvysyabank\/["']\s*\/?>/i.test(page)
    && /<app-root><\/app-root>/i.test(page)
    && normalized.includes('runtime.36d5a07efd54c143.js')
    && normalized.includes('main.92af9ef27720e0e0.js')
    && normalized.includes('impl.openings.co')
}

export const hasVerifiedCompanyConfiguration = (payload = {}) =>
  Number(payload?.company?.id) === 15551
  && normalizeWhitespace(payload?.company?.companyName) === 'Karur Vysya Bank'
  && normalizeWhitespace(payload?.company?.careerSiteUrl) === 'careers.karurvysya.bank.in'
  && normalizeWhitespace(payload?.company?.domainName) === 'careers.karurvysya.bank.in'

export const buildSearchPayload = ({
  job = '',
  city = '',
  userGeoLocation = '',
  departmentName = '',
  fieldName = '',
  fieldValue = '',
} = {}) => ({
  id: COMPANY_ID,
  companyUrl: COMPANY_URL,
  job,
  city,
  userGeoLocation,
  departmentName,
  fieldName,
  fieldValue,
})

export const buildJobDetailUrl = (jobUrl) => {
  const normalizedJobUrl = normalizeWhitespace(jobUrl)
  if (!normalizedJobUrl) return null
  return `${CAREERS_BASE_URL}/jobview/${encodeURIComponent(normalizedJobUrl)}`
}

const mapSearchRecord = (record = {}) => {
  const location = normalizeLocation(record?.location)

  return {
    title: normalizeWhitespace(record?.jobTitle),
    company: COMPANY_NAME,
    department: normalizeWhitespace(record?.departmentName || record?.DepartmentName),
    location,
    city: extractCity(record?.location),
    jobId: normalizeWhitespace(record?.jobCode || record?.jobId),
    requisitionId: normalizeWhitespace(record?.referenceNumber || record?.refNumber),
    sourceUrl: buildJobDetailUrl(record?.jobUrl),
    applyUrl: buildJobDetailUrl(record?.jobUrl),
    employmentType: null,
    experienceRequired: normalizeWhitespace(record?.experienceUIField),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: splitCsv(record?.skillSet || record?.skillsToEvaluate),
    postingDate: normalizeDate(record?.createDate || record?.createdDate),
    closingDate: null,
    jobDescription: stripTags(record?.shortDescription || record?.jobDescription),
  }
}

export const extractSearchResults = (payload = {}) => {
  const records = Array.isArray(payload) ? payload : payload?.data
  if (!Array.isArray(records)) {
    throw new Error('Karur Vysya Bank search response no longer matches the expected payload')
  }

  return records
    .filter((record) => !isClosedRecord(record))
    .map((record) => mapSearchRecord(record))
    .filter((job) => job.title && job.jobId && job.sourceUrl)
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    },
    redirect: 'follow',
  })

  return {
    ok: response.ok,
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const defaultFetchJson = async (url, options = {}) => {
  const headers = {
    Accept: 'application/json',
    ...options.headers,
  }
  const request = {
    method: options.method || 'GET',
    headers,
  }

  if (options.form) {
    const form = new FormData()
    for (const [key, value] of Object.entries(options.form)) {
      form.append(key, value)
    }
    request.body = form
  } else if (options.json) {
    request.headers = {
      ...headers,
      'Content-Type': 'application/json',
    }
    request.body = JSON.stringify(options.json)
  }

  const response = await fetch(url, request)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }
  return response.json()
}

export const createKarurVysyaBankScraper = () => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (!homepage.ok || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('The official Karur Vysya Bank homepage no longer matches the verified careers handoff surface')
    }

    const careersPage = await fetchPage(CAREERS_URL)
    if (!careersPage.ok || !hasOfficialCareersShellSignal(careersPage.html)) {
      throw new Error('The official Karur Vysya Bank careers shell no longer matches the verified surface')
    }

    const companyConfiguration = await fetchJson(COMPANY_CONFIGURATION_URL)
    if (!hasVerifiedCompanyConfiguration(companyConfiguration)) {
      throw new Error('The Karur Vysya Bank company configuration no longer matches the verified Zwayam surface')
    }

    const listingsPayload = await fetchJson(SEARCH_API_URL, {
      method: 'POST',
      form: buildSearchPayload(),
    })

    return extractSearchResults(listingsPayload).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createKarurVysyaBankScraper().run(options)

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
