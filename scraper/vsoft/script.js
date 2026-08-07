import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'vsoft'
export const COMPANY = 'VSoft'
export const CAREERS_PAGE_URL = 'https://www.vsoftconsulting.com/careers/'
export const CAREER_PORTAL_URL = 'https://www.vsoftconsulting.com/career-portal/'
export const CAREER_PORTAL_PAGE_JSON_URL =
  'https://www.vsoftconsulting.com/wp-json/wp/v2/pages?slug=career-portal&_fields=id,slug,link,title,content'
export const APP_ROOT_URL = 'https://www.vsoftconsulting.com/wp-content/plugins/bullhorn-oscp/#/'
export const APP_SHELL_URL = 'https://www.vsoftconsulting.com/wp-content/plugins/bullhorn-oscp/'
export const APP_CONFIG_URL = 'https://www.vsoftconsulting.com/wp-content/plugins/bullhorn-oscp/app.json'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const CAREERS_PAGE_SIGNAL_PATTERNS = [
  /<title>\s*(?:V-Soft Consulting Careers and IT Opportunities|Careers\s*-\s*V-Soft Consulting\s*\|\s*Enterprise AI(?:\s*&amp;\s*|\s*&\s*)Digital Transformation)\s*<\/title>/i,
  /https:\/\/www\.vsoftconsulting\.com\/career-portal\/?/i,
  /\b(?:Browse Open Roles|View Roles)\b/i,
]

const DEFAULT_FIELDS = [
  'id',
  'title',
  'publishedCategory(id,name)',
  'address(city,state,countryName)',
  'employmentType',
  'dateLastPublished',
  'publicDescription',
  'isOpen',
  'isPublic',
  'isDeleted',
  'publishedZip',
  'salary',
  'salaryUnit',
]

const INDIA_LOCATION_KEYWORDS = [
  'india',
  'hyderabad',
  'noida',
  'bengaluru',
  'bangalore',
  'pune',
  'mumbai',
  'chennai',
  'delhi',
  'gurgaon',
  'gurugram',
  'kolkata',
  'ahmedabad',
  'coimbatore',
  'kochi',
  'ernakulam',
  'thiruvananthapuram',
  'trivandrum',
  'telangana',
  'karnataka',
  'maharashtra',
  'tamil nadu',
  'kerala',
  'west bengal',
  'gujarat',
  'haryana',
  'uttar pradesh',
]

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'vsoft-text',
  timeoutMs: 15000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json, text/plain, */*',
  },
  label: 'vsoft-json',
  timeoutMs: 15000,
})

const defaultFetchApiResponse = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json, text/plain, */*',
    },
  })

  return {
    status: response.status,
    url: response.url,
    text: await response.text(),
  }
}

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

const isPlaceholderValue = (value) => /^\[.*\]$/.test(String(value ?? '').trim())

export const hasCareersPageSignal = (html) => CAREERS_PAGE_SIGNAL_PATTERNS.every((pattern) => (
  pattern.test(String(html ?? ''))
))

export const hasPortalAppShellSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Career Portal\s*<\/title>/i.test(page)
    && /<app-root>/i.test(page)
    && /novo-loading/i.test(page)
}

export const isPortalLoginBlockedResponse = (response = {}) =>
  Number(response?.status) === 500
  && /"errorMessage"\s*:\s*"Unable to login"/i.test(String(response?.text ?? ''))

export const extractPortalIframeUrl = (payload) => {
  const page = Array.isArray(payload) ? payload[0] : payload
  const rendered = String(page?.content?.rendered ?? '')
  const match = rendered.match(/<iframe\b[^>]*src="([^"]+)"/i)
  if (!match && /\[oscp\]/i.test(rendered)) {
    return APP_ROOT_URL
  }
  if (!match) return null

  try {
    return new URL(match[1], CAREER_PORTAL_URL).toString()
  } catch {
    return null
  }
}

export const normalizeBullhornFields = (fields) => {
  if (!Array.isArray(fields) || fields.length === 0) return [...DEFAULT_FIELDS]

  const normalized = []
  let buffer = ''
  let depth = 0

  for (const rawField of fields) {
    const field = normalizeWhitespace(rawField)
    if (!field) continue

    buffer = buffer ? `${buffer},${field}` : field
    depth += [...field].reduce((count, char) => {
      if (char === '(') return count + 1
      if (char === ')') return count - 1
      return count
    }, 0)

    if (depth <= 0) {
      normalized.push(buffer)
      buffer = ''
      depth = 0
    }
  }

  if (buffer) normalized.push(buffer)

  return normalized.length > 0 ? normalized : [...DEFAULT_FIELDS]
}

export const buildBaseUrl = (appConfig) => {
  const service = appConfig?.service ?? {}
  const swimlane = normalizeWhitespace(service.swimlane)
  const corpToken = normalizeWhitespace(service.corpToken)
  const rawPort = service.port
  const port = Number.isFinite(rawPort) ? rawPort : 443

  if (!swimlane || !corpToken) {
    throw new Error('VSoft Bullhorn app config is missing the swimlane or corp token')
  }

  const protocol = port === 443 ? 'https' : 'http'
  return `${protocol}://public-rest${swimlane}.bullhornstaffing.com:${port}/rest-services/${corpToken}`
}

export const buildSearchUrl = (appConfig, {
  count = Number.isFinite(appConfig?.service?.batchSize) ? appConfig.service.batchSize : 500,
  start = 0,
} = {}) => {
  const params = new URLSearchParams({
    query: '(isOpen:1) AND (isDeleted:0)',
    fields: normalizeBullhornFields(appConfig?.service?.fields).join(','),
    count: String(count),
    sort: normalizeWhitespace(appConfig?.additionalJobCriteria?.sort) || '-dateLastPublished',
    showTotalMatched: 'true',
  })

  if (Number.isFinite(start) && start > 0) {
    params.set('start', String(start))
  }

  return `${buildBaseUrl(appConfig)}/search/JobOrder?${params.toString()}`
}

const buildJobUrl = (jobId) => `${APP_ROOT_URL}jobs/${jobId}`

const isIndiaLocation = (record) => {
  const haystack = [
    record?.address?.city,
    record?.address?.state,
    record?.address?.countryName,
    record?.title,
  ]
    .map((value) => normalizeWhitespace(value)?.toLowerCase())
    .filter(Boolean)
    .join(' | ')

  return INDIA_LOCATION_KEYWORDS.some((keyword) => haystack.includes(keyword))
}

const buildIndiaLocation = (record) => {
  const city = normalizeWhitespace(record?.address?.city)
  const state = normalizeWhitespace(record?.address?.state)
  return [city, state, 'India'].filter(Boolean).join(', ')
}

export const extractJobs = (payload) =>
  (Array.isArray(payload?.data) ? payload.data : [])
    .filter((record) => record?.isOpen && !record?.isDeleted)
    .filter((record) => isIndiaLocation(record))
    .map((record) => {
      const title = normalizeWhitespace(record?.title)
      const jobId = normalizeWhitespace(record?.id)
      const sourceUrl = jobId ? buildJobUrl(jobId) : null

      if (!title || !jobId || !sourceUrl) {
        return null
      }

      return {
        title,
        company: COMPANY,
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
        postingDate: toIsoDate(record?.dateLastPublished),
        jobDescription: stripTags(record?.publicDescription),
        requiredSkills: extractListItems(record?.publicDescription),
      }
    })
    .filter(Boolean)

export const createVsoftScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    fetchApiResponse = defaultFetchApiResponse,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_PAGE_URL)
    if (!hasCareersPageSignal(careersHtml)) {
      throw new Error('The verified VSoft careers surface no longer matches the official first-party page')
    }

    const portalPagePayload = await fetchJson(CAREER_PORTAL_PAGE_JSON_URL)
    if (extractPortalIframeUrl(portalPagePayload) !== APP_ROOT_URL) {
      throw new Error('The verified VSoft Bullhorn portal handoff no longer matches the official first-party iframe')
    }

    const portalAppHtml = await fetchText(APP_SHELL_URL)
    if (!hasPortalAppShellSignal(portalAppHtml)) {
      throw new Error('The verified VSoft Bullhorn app shell no longer matches the public first-party portal')
    }

    const appConfig = await fetchJson(APP_CONFIG_URL)
    const jobsResponse = await fetchApiResponse(buildSearchUrl(appConfig))
    if (isPortalLoginBlockedResponse(jobsResponse)) {
      return []
    }
    if (Number(jobsResponse?.status) !== 200) {
      throw new Error(`The verified VSoft Bullhorn search API returned HTTP ${jobsResponse?.status ?? 'unknown'}`)
    }

    let jobsPayload = null
    try {
      jobsPayload = JSON.parse(jobsResponse.text)
    } catch (error) {
      throw new Error('The verified VSoft Bullhorn search API no longer returns valid JSON', {
        cause: error,
      })
    }

    const jobs = extractJobs(jobsPayload).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))

    return maxJobs ? jobs.slice(0, maxJobs) : jobs
  },
})

export const getRunnerMetadata = () => {
  const appConfig = {
    service: {
      batchSize: 500,
      corpToken: 'H85C9',
      port: 443,
      swimlane: '34',
      fields: [...DEFAULT_FIELDS],
    },
    additionalJobCriteria: {
      sort: '-dateLastPublished',
    },
  }

  return {
    name: SOURCE,
    dryRunFile: 'jobs.json',
    provider: {
      source: SOURCE,
      companyName: COMPANY,
      companyCareerPage: CAREERS_PAGE_URL,
      jobBoardUrl: CAREER_PORTAL_URL,
      jobBoardApi: buildSearchUrl(appConfig),
      adapter: 'script',
      atsPlatform: 'bullhorn-oscp',
      countryFilter: 'India',
    },
  }
}

export const run = async (options = {}) => createVsoftScraper().run(options)

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
