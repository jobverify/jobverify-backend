import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import {
  fetchJsonWithRetry,
  fetchTextWithRetry,
} from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'detroitengineeredproducts'
export const COMPANY = 'Detroit Engineered Products'
export const HOMEPAGE_URL = 'https://depusa.com/'
export const CAREERS_PAGE_URL = 'https://depusa.com/index.php/company/careers'
export const INDIA_CAREERS_URL = 'https://depusa.com/index.php/careers-india'
export const USA_CAREERS_URL = 'https://depusa.com/index.php/careers-usa'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const DEFAULT_HTML_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

const DEFAULT_JSON_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: '*/*',
}

const CAREER_PORTAL_ORIGIN = 'https://jobsapi.ceipal.com'
const CAREER_PORTAL_API_BASE_URL = 'https://careerapi.ceipal.com'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&#8211;|&ndash;/gi, '-')
    .replace(/&#8212;|&mdash;/gi, '-')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (/contract/.test(normalized)) return 'Contract'
  if (/part.?time/.test(normalized)) return 'Part-time'
  if (/intern/.test(normalized)) return 'Internship'
  if (/full.?time/.test(normalized)) return 'Full-time'
  return normalizeWhitespace(value)
}

const withDefaultHeaders = (headers, options = {}) => ({
  ...options,
  headers: {
    ...headers,
    ...(options.headers ?? {}),
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchText = (url, options = {}) =>
  fetchTextWithRetry(url, withDefaultHeaders(DEFAULT_HTML_HEADERS, options))

const defaultFetchJson = (url, options = {}) =>
  fetchJsonWithRetry(url, withDefaultHeaders(DEFAULT_JSON_HEADERS, options))

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const getAttributeValue = (tag, attribute) => {
  const match = String(tag ?? '').match(
    new RegExp(`\\b${escapeRegex(attribute)}=["']([^"']+)["']`, 'i'),
  )
  return normalizeWhitespace(match?.[1] ?? null)
}

const hasHref = (html, url) => {
  const pathname = new URL(url).pathname
  return new RegExp(`href=["'](?:https?:\\/\\/[^"']+)?${escapeRegex(pathname)}["']`, 'i')
    .test(String(html ?? ''))
}

const parsePortalDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const dayMonthYear = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (dayMonthYear) {
    const [, day, month, year] = dayMonthYear
    return `${year}-${month}-${day}`
  }

  const isoDate = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoDate) {
    return normalized
  }

  return null
}

const normalizeRemoteStatus = (value) => {
  if (value === 1 || value === '1') return 'Remote'
  if (value === 2 || value === '2') return 'Hybrid'
  return 'On-site'
}

const buildLocation = (job) => {
  const explicit = normalizeWhitespace(job?.multpile_job_location ?? null)
  if (explicit) return explicit

  const parts = [
    normalizeWhitespace(job?.city ?? null),
    normalizeWhitespace(job?.state ?? null),
    normalizeWhitespace(job?.country ?? null),
  ].filter(Boolean)

  return parts.join(', ') || null
}

const getCareerPortalApplyUrl = (job) => normalizeWhitespace(
  job?.apply_job_monster
  ?? job?.apply_job
  ?? job?.campus_portal_login_url
  ?? job?.campus_portal_job_details_url
  ?? null,
)

const getCareerPortalSourceUrl = (job) => normalizeWhitespace(
  job?.campus_portal_job_details_url
  ?? job?.apply_job_monster
  ?? job?.apply_job
  ?? job?.campus_portal_login_url
  ?? null,
)

const getCareerPortalEmploymentType = (job) => normalizeEmploymentType(
  job?.pay_rates?.find?.((rate) => normalizeWhitespace(rate?.pay_rate_employment_type))?.pay_rate_employment_type
  ?? job?.tax_terms
  ?? null,
)

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)?.toLowerCase() || ''

  return /<title>\s*(?:Home|Detroit Engineered Products)\s*<\/title>/i.test(rawHtml)
    && /meta property=["']og:url["'] content=["']https:\/\/depusa\.com\/["']/i.test(rawHtml)
    && hasHref(rawHtml, CAREERS_PAGE_URL)
    && hasHref(rawHtml, 'https://depusa.com/index.php/company/about-us')
    && (normalized.includes('dep usa') || normalized.includes('detroit engineered products'))
}

export const hasCareersLandingSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)?.toLowerCase() || ''

  return /<title>\s*Careers(?:\s*\|\s*Detroit Engineered Products)?\s*<\/title>/i.test(rawHtml)
    && hasHref(rawHtml, INDIA_CAREERS_URL)
    && hasHref(rawHtml, USA_CAREERS_URL)
    && (
      normalized.includes("welcome to dep's careers page")
      || normalized.includes('join a hub of innovation and creativity')
      || normalized.includes('detroit engineered products')
    )
}

export const hasIndiaCareersSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)?.toLowerCase() || ''

  return /<title>\s*Careers India(?:\s*\|\s*Detroit Engineered Products)?\s*<\/title>/i.test(rawHtml)
    && /jobsapi\.ceipal\.com\/apisource\/widget\.js/i.test(rawHtml)
    && /data-ceipal-api-key=/i.test(rawHtml)
    && /data-ceipal-career-portal-id=/i.test(rawHtml)
    && (
      normalized.includes('careers at dep')
      || normalized.includes('join our team')
      || normalized.includes('india opportunities')
    )
}

export const extractWidgetConfig = (html) => {
  const scriptMatch = String(html ?? '').match(
    /<script\b[^>]*src=["']https:\/\/jobsapi\.ceipal\.com\/APISource\/widget\.js["'][^>]*><\/script>/i,
  )
  const scriptTag = scriptMatch?.[0]
  if (!scriptTag) return null

  const apiKey = getAttributeValue(scriptTag, 'data-ceipal-api-key')
  const careerPortalId = getAttributeValue(scriptTag, 'data-ceipal-career-portal-id')

  if (!apiKey || !careerPortalId) return null

  return { apiKey, careerPortalId }
}

export const buildWidgetUrl = ({ apiKey, careerPortalId } = {}) =>
  `https://jobsapi.ceipal.com/APISource/v2/index.html?api_key=${apiKey}&cp_id=${careerPortalId}`

export const buildCareerPortalApiUrl = ({ apiKey, page = 1 } = {}) =>
  `${CAREER_PORTAL_API_BASE_URL}/${apiKey}/CareerPortalJobPostings/?page=${page}`

export const hasWidgetSignal = (html) => {
  const normalized = normalizeWhitespace(html)?.toLowerCase() || ''
  return normalized.includes('ceipal career portal')
    && normalized.includes('search jobs')
    && normalized.includes('current openings')
}

export const hasCareerPortalResponseSignal = (payload) => {
  if (!payload || typeof payload !== 'object') return false

  const count = Number(payload.count)
  const numPages = Number(payload.num_pages)
  const pageNumber = Number(payload.page_number)

  return Number.isFinite(count)
    && Number.isFinite(numPages)
    && Number.isFinite(pageNumber)
    && Array.isArray(payload.results)
}

export const extractIndiaJobs = (payload) => {
  if (!hasCareerPortalResponseSignal(payload)) return []

  return payload.results
    .map((job) => {
      const title = normalizeWhitespace(job?.public_job_title ?? job?.position_title ?? null)
      const country = normalizeWhitespace(job?.country ?? null)
      const state = normalizeWhitespace(job?.state ?? null)
      const city = normalizeWhitespace(job?.city ?? null)
      const sourceUrl = getCareerPortalSourceUrl(job)
      const applyUrl = getCareerPortalApplyUrl(job)
      const jobId = normalizeWhitespace(job?.job_id ?? job?.id ?? null)
      const requisitionId = normalizeWhitespace(job?.job_code ?? job?.job_id ?? job?.id ?? null)

      if (!title || !country || !/india/i.test(country) || !jobId || !sourceUrl || !applyUrl) {
        return null
      }

      return {
        title,
        company: COMPANY,
        department: null,
        location: buildLocation(job),
        city,
        state,
        country,
        jobId,
        requisitionId,
        sourceUrl,
        applyUrl,
        employmentType: getCareerPortalEmploymentType(job),
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: parsePortalDate(job?.created ?? job?.modified ?? null),
        closingDate: parsePortalDate(job?.closing_date ?? null),
        jobDescription: normalizeWhitespace(job?.public_job_desc ?? job?.requistion_description ?? null),
        publicExperienceChecked: true,
        remoteStatus: normalizeRemoteStatus(job?.remote_opportunities),
      }
    })
    .filter(Boolean)
}

const buildCareerPortalRequestOptions = ({ apiKey, careerPortalId, page = 1 } = {}) => ({
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    Origin: CAREER_PORTAL_ORIGIN,
    Referer: buildWidgetUrl({ apiKey, careerPortalId }),
    'X-Requested-With': 'XMLHttpRequest',
  },
  body: new URLSearchParams({
    page: String(page),
    api_key: String(apiKey ?? ''),
    method: 'CareerPortalJobPostings',
    cp_id: String(careerPortalId ?? ''),
    from_career_portal: '1',
  }),
})

const fetchCareerPortalPage = async ({ fetchJson, widgetConfig, page }) => fetchJson(
  buildCareerPortalApiUrl({ apiKey: widgetConfig.apiKey, page }),
  buildCareerPortalRequestOptions({
    apiKey: widgetConfig.apiKey,
    careerPortalId: widgetConfig.careerPortalId,
    page,
  }),
)

const collectIndiaJobs = async ({ fetchJson, widgetConfig, maxJobs }) => {
  const jobs = []
  let page = 1

  while (true) {
    const payload = await fetchCareerPortalPage({ fetchJson, widgetConfig, page })
    if (!hasCareerPortalResponseSignal(payload)) {
      throw new Error('Response is not the verified public CEIPAL career portal API for DEP India careers')
    }

    jobs.push(...extractIndiaJobs(payload))

    if (maxJobs && jobs.length >= maxJobs) {
      return jobs.slice(0, maxJobs)
    }

    const totalPages = Number.parseInt(payload.num_pages, 10)
    if (!payload.next || !Number.isFinite(totalPages) || page >= totalPages) {
      return jobs
    }

    page += 1
  }
}

export const createDetroitEngineeredProductsScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Response is not the verified official DEP homepage')
    }

    const careersLandingHtml = await fetchText(CAREERS_PAGE_URL)
    if (!hasCareersLandingSignal(careersLandingHtml)) {
      throw new Error('Response is not the verified DEP careers landing page')
    }

    const indiaCareersHtml = await fetchText(INDIA_CAREERS_URL)
    if (!hasIndiaCareersSignal(indiaCareersHtml)) {
      throw new Error('Response is not the official DEP India careers page')
    }

    const widgetConfig = extractWidgetConfig(indiaCareersHtml)
    if (!widgetConfig) {
      throw new Error('DEP India careers page no longer exposes the public CEIPAL widget configuration')
    }

    const jobs = await collectIndiaJobs({ fetchJson, widgetConfig, maxJobs })

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createDetroitEngineeredProductsScraper().run(options)

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
