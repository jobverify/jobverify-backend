export const OFFICIAL_CAREERS_URL = 'https://jobs.itcinfotech.com/itcinfotech/jobslist'
export const LISTING_API_URL = 'https://public.zwayam.com/jobs/search'
export const DETAIL_API_URL = 'https://public.zwayam.com/jobs-service/v1/jobs/careersite'

const COMPANY_NAME = 'ITC Infotech'
const SOURCE = 'itcinfotech'
const COMPANY_ID = '15154'
const PORTAL_DOMAIN = 'jobs.itcinfotech.com'
const DETAIL_BASE_URL = OFFICIAL_CAREERS_URL.replace(/\/jobslist$/, '')
const DEFAULT_MAX_PAGES = 5
const DEFAULT_MAX_JOBS = 100
const DEFAULT_PAGE_SIZE = 10
const INDIA_LOCATION_PATTERN = /\b(india|bengaluru|bangalore|pune|hyderabad|kolkata)\b/i

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeText = (value) => {
  if (value == null) return null
  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripHtml = (value) => normalizeText(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const splitCsv = (value) => normalizeText(value)
  ?.split(',')
  .map((part) => normalizeText(part))
  .filter(Boolean) || []

const unwrapSearchRecord = (record = {}) => record?._source ?? record

const unwrapDetailPayload = (payload = {}) => payload?.reponseObject ?? payload?.data ?? payload

const normalizeDate = (value) => {
  const normalized = normalizeText(value)
  if (!normalized) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return normalized
  return parsed.toISOString().slice(0, 10)
}

const buildLocationText = (record = {}) => [
  record?.location,
  record?.locAgg,
  record?.city,
  record?.country,
  ...(Array.isArray(record?.jobLocationRecord)
    ? record.jobLocationRecord.flatMap((location) => [
      location?.city,
      location?.location,
      location?.country,
    ])
    : []),
].map((value) => normalizeText(value)).filter(Boolean).join(' ')

const extractCity = (record = {}) => {
  const directCity = normalizeText(record?.jobLocationRecord?.[0]?.city || record?.city)
  if (directCity) return directCity

  const location = normalizeText(record?.location || record?.locAgg)
  if (!location) return null
  return normalizeText(location.split(',')[0])
}

const isIndiaJob = (record = {}) => INDIA_LOCATION_PATTERN.test(buildLocationText(record))

export const buildListingRequest = (paginationStartNo = 0) => ({
  filterCri: JSON.stringify({
    paginationStartNo: Math.max(0, Number(paginationStartNo) || 0),
    selectedCall: 'sort',
    sortCriteria: {
      name: 'modifiedDate',
      isAscending: false,
    },
    anyOfTheseWords: '',
  }),
  domain: PORTAL_DOMAIN,
  companyId: COMPANY_ID,
})

export const buildDetailRequest = (record = {}) => ({
  jobUrl: normalizeText(record?.jobUrl),
  externalSource: 'CareerSite',
  campusUrl: 'empty',
  companyId: COMPANY_ID,
})

export const buildJobDetailUrl = (jobUrl, jobId) => {
  const normalizedJobUrl = normalizeText(jobUrl)
  const normalizedJobId = normalizeText(jobId)
  if (!normalizedJobUrl || !normalizedJobId) return null

  return `${DETAIL_BASE_URL}/jobview/${encodeURIComponent(normalizedJobUrl)}?id=${encodeURIComponent(normalizedJobId)}`
}

export const transformItcInfotechJob = (listingRecord = {}, detailPayload = null) => {
  const detailRecord = unwrapDetailPayload(detailPayload || {})
  const title = normalizeText(detailRecord?.jobTitle || listingRecord?.jobTitle)
  const jobId = normalizeText(
    detailRecord?.jobCode
      || detailRecord?.jobId
      || listingRecord?.jobCode
      || listingRecord?.jobId,
  )
  const jobUrl = normalizeText(detailRecord?.jobUrl || listingRecord?.jobUrl)
  const location = normalizeText(
    detailRecord?.location
      || detailRecord?.locAgg
      || listingRecord?.location
      || listingRecord?.locAgg,
  )
  const link = buildJobDetailUrl(jobUrl, jobId)

  return {
    title,
    company: COMPANY_NAME,
    department: normalizeText(
      detailRecord?.department?.departmentName
        || detailRecord?.departmentName
        || listingRecord?.department?.departmentName
        || listingRecord?.departmentName,
    ),
    location,
    city: extractCity({
      ...listingRecord,
      ...detailRecord,
      location,
    }),
    jobId,
    requisitionId: normalizeText(
      detailRecord?.referenceNumber
        || detailRecord?.refNumber
        || listingRecord?.referenceNumber
        || listingRecord?.refNumber,
    ),
    sourceUrl: link,
    applyUrl: link,
    employmentType: normalizeText(
      detailRecord?.employmentType
        || detailRecord?.jobType
        || detailRecord?.jobConfigurationData?.['Employment Type'],
    ),
    experienceRequired: normalizeText(
      detailRecord?.yrsOfExperience
        || detailRecord?.experienceUIField
        || listingRecord?.experienceUIField
        || listingRecord?.yrsOfExperience,
    ),
    minimumQualification: normalizeText(
      detailRecord?.jobConfigurationData?.['Education/Qualification']
        || detailRecord?.eduqualification,
    ),
    preferredQualification: null,
    requiredSkills: splitCsv(
      detailRecord?.jobConfigurationData?.['Skills Required']
        || detailRecord?.skillSet
        || detailRecord?.desiredSkill,
    ),
    postingDate: normalizeDate(
      detailRecord?.jobConfigurationData?.['Posted On']
        || detailRecord?.createDate
        || listingRecord?.createDate,
    ),
    closingDate: normalizeDate(detailRecord?.endtDate || detailRecord?.endDate),
    jobDescription: stripHtml(
      detailRecord?.jobConfigurationData?.Description
        || detailRecord?.longDescription
        || detailRecord?.shortDescription
        || listingRecord?.shortDescription,
    ),
  }
}

const extractListingRecords = (payload = {}) => {
  const records = payload?.data?.data ?? payload?.data ?? []
  if (!Array.isArray(records)) return []
  return records.map(unwrapSearchRecord)
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
  } else if (options.body != null) {
    request.body = options.body
  }

  const response = await fetch(url, request)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

const defaultFetchText = async (url, options = {}) => {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

const maybeFillDescriptionFromHtml = async (job, fetchText) => {
  if (job.jobDescription || !job.sourceUrl || typeof fetchText !== 'function') {
    return job
  }

  try {
    const html = await fetchText(job.sourceUrl)
    const jobDescription = stripHtml(html)
    return jobDescription ? { ...job, jobDescription } : job
  } catch {
    return job
  }
}

const getPageSize = (payload, fallback) => {
  const pageSize = Number(payload?.data?.facetedSearchConfig?.paginationHowMuch)
  return Number.isInteger(pageSize) && pageSize > 0 ? pageSize : fallback
}

const getTotalCount = (payload) => Number(payload?.data?.totalCount)

export const createItcInfotechScraper = ({
  maxPages = DEFAULT_MAX_PAGES,
  maxJobs = DEFAULT_MAX_JOBS,
  pageSize = DEFAULT_PAGE_SIZE,
} = {}) => {
  const boundedMaxPages = Math.min(DEFAULT_MAX_PAGES, Math.max(1, Number(maxPages) || 1))
  const boundedMaxJobs = Math.min(DEFAULT_MAX_JOBS, Math.max(1, Number(maxJobs) || 1))
  const boundedPageSize = Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE)

  return {
    async run({
      fetchJson = defaultFetchJson,
      fetchText = defaultFetchText,
    } = {}) {
      const jobs = []
      const seenJobIds = new Set()

      for (let page = 0; page < boundedMaxPages && jobs.length < boundedMaxJobs; page += 1) {
        const listingPayload = await fetchJson(LISTING_API_URL, {
          method: 'POST',
          form: buildListingRequest(page * boundedPageSize),
        })

        const listingRecords = extractListingRecords(listingPayload).filter(isIndiaJob)

        for (const record of listingRecords) {
          const listingJob = transformItcInfotechJob(record)
          if (!listingJob.title || !listingJob.jobId || !listingJob.sourceUrl) continue
          if (seenJobIds.has(listingJob.jobId)) continue

          seenJobIds.add(listingJob.jobId)

          let job = listingJob
          try {
            const detailPayload = await fetchJson(DETAIL_API_URL, {
              method: 'POST',
              json: buildDetailRequest(record),
            })
            job = transformItcInfotechJob(record, detailPayload)
          } catch {
            job = listingJob
          }

          job = await maybeFillDescriptionFromHtml(job, fetchText)
          jobs.push({
            ...job,
            source: SOURCE,
            link: job.applyUrl || job.sourceUrl,
            scrapedAt: new Date().toISOString(),
          })

          if (jobs.length >= boundedMaxJobs) break
        }

        const totalCount = getTotalCount(listingPayload)
        const currentPageSize = getPageSize(listingPayload, boundedPageSize)
        if (!Number.isFinite(totalCount) || (page + 1) * currentPageSize >= totalCount) break
      }

      return jobs
    },
  }
}

export const run = (options) => createItcInfotechScraper().run(options)
