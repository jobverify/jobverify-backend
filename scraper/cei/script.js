import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREERS_PAGE_URL = 'https://cei.ai/about-us/careers/'
export const JOBS_PORTAL_URL = 'https://cei.ai/jobs/#/'
export const APP_CONFIG_URL = 'https://cei.ai/jobs/app.json'
export const SOURCE = 'cei'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
const CAREER_PAGE_SIGNAL_PATTERN = /careers\s*-\s*cei|\/jobs\/#\//i
const DEFAULT_FIELDS = [
  'id',
  'title',
  'publishedCategory(id,name)',
  'address(city,state,zip)',
  'employmentType',
  'dateLastPublished',
  'publicDescription',
  'isOpen',
  'isPublic',
  'isDeleted',
  'publishedZip',
  'salary',
  'salaryUnit',
  'onSite',
  'educationDegree',
]

const INDIA_KEYWORDS = [
  'india',
  'chennai',
  'bangalore',
  'bengaluru',
  'hyderabad',
  'pune',
  'mumbai',
  'gurgaon',
  'gurugram',
  'noida',
  'delhi',
  'navi mumbai',
  'coimbatore',
  'trivandrum',
  'thiruvananthapuram',
  'kochi',
  'ernakulam',
  'ahmedabad',
  'kolkata',
  'tamil nadu',
  'karnataka',
  'telangana',
  'maharashtra',
  'kerala',
  'haryana',
  'uttar pradesh',
  'west bengal',
  'gujarat',
]

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'cei-text',
  timeoutMs: 15000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json, text/plain, */*',
  },
  label: 'cei-json',
  timeoutMs: 15000,
})

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const extractListItems = (value) => [...String(value ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const toIsoDate = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString()
  }

  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? normalized : parsed.toISOString()
}

const normalizeRemoteStatus = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (normalized.includes('hybrid')) return 'Hybrid'
  if (normalized.includes('remote')) return 'Remote'
  if (normalized.includes('on-site') || normalized.includes('onsite')) return 'On-site'
  return normalizeWhitespace(value)
}

const isPlaceholderValue = (value) => /^\[.*\]$/.test(String(value ?? '').trim())

const buildAdditionalCriteria = (appConfig) => {
  const field = normalizeWhitespace(appConfig?.additionalJobCriteria?.field)
  const values = Array.isArray(appConfig?.additionalJobCriteria?.values)
    ? appConfig.additionalJobCriteria.values.map((value) => normalizeWhitespace(value)).filter(Boolean)
    : []

  if (!field || isPlaceholderValue(field)) {
    return ''
  }

  const usableValues = values.filter((value) => !isPlaceholderValue(value))
  if (usableValues.length === 0) {
    return ''
  }

  return ` AND (${field}:${usableValues.join(',')})`
}

export const hasCareerPageSignal = (html) => CAREER_PAGE_SIGNAL_PATTERN.test(String(html ?? ''))

export const buildBaseUrl = (appConfig) => {
  const service = appConfig?.service ?? {}
  const swimlane = normalizeWhitespace(service.swimlane)
  const corpToken = normalizeWhitespace(service.corpToken)
  const port = Number.isFinite(service.port) ? service.port : 443

  if (!swimlane || !corpToken) {
    throw new Error('CEI app config is missing the Bullhorn swimlane or corp token')
  }

  const protocol = port === 443 ? 'https' : 'http'
  return `${protocol}://public-rest${swimlane}.bullhornstaffing.com:${port}/rest-services/${corpToken}`
}

export const buildSearchUrl = (appConfig, {
  count = Number.isFinite(appConfig?.service?.batchSize) ? appConfig.service.batchSize : 500,
  start = 0,
} = {}) => {
  const fields = Array.isArray(appConfig?.service?.fields) && appConfig.service.fields.length > 0
    ? appConfig.service.fields
    : DEFAULT_FIELDS
  const params = new URLSearchParams({
    query: `(isOpen:1) AND (isDeleted:0)${buildAdditionalCriteria(appConfig)}`,
    fields: fields.join(','),
    count: String(count),
    sort: normalizeWhitespace(appConfig?.additionalJobCriteria?.sort) || '-dateLastPublished',
    showTotalMatched: 'true',
  })

  if (Number.isFinite(start) && start > 0) {
    params.set('start', String(start))
  }

  return `${buildBaseUrl(appConfig)}/search/JobOrder?${params.toString()}`
}

const buildJobUrl = (jobId) => `${JOBS_PORTAL_URL}jobs/${jobId}`

export const isIndiaJob = (record) => {
  const haystack = [
    record?.address?.city,
    record?.address?.state,
    record?.address?.countryName,
    record?.title,
    record?.publicDescription,
  ]
    .map((value) => stripTags(value) || normalizeWhitespace(value))
    .filter(Boolean)
    .join(' | ')
    .toLowerCase()

  return INDIA_KEYWORDS.some((keyword) => haystack.includes(keyword))
}

const buildIndiaLocation = (record) => {
  const city = normalizeWhitespace(record?.address?.city)
  const state = normalizeWhitespace(record?.address?.state)
  return [city, state, 'India'].filter(Boolean).join(', ')
}

export const extractJobs = (payload, appConfig) =>
  (Array.isArray(payload?.data) ? payload.data : [])
    .filter((record) => record?.isOpen && !record?.isDeleted)
    .filter((record) => isIndiaJob(record))
    .map((record) => {
      const title = normalizeWhitespace(record?.title)
      const jobId = normalizeWhitespace(record?.id)
      const sourceUrl = jobId ? buildJobUrl(jobId) : null

      if (!title || !jobId || !sourceUrl) {
        return null
      }

      return {
        title,
        company: normalizeWhitespace(appConfig?.companyName) || 'CEI',
        department: normalizeWhitespace(record?.publishedCategory?.name),
        location: buildIndiaLocation(record),
        city: normalizeWhitespace(record?.address?.city),
        state: normalizeWhitespace(record?.address?.state),
        country: 'India',
        jobId,
        requisitionId: jobId,
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: normalizeWhitespace(record?.employmentType),
        experienceRequired: null,
        minimumQualification: normalizeWhitespace(record?.educationDegree),
        preferredQualification: null,
        requiredSkills: extractListItems(record?.publicDescription),
        postingDate: toIsoDate(record?.dateLastPublished),
        closingDate: null,
        jobDescription: stripTags(record?.publicDescription),
        remoteStatus: normalizeRemoteStatus(record?.onSite),
      }
    })
    .filter(Boolean)

export const createCeiScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const fetchJson = options.fetchJson || defaultFetchJson

    const careersPageHtml = await fetchText(CAREERS_PAGE_URL)
    if (!hasCareerPageSignal(careersPageHtml)) {
      return []
    }

    const appConfig = await fetchJson(APP_CONFIG_URL)
    const jobsPayload = await fetchJson(buildSearchUrl(appConfig))
    const jobs = extractJobs(jobsPayload, appConfig).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))

    return maxJobs ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async () => createCeiScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running CEI scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, SOURCE)
    console.log('DB result:', result)
    process.exit(0)
  }
}
