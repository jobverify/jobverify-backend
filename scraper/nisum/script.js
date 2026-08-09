import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { NISUM_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = NISUM_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_LANDING_URL = PROVIDER_METADATA.officialCareersLandingUrl
export const INDIA_CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const CEIPAL_WIDGET_SCRIPT_URL = PROVIDER_METADATA.ceipalWidgetScriptUrl
export const CEIPAL_API_KEY = PROVIDER_METADATA.ceipalApiKey
export const CEIPAL_CAREER_PORTAL_ID = PROVIDER_METADATA.ceipalCareerPortalId

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  const normalized = String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&#8211;|&ndash;|&#8212;|&mdash;/gi, '-')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripHtml = (value) => normalizeWhitespace(value)

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

const defaultFetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  const text = await response.text()
  return JSON.parse(text)
}

const normalizeSlashDate = (value) => {
  const text = normalizeWhitespace(value)
  if (!text) return null

  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return text

  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  return normalized
    .replace(/\)\s*,\s*\(/g, '; ')
    .replace(/[()]/g, '')
    .replace(/\s*;\s*/g, '; ')
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null

  return normalized.split(';')[0]?.split(',')[0]?.trim() || normalized
}

const mapRemoteStatus = (value) => {
  if (value === 1) return 'Remote'
  if (value === 2) return 'Hybrid'
  return 'On-site'
}

const buildApiHeaders = ({ widgetUrl } = {}) => ({
  Accept: '*/*',
  Origin: 'https://jobsapi.ceipal.com',
  Referer: widgetUrl,
  'User-Agent': USER_AGENT,
})

const toFormData = (payload = {}) => {
  const formData = new FormData()
  for (const [key, value] of Object.entries(payload)) {
    formData.append(key, value)
  }
  return formData
}

export const buildWidgetUrl = ({ apiKey, careerPortalId }) =>
  `https://jobsapi.ceipal.com/APISource/v2/index.html?api_key=${apiKey}&cp_id=${careerPortalId}`

export const buildJobPostingsApiUrl = ({ apiKey, page = 1 }) =>
  `https://careerapi.ceipal.com/${apiKey}/CareerPortalJobPostings/?page=${page}`

export const buildJobPostingsPayload = ({ apiKey, careerPortalId, page = 1 }) => ({
  page: String(page),
  api_key: apiKey,
  method: 'CareerPortalJobPostings',
  cp_id: careerPortalId,
  from_career_portal: '1',
})

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)?.toLowerCase() || ''

  return normalized.includes('building success together')
    && (
      /href=["']https:\/\/www\.nisum\.com\/careers\/?["']/i.test(rawHtml)
      || /href=["']\/careers["']/i.test(rawHtml)
    )
}

export const hasCareersLandingSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)?.toLowerCase() || ''

  return normalized.includes('where do you want to start your career')
    && normalized.includes('careers')
    && (
      /href=["']https:\/\/www\.nisum\.com\/careers\/careers-india/i.test(rawHtml)
      || /href=["']\/careers\/careers-india/i.test(rawHtml)
    )
}

export const hasIndiaCareersSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)?.toLowerCase() || ''

  return /<title>\s*Careers India \|\s*Nisum\s*<\/title>/i.test(rawHtml)
    && normalized.includes('careers in india')
    && /id=["']current-openings["']/i.test(rawHtml)
    && /jobsapi\.ceipal\.com\/APISource\/widget\.js/i.test(rawHtml)
    && /data-ceipal-api-key=/i.test(rawHtml)
    && /data-ceipal-career-portal-id=/i.test(rawHtml)
}

export const extractWidgetConfig = (html) => {
  const scriptTag = String(html ?? '').match(
    /<script\b[^>]*src=["']https:\/\/jobsapi\.ceipal\.com\/APISource\/widget\.js["'][^>]*><\/script>/i,
  )?.[0]

  if (!scriptTag) return null

  const apiKey = normalizeWhitespace(
    scriptTag.match(/\bdata-ceipal-api-key=["']([^"']+)["']/i)?.[1] ?? null,
  )
  const careerPortalId = normalizeWhitespace(
    scriptTag.match(/\bdata-ceipal-career-portal-id=["']([^"']+)["']/i)?.[1] ?? null,
  )

  if (!apiKey || !careerPortalId) return null

  return { apiKey, careerPortalId }
}

export const extractIndiaJobsFromJobPostingsPayload = (
  payload = {},
  { scrapedAt = new Date().toISOString() } = {},
) => {
  if (!Array.isArray(payload?.results)) {
    throw new Error('Nisum CEIPAL job postings no longer expose a results array')
  }

  return payload.results
    .filter((item) => normalizeWhitespace(item?.country) === 'India')
    .map((item) => {
      const location = normalizeLocation(item?.multpile_job_location)
        || normalizeWhitespace(
          [item?.city, item?.state, item?.country].filter(Boolean).join(', '),
        )
      const sourceUrl = normalizeWhitespace(item?.campus_portal_job_details_url)
        || normalizeWhitespace(item?.apply_job)
      const applyUrl = normalizeWhitespace(item?.apply_job) || sourceUrl

      if (!location || !sourceUrl || !applyUrl) return null

      return {
        title: normalizeWhitespace(item?.public_job_title || item?.position_title),
        company: COMPANY,
        department: null,
        location,
        city: extractCity(location),
        state: normalizeWhitespace(item?.state),
        country: 'India',
        workplaceType: mapRemoteStatus(Number(item?.remote_opportunities)),
        jobId: String(item?.job_id ?? ''),
        requisitionId: normalizeWhitespace(item?.id),
        sourceUrl,
        applyUrl,
        link: applyUrl,
        employmentType: normalizeWhitespace(item?.tax_terms),
        experienceRequired: null,
        postingDate: normalizeSlashDate(item?.created),
        jobDescription: stripHtml(item?.public_job_desc || item?.requistion_description),
        jobCode: normalizeWhitespace(item?.job_code),
        requiredSkills: [],
        source: SOURCE,
        scrapedAt,
      }
    })
    .filter((job) => job?.title && job?.jobId && job?.requisitionId)
}

export const createNisumScraper = ({
  maxJobs = null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
    maxPages = 20,
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('The verified Nisum homepage no longer matches the known first-party careers link surface')
    }

    const careersLandingHtml = await fetchText(CAREERS_LANDING_URL)
    if (!hasCareersLandingSignal(careersLandingHtml)) {
      throw new Error('The verified Nisum careers landing page no longer matches the known first-party India handoff')
    }

    const indiaCareersHtml = await fetchText(INDIA_CAREERS_URL)
    if (!hasIndiaCareersSignal(indiaCareersHtml)) {
      throw new Error('The verified Nisum India careers page no longer exposes the expected CEIPAL handoff')
    }

    const widgetConfig = extractWidgetConfig(indiaCareersHtml)
    if (!widgetConfig) {
      throw new Error('The verified Nisum India careers page no longer exposes a CEIPAL widget configuration')
    }

    const widgetUrl = buildWidgetUrl(widgetConfig)
    const scrapedAt = now()
    const jobs = []
    let totalPages = 1

    for (let page = 1; page <= totalPages && page <= maxPages; page += 1) {
      const payload = await fetchJson(
        buildJobPostingsApiUrl({ apiKey: widgetConfig.apiKey, page }),
        {
          method: 'POST',
          headers: buildApiHeaders({ widgetUrl }),
          body: toFormData(
            buildJobPostingsPayload({
              apiKey: widgetConfig.apiKey,
              careerPortalId: widgetConfig.careerPortalId,
              page,
            }),
          ),
        },
      )

      const pageJobs = extractIndiaJobsFromJobPostingsPayload(payload, { scrapedAt })
      jobs.push(...pageJobs)

      const advertisedPages = Number.parseInt(String(payload?.num_pages ?? '1'), 10)
      if (Number.isFinite(advertisedPages) && advertisedPages > 0) {
        totalPages = advertisedPages
      } else if (!payload?.next) {
        break
      }

      if (maxJobs && jobs.length >= maxJobs) {
        return jobs.slice(0, maxJobs)
      }
    }

    return jobs
  },
})

export const run = async (options = {}) => createNisumScraper().run(options)

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
