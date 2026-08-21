import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

import { REDBUS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = REDBUS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const CAREERS_PAGE_URL = PROVIDER_METADATA.companyCareerPage
export const JOBS_PAGE_URL = PROVIDER_METADATA.jobListingsUrl
export const DARWINBOX_ORIGIN = PROVIDER_METADATA.darwinboxOrigin
export const DARWINBOX_COMPANY_ID = PROVIDER_METADATA.darwinboxCompanyId

export const JOBS_LIST_API_PATH = '/careers/api/getJobsList'
export const JOB_DESCRIPTION_API_PATH = '/careers/api/getJobDesc'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const HTML_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

const API_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'application/json, text/plain, */*',
  'Content-Type': 'application/json',
  Origin: 'https://www.redbus.in',
  Referer: JOBS_PAGE_URL,
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/\u00a0/g, ' ')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(String(value))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const decodePercentEncodedText = (value) => {
  if (value == null) return null

  const normalized = String(value).trim()
  if (!normalized) return null

  const sanitized = normalized
    .replace(/\+/g, '%20')
    .replace(/%(?![0-9a-f]{2})/gi, '%25')

  try {
    return decodeURIComponent(sanitized)
  } catch {
    return sanitized.replace(
      /%([0-9a-f]{2})/gi,
      (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)),
    )
  }
}

const extractTitle = (html = '') => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1])
}

export const extractInlinePageData = (html = '') => {
  const match = String(html ?? '').match(/\b(?:let|var)\s+data\s*=\s*(["'])([\s\S]*?)\1/i)
  return match ? decodePercentEncodedText(match[2]) : null
}

const buildVerifiedSurfaceText = (html = '') =>
  normalizeWhitespace([String(html ?? ''), extractInlinePageData(html)].filter(Boolean).join(' ')) || ''

const buildVerifiedSurfaceSource = (html = '') =>
  [String(html ?? ''), extractInlinePageData(html)].filter(Boolean).join('\n')

export const buildDarwinboxAllJobsUrl = () =>
  `${DARWINBOX_ORIGIN}/ms/candidatev2/${DARWINBOX_COMPANY_ID}/careers/allJobs`

export const buildDarwinboxJobDetailUrl = (jobId) =>
  `${DARWINBOX_ORIGIN}/ms/candidatev2/${DARWINBOX_COMPANY_ID}/careers/jobDetails/${normalizeWhitespace(jobId) || ''}`

export const extractJobsBundleUrl = (html = '') => {
  const match = String(html ?? '').match(
    /<script[^>]+src=["']([^"']*\/careers\/scripts\/jobs\.bundle\.js[^"']*)["']/i,
  )

  return match ? new URL(match[1], JOBS_PAGE_URL).toString() : null
}

const buildBundleTextVariants = (bundle = '') => {
  const raw = String(bundle ?? '')
  const unescapedQuotes = raw.replace(/\\(["'])/g, '$1')

  return unescapedQuotes === raw ? [raw] : [raw, unescapedQuotes]
}

export const extractJobsApiCredentials = (bundle = '') => {
  for (const text of buildBundleTextVariants(bundle)) {
    const uid = text.match(/["']Uid["']\s*:\s*["']([^"']+)["']/i)?.[1] || null
    const secret = text.match(/["']hash["']\s*:\s*[\s\S]{0,240}?["']([^"']+)["']\s*\+\s*time/i)?.[1]
      || text.match(/sha512[\s\S]{0,200}?["']([^"']+)["']\s*\+\s*time/i)?.[1]
      || null

    if (uid && secret) {
      return { uid, secret }
    }
  }

  return null
}

export const buildJobsApiAuth = ({
  timestamp = Math.floor(Date.now() / 1000),
  uid,
  secret,
} = {}) => ({
  timestamp,
  uid,
  hash: createHash('sha512').update(`${secret}${timestamp}`).digest('hex'),
})

export const buildJobsListApiUrl = ({ timestamp, uid, hash }) =>
  `https://www.redbus.in${JOBS_LIST_API_PATH}?timestamp=${timestamp}&uid=${encodeURIComponent(uid)}&hash=${hash}`

export const buildJobDescriptionApiUrl = ({ timestamp, uid, hash }, jobId) =>
  `https://www.redbus.in${JOB_DESCRIPTION_API_PATH}?timestamp=${timestamp}&uid=${encodeURIComponent(uid)}&hash=${hash}&jobid=${encodeURIComponent(normalizeWhitespace(jobId) || '')}`

export const hasOfficialCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = buildVerifiedSurfaceText(page)
  const source = buildVerifiedSurfaceSource(page)

  return extractTitle(page) === 'redBus Careers'
    && text.includes('Explore open roles')
    && /["']\/careers\/jobs["']/i.test(source)
}

export const hasJobsPageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = buildVerifiedSurfaceText(page)

  return extractTitle(page) === 'redBus Careers'
    && extractJobsBundleUrl(page) !== null
    && text.includes('Open roles')
    && text.includes('Search job title, skills or keyword')
}

export const hasSignedJobsApiSignal = (bundle = '') => {
  const text = String(bundle ?? '')
  const credentials = extractJobsApiCredentials(text)

  return /\/careers\/api\/getJobsList\?timestamp=/i.test(text)
    && /\/careers\/api\/getJobDesc\?timestamp=/i.test(text)
    && /https:\/\/gommt\.darwinbox\.in\/ms\/candidatev2\/main\/careers\/jobDetails\//i.test(text)
    && /\?from=all/i.test(text)
    && Boolean(credentials?.uid)
    && Boolean(credentials?.secret)
}

const normalizeLocationText = (value) => normalizeWhitespace(value)
  ?.replace(/\s*\([^)]*_RBM\)\s*$/i, '')
  ?.trim()
  || null

const pickLocationEntry = (record = {}) => {
  const value = Array.isArray(record.location) ? record.location[0] : record.location
  return normalizeLocationText(value)
}

const pickLocationCity = (record = {}) => {
  const value = Array.isArray(record.location_city) ? record.location_city[0] : record.location_city
  return normalizeWhitespace(value)
}

const buildExperienceRequired = (fromValue, toValue, unitValue = 'Years') => {
  const from = normalizeWhitespace(fromValue)
  const to = normalizeWhitespace(toValue)
  const unit = normalizeWhitespace(unitValue)

  if (from && to) {
    if (from === to) return `${from} ${unit || 'Years'}`
    return `${from} - ${to} ${unit || 'Years'}`
  }

  if (from) return `${from}+ ${unit || 'Years'}`
  if (to) return `Up to ${to} ${unit || 'Years'}`
  return null
}

const normalizePostingDate = (value) => {
  const normalized = normalizeWhitespace(value)
  const match = normalized?.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+\d{2}:\d{2}:\d{2})?$/)
  if (!match) return null

  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

export const isRedBusRecord = (record = {}) => {
  const subtype = normalizeWhitespace(record.emp_sub_type_name) || ''
  if (/\bRB\s*-\s*Employee\b/i.test(subtype)) return true

  const division = normalizeWhitespace(record.division) || ''
  if (/(?:^|[_\s-])RB[_\s-]?MMT(?:$|[_\s-])/i.test(division)) return true

  const designationCode = normalizeWhitespace(record.designation_code) || ''
  if (/^RBM/i.test(designationCode)) return true

  const department = normalizeWhitespace(record.department_name || record.department) || ''
  if (/(?:^|[_( -])RBM(?:$|[_) -])/i.test(department)) return true

  const locationEvidence = [
    ...(Array.isArray(record.location) ? record.location : [record.location]),
    ...(Array.isArray(record.location_city) ? record.location_city : [record.location_city]),
  ]
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean)
    .join(' ')
  if (/\([^)]+_RBM\)/i.test(locationEvidence)) return true

  const jd = normalizeWhitespace(record.jd || record.job_decription) || ''
  return /\bredbus\b/i.test(jd)
}

export const filterRedBusRecords = (records = []) => {
  const seenIds = new Set()

  return (Array.isArray(records) ? records : [])
    .filter((record) => isRedBusRecord(record))
    .filter((record) => {
      const jobId = normalizeWhitespace(record.job_id || record.id)
      if (!jobId || seenIds.has(jobId)) return false
      seenIds.add(jobId)
      return true
    })
}

export const extractJobsListData = (payload = {}) => {
  const records = payload?.Response?.Data
  if (!Array.isArray(records)) {
    throw new Error('[redbus] signed RedBus jobs api no longer exposes a job array')
  }

  return records
}

export const extractJobDescriptionData = (payload = {}, jobId = '') => {
  const detail = payload?.Response?.Data?.data
  if (!detail || typeof detail !== 'object') {
    throw new Error(`[redbus] signed RedBus job detail api no longer exposes detail data for ${jobId}`)
  }

  return detail
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: HTML_HEADERS,
  label: 'redbus-official',
  timeoutMs: 15000,
})

const defaultFetchJobsList = ({ auth }) => fetchJsonWithRetry(buildJobsListApiUrl(auth), {
  method: 'POST',
  headers: API_HEADERS,
  body: JSON.stringify({
    timestamp: auth.timestamp,
    Uid: auth.uid,
    hash: auth.hash,
  }),
  label: 'redbus-first-party-list',
  timeoutMs: 15000,
})

const defaultFetchJobDescription = ({ jobId, auth }) => fetchJsonWithRetry(
  buildJobDescriptionApiUrl(auth, jobId),
  {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify({
      timestamp: auth.timestamp,
      Uid: auth.uid,
      hash: auth.hash,
      job_id: normalizeWhitespace(jobId),
    }),
    label: 'redbus-first-party-detail',
    timeoutMs: 15000,
  },
)

export const createRedBusScraper = ({
  now: defaultNow = () => new Date().toISOString(),
  getUnixTime: defaultGetUnixTime = () => Math.floor(Date.now() / 1000),
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJobsList = defaultFetchJobsList,
    fetchJobDescription = defaultFetchJobDescription,
    now = defaultNow,
    getUnixTime = defaultGetUnixTime,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_PAGE_URL)
    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('RedBus verified official careers page no longer matches the verified public surface')
    }

    const jobsPageHtml = await fetchText(JOBS_PAGE_URL)
    if (!hasJobsPageSignal(jobsPageHtml)) {
      throw new Error('RedBus verified jobs page no longer matches the verified public surface')
    }

    const jobsBundleUrl = extractJobsBundleUrl(jobsPageHtml)
    const jobsBundleJs = await fetchText(jobsBundleUrl)
    if (!hasSignedJobsApiSignal(jobsBundleJs)) {
      throw new Error('RedBus verified jobs bundle no longer exposes the signed RedBus jobs API and Darwinbox handoff')
    }

    const credentials = extractJobsApiCredentials(jobsBundleJs)
    if (!credentials) {
      throw new Error('RedBus verified jobs bundle no longer exposes signed jobs API credentials')
    }

    const listAuth = buildJobsApiAuth({
      timestamp: getUnixTime(),
      uid: credentials.uid,
      secret: credentials.secret,
    })
    const listPayload = await fetchJobsList({ auth: listAuth, credentials })
    const filteredRecords = filterRedBusRecords(extractJobsListData(listPayload))
    if (filteredRecords.length === 0) {
      throw new Error('[redbus] signed RedBus jobs api no longer exposes RedBus-tagged records')
    }

    const jobs = []

    for (const record of filteredRecords) {
      const jobId = normalizeWhitespace(record.job_id || record.id)
      if (!jobId) continue

      const detailAuth = buildJobsApiAuth({
        timestamp: getUnixTime(),
        uid: credentials.uid,
        secret: credentials.secret,
      })
      const detailPayload = await fetchJobDescription({
        jobId,
        auth: detailAuth,
        credentials,
        record,
      })
      const detail = extractJobDescriptionData(detailPayload, jobId)
      const location = pickLocationEntry(detail) || pickLocationEntry(record)
      const city = pickLocationCity(detail) || pickLocationCity(record)
      const country = normalizeWhitespace(detail.location_country || record.location_country) || 'India'

      if (!/india/i.test(country)) continue

      const sourceUrl = buildDarwinboxJobDetailUrl(jobId)
      jobs.push({
        title: normalizeWhitespace(detail.job_title || record.job_title),
        company: COMPANY,
        location,
        city,
        country,
        link: sourceUrl,
        sourceUrl,
        applyUrl: sourceUrl,
        jobId,
        requisitionId: normalizeWhitespace(record.job_code || detail.job_code || jobId),
        department: normalizeWhitespace(detail.department || record.department),
        employmentType: normalizeWhitespace(detail.employee_type || record.employee_type),
        experienceRequired: buildExperienceRequired(
          detail.experience_from || record.experience_from,
          detail.experience_to || record.experience_to,
          detail.unit_experience,
        ),
        jobDescription: normalizeWhitespace(detail.job_decription || record.job_decription),
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        remoteStatus: Number(detail.is_remote ?? record.is_remote) === 1 ? 'Remote' : null,
        postingDate: normalizePostingDate(detail.job_created_timestamp || record.job_created_timestamp),
        closingDate: null,
        source: SOURCE,
        scrapedAt: now(),
      })

      if (maxJobs && jobs.length >= maxJobs) {
        return jobs
      }
    }

    return jobs
  },
})

export const run = async (options = {}) => createRedBusScraper().run(options)

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
