import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { LIVSPACE_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = LIVSPACE_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const CAREERS_LANDING_URL = PROVIDER_METADATA.careersLandingUrl
export const JOBS_LIST_URL = PROVIDER_METADATA.jobsListUrl
export const ZWAYAM_DOMAIN = PROVIDER_METADATA.zwayamDomain
export const LISTING_API_URL = 'https://public.zwayam.com/jobs/search'
export const DETAIL_API_URL = 'https://public.zwayam.com/jobs-service/v1/jobs/careersite'
export const TENANT_GROUP_ID = PROVIDER_METADATA.zwayamTenantGroupId
export const SEARCH_COMPANY_ID = PROVIDER_METADATA.zwayamCompanyId
export const DETAIL_COMPANY_ID = PROVIDER_METADATA.zwayamDetailCompanyId
export const DEFAULT_PAGE_SIZE = 9
export const DEFAULT_MAX_PAGES = 30
export const DEFAULT_MAX_JOBS = 500

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
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
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10)
    }
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return normalized

  return parsed.toISOString().slice(0, 10)
}

const unwrapPayload = (payload = {}) => {
  if (typeof payload !== 'string') return payload

  try {
    const parsed = JSON.parse(payload)
    return typeof parsed === 'string' ? JSON.parse(parsed) : parsed
  } catch {
    return payload
  }
}

const unwrapSearchRecord = (record = {}) => record?._source ?? record

const getFormattedLocation = (record = {}) => normalizeWhitespace(
  record?.jobLocationRecord?.[0]?.formattedLocation
    || record?.jobLocationRecord?.[0]?.location
    || record?.locAgg
    || record?.location,
)

const extractCity = (record = {}) => normalizeWhitespace(
  record?.jobLocationRecord?.[0]?.city
    || record?.city
    || getFormattedLocation(record)?.split(',')?.[0],
)

const chooseDepartment = (...values) => {
  for (const value of values) {
    const normalized = normalizeWhitespace(value)
    if (!normalized || /^all departments$/i.test(normalized)) continue
    return normalized
  }
  return null
}

const chooseLocation = (detailRecord = {}, listing = {}) => {
  const detailLocation = getFormattedLocation(detailRecord)
  const listingRecord = listing._listingRecord || listing
  const listingLocation = getFormattedLocation(listingRecord)

  if (detailLocation && /india/i.test(detailLocation)) return detailLocation
  return listingLocation || detailLocation || null
}

export const extractZwayamHandoffUrl = (html = '') => {
  const match = String(html ?? '').match(/https:\/\/careers\.livspace\.com\/livspace\/?/i)
  if (!match) return null

  return match[0].endsWith('/') ? match[0] : `${match[0]}/`
}

export const hasOfficialCareersPageSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml) || ''

  return /<title>\s*Where passion for design meets technology\s*<\/title>/i.test(rawHtml)
    && normalized.includes("Let's shape the future of home interiors, together")
    && normalized.includes('VIEW OPEN POSITIONS')
    && extractZwayamHandoffUrl(rawHtml) === CAREERS_LANDING_URL
}

export const hasPublicBoardShell = (html = '') => {
  const rawHtml = String(html ?? '')

  return /<title>\s*Careers\s*\|\s*Livspace\s*<\/title>/i.test(rawHtml)
    && /<base href="\/livspace\/">/i.test(rawHtml)
    && /COMPANYID:\s*"MTU5MTk="/i.test(rawHtml)
    && /DOMAIN:\s*"careers\.livspace\.com"/i.test(rawHtml)
    && /https:\/\/public\.zwayam\.com\//i.test(rawHtml)
    && /Current Openings/i.test(rawHtml)
}

export const isIndiaJob = (record = {}) =>
  (Array.isArray(record?.jobLocationRecord) && record.jobLocationRecord.some(
    (location) => /india/i.test(normalizeWhitespace(location?.country) || ''),
  ))
  || /india/i.test(normalizeWhitespace(record?.locAgg) || '')
  || /india/i.test(normalizeWhitespace(record?.location) || '')

export const buildSearchPayload = ({ page = 1, keywords = '' } = {}) => ({
  filterCri: JSON.stringify({
    paginationStartNo: (Math.max(1, Number(page) || 1) - 1) * DEFAULT_PAGE_SIZE,
    selectedCall: 'sort',
    sortCriteria: {
      name: 'modifiedDate',
      isAscending: false,
    },
    anyOfTheseWords: normalizeWhitespace(keywords) || '',
  }),
  domain: ZWAYAM_DOMAIN,
  companyId: SEARCH_COMPANY_ID,
})

export const buildJobDetailUrl = (jobUrl) => {
  const normalizedJobUrl = normalizeWhitespace(jobUrl)
  if (!normalizedJobUrl) return null

  return `${CAREERS_LANDING_URL.replace(/\/$/, '')}/jobview/${encodeURIComponent(normalizedJobUrl)}`
}

export const buildDetailRequest = (record = {}) => ({
  jobUrl: normalizeWhitespace(record?.jobUrl || record?.sourceUrl)?.split('/').pop()?.split('?')[0] || null,
  externalSource: 'CareerSite',
  campusUrl: 'empty',
  companyId: DETAIL_COMPANY_ID,
})

const extractSearchRecords = (payload = {}) => {
  const normalizedPayload = unwrapPayload(payload)
  const records = normalizedPayload?.data?.data
  if (!Array.isArray(records)) {
    throw new Error('Livspace Zwayam search response no longer matches the expected payload')
  }

  return records.map(unwrapSearchRecord)
}

const mapSearchRecord = (record = {}) => ({
  title: normalizeWhitespace(record?.jobTitle),
  company: COMPANY_NAME,
  department: chooseDepartment(record?.DepartmentName, record?.departmentName, record?.text9),
  location: getFormattedLocation(record),
  city: extractCity(record),
  jobId: normalizeWhitespace(record?.jobCode || record?.newJobCode),
  requisitionId: normalizeWhitespace(record?.referenceNumber || record?.refNumber),
  sourceUrl: buildJobDetailUrl(record?.jobUrl),
  applyUrl: buildJobDetailUrl(record?.jobUrl),
  employmentType: normalizeWhitespace(record?.employmentType || record?.jobTypeFieldDisplayName),
  experienceRequired: normalizeWhitespace(record?.experienceUIField || record?.yrsOfExperience),
  minimumQualification: null,
  preferredQualification: null,
  requiredSkills: Array.isArray(record?.mandatorySkills)
    ? record.mandatorySkills.map((skill) => normalizeWhitespace(skill)).filter(Boolean)
    : splitCsv(record?.skillSet || record?.desiredSkill),
  postingDate: normalizeDate(record?.createDate || record?.createdDate),
  closingDate: normalizeDate(record?.endtDate || record?.endDate),
  jobDescription: stripTags(record?.shortDescription || record?.mediumDescriptionWithoutHtml),
  _listingRecord: record,
})

export const extractSearchResults = (payload = {}) => extractSearchRecords(payload)
  .filter((record) => isIndiaJob(record))
  .map((record) => mapSearchRecord(record))
  .filter((job) => job.title && job.jobId && job.sourceUrl)

export const extractPaginationSummary = (payload = {}) => {
  const normalizedPayload = unwrapPayload(payload)

  return {
    hasNext: Boolean(normalizedPayload?.data?.hasMoreData),
    pageSize: Number.parseInt(
      normalizeWhitespace(normalizedPayload?.data?.facetedSearchConfig?.paginationHowMuch) || '',
      10,
    ) || DEFAULT_PAGE_SIZE,
    totalCount: Number(normalizedPayload?.data?.totalCount) || 0,
  }
}

export const extractJobDetail = (payload = {}, listing = {}) => {
  const detailRecord = unwrapPayload(payload)
  const listingRecord = listing._listingRecord || listing
  const jobCode = normalizeWhitespace(detailRecord?.jobCode || listing.jobId || listingRecord?.jobCode)
  const jobUrl = normalizeWhitespace(detailRecord?.jobUrl || listingRecord?.jobUrl)

  return {
    title: normalizeWhitespace(detailRecord?.jobTitle) || listing.title || null,
    company: COMPANY_NAME,
    department: chooseDepartment(
      detailRecord?.department?.departmentName,
      detailRecord?.departmentName,
      listing.department,
      listingRecord?.DepartmentName,
    ),
    location: chooseLocation(detailRecord, listing) || listing.location || null,
    city: extractCity(detailRecord) || listing.city || extractCity(listingRecord),
    jobId: jobCode,
    requisitionId: normalizeWhitespace(
      detailRecord?.referenceNumber
        || detailRecord?.refNumber
        || listing.requisitionId
        || listingRecord?.referenceNumber,
    ),
    sourceUrl: buildJobDetailUrl(jobUrl) || listing.sourceUrl || null,
    applyUrl: buildJobDetailUrl(jobUrl) || listing.applyUrl || null,
    employmentType: normalizeWhitespace(
      detailRecord?.employmentType
        || detailRecord?.jobTypeFieldDisplayName
        || detailRecord?.jobConfigurationData?.['Employment Type'],
    ),
    experienceRequired: normalizeWhitespace(
      detailRecord?.jobConfigurationData?.Experience
        || detailRecord?.yrsOfExperience
        || listing.experienceRequired,
    ),
    minimumQualification: normalizeWhitespace(
      detailRecord?.jobConfigurationData?.['Education/Qualification']
        || detailRecord?.eduqualification,
    ),
    preferredQualification: null,
    requiredSkills: splitCsv(
      detailRecord?.jobConfigurationData?.['Mandatory Skills']
        || detailRecord?.mandatorySkills
        || detailRecord?.skillSet
        || detailRecord?.desiredSkill,
    ),
    postingDate: normalizeDate(
      detailRecord?.createdDate
        || detailRecord?.createDate
        || listing.postingDate
        || listingRecord?.createDate,
    ),
    closingDate: normalizeDate(detailRecord?.endtDate || detailRecord?.endDate || listing.closingDate),
    jobDescription: stripTags(
      detailRecord?.jobConfigurationData?.['Job Description']
        || detailRecord?.longDescription
        || detailRecord?.mediumDescription
        || detailRecord?.shortDescription
        || listing.jobDescription,
    ),
  }
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

const defaultFetchJson = async (url, options = {}) => {
  const headers = {
    Accept: 'application/json',
    ...options.headers,
  }

  if (TENANT_GROUP_ID) {
    headers.TenantGroupId = TENANT_GROUP_ID
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
  } else if (options.body != null) {
    request.body = options.body
  }

  const response = await fetch(url, request)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const createLivspaceScraper = ({
  maxPages = DEFAULT_MAX_PAGES,
  maxJobs = DEFAULT_MAX_JOBS,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    const careersPageHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersPageSignal(careersPageHtml)) {
      throw new Error('Livspace verified official careers page no longer matches the known public surface')
    }

    const handoffUrl = extractZwayamHandoffUrl(careersPageHtml)
    if (handoffUrl !== CAREERS_LANDING_URL) {
      throw new Error('Livspace verified official careers page no longer exposes the known Zwayam handoff')
    }

    const boardShellHtml = await fetchText(CAREERS_LANDING_URL)
    if (!hasPublicBoardShell(boardShellHtml)) {
      throw new Error('Livspace verified public Zwayam board no longer matches the known public surface')
    }

    const jobs = []
    const seenJobIds = new Set()

    for (let page = 1; page <= maxPages && jobs.length < maxJobs; page += 1) {
      const listingPayload = await fetchJson(LISTING_API_URL, {
        method: 'POST',
        form: buildSearchPayload({ page }),
      })

      const listings = extractSearchResults(listingPayload)
      const summary = extractPaginationSummary(listingPayload)

      for (const listing of listings) {
        if (seenJobIds.has(listing.jobId)) continue
        seenJobIds.add(listing.jobId)

        let job = listing
        try {
          const detailPayload = await fetchJson(DETAIL_API_URL, {
            method: 'POST',
            json: buildDetailRequest(listing._listingRecord),
          })
          job = extractJobDetail(detailPayload, listing)
        } catch {
          job = listing
        }

        jobs.push({
          ...job,
          country: job.country || PROVIDER_METADATA.countryFilter,
          source: SOURCE,
          link: job.applyUrl || job.sourceUrl,
          companyCareerPage: CAREERS_URL,
          companyDomain: PROVIDER_METADATA.companyDomain,
          atsPlatform: PROVIDER_METADATA.atsPlatform,
          scrapedAt: now(),
        })

        if (jobs.length >= maxJobs) break
      }

      if (!summary.hasNext) break
      if (summary.totalCount > 0 && page * summary.pageSize >= summary.totalCount) break
    }

    return jobs
  },
})

export const run = async (options = {}) => createLivspaceScraper(options).run(options)

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
