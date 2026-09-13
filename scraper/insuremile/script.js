import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { INSUREMILE_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = INSUREMILE_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const CAREERS_API_URL = 'https://insuremile.in/wp-json/wp/v2/awsm_job_openings'
export const PAGE_SIZE = 100

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#8211;|&#x2013;|&ndash;/gi, '-')
  .replace(/&#8212;|&#x2014;|&mdash;/gi, '-')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtml(String(value))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripHtml = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/section|\/article|\/li|\/ul|\/ol|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<(p|div|section|article|li|ul|ol|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const titleCase = (value) => normalizeWhitespace(value)
  ?.split(/\s+/)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
  .join(' ') || null

const classSlugToLabel = (slug) => titleCase(String(slug ?? '').replace(/-/g, ' '))

const getClassSlugs = (classList, prefix) => (Array.isArray(classList) ? classList : [])
  .filter((className) => String(className).startsWith(prefix))
  .map((className) => String(className).slice(prefix.length))

const uniqueLabels = (values) => {
  const seen = new Set()

  return values.filter((value) => {
    if (!value || seen.has(value)) return false
    seen.add(value)
    return true
  })
}

const joinLabels = (values) => {
  const labels = uniqueLabels(values)
  return labels.length > 0 ? labels.join(' / ') : null
}

const hasExpectedHost = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    return url.hostname.replace(/^www\./i, '').toLowerCase() === 'insuremile.in'
  } catch {
    return false
  }
}

const isSameDomainJobRecord = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    return hasExpectedHost(value) && /^\/career\//i.test(url.pathname)
  } catch {
    return false
  }
}

export const hasLegacyAwsmCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)?.toLowerCase() || ''

  return /<title[^>]*>\s*careers\s*-\s*insuremile\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/insuremile\.in\/careers\/["']/i.test(page)
    && /wp-content\/plugins\/wp-job-openings\/assets/i.test(page)
    && /awsmJobsPublic/i.test(page)
    && (/awsm-job-listings/i.test(page) || /awsm-job-listing-item/i.test(page))
    && normalized.includes('careers')
}

export const hasCurrentZeroJobsCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return /<title[^>]*>\s*Build Insurance Products That Make Sense\s*\|\s*Insuremile Careers\s*\|\s*Insuremile\s*<\/title>/i.test(page)
    && normalized.includes('CAREERS AT INSUREMILE')
    && normalized.includes("While we don't have active job listings right now")
    && normalized.includes('careers@insuremile.in')
}

const hasCurrentPublicRolesSignal = (html = '') => {
  const page = String(html)
  return /<title[^>]*>\s*Careers at Insuremile:[\s\S]*?\|\s*Insuremile\s*<\/title>/i.test(page)
    && /CAREERS AT INSUREMILE/i.test(page) && /id=["']openings["']/i.test(page)
}

export const extractCurrentPublicRoles = (html = '') => {
  if (!hasCurrentPublicRolesSignal(html)) throw new Error('InsureMile current careers identity changed')
  const page = String(html).replace(/<!--[^]*?-->/g, '')
  const section = page.match(/<section[^>]*id=["']openings["'][^>]*>([\s\S]*?)<\/section>/i)?.[1] || ''
  const total = Number(stripHtml(page).match(/\b(\d+) Open Roles\b/i)?.[1])
  const cards = [...section.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>([\s\S]*?<a\b[^>]*>\s*Apply for Position[\s\S]*?<\/a>)/gi)]
  const knownCities = new Set(['mysore', 'salem', 'palakkad', 'nagpur', 'vizag', 'bangalore'])
  const jobs = cards.map(([, heading, body]) => {
    const title = stripHtml(heading)?.replace(/^\d+\s*\.\s*/, '')
    const locationText = stripHtml(body.match(/<\/svg>\s*<span[^>]*>([\s\S]*?)<\/span>/i)?.[1]
      || body.match(/<div[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>\s*<\/div>/i)?.[1])
    const locations = String(locationText || '').split(/\s*\u2022\s*/).filter(Boolean)
    const india = locations.length > 0 && locations.every(city => knownCities.has(city.toLowerCase()))
    const applyUrl = decodeHtml(body.match(/<a\b[^>]*href=["']([^"']+)["']/i)?.[1])
    if (!title || !locationText || !/^mailto:hr@insuremile\.in\?subject=/.test(applyUrl)) throw new Error('InsureMile incomplete public role card')
    const jobId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    return { title, company: COMPANY, location: india ? locations.join(' / ') + ', India' : locationText,
      city: india && locations.length === 1 ? locations[0] : null, country: india ? 'India' : null,
      jobId, requisitionId: jobId, sourceUrl: CAREERS_URL, applyUrl,
      jobDescription: stripHtml(body.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1]), remoteStatus: 'On-site' }
  })
  if (!Number.isInteger(total) || total <= 0 || total !== jobs.length || new Set(jobs.map(job => job.jobId)).size !== jobs.length) {
    throw new Error('InsureMile incomplete current public listing')
  }
  return jobs
}

export const hasVerifiedCareersPageSignal = (html = '') =>
  hasLegacyAwsmCareersPageSignal(html) || hasCurrentZeroJobsCareersPageSignal(html)

const assertVerifiedFeed = (records) => {
  if (!Array.isArray(records)) {
    throw new Error('InsureMile verified AWSM REST feed no longer matches the public archive')
  }

  for (const record of records) {
    const classList = Array.isArray(record?.class_list) ? record.class_list : []

    if (!classList.includes('type-awsm_job_openings') || !isSameDomainJobRecord(record?.link)) {
      throw new Error('InsureMile verified AWSM REST feed no longer matches the public archive')
    }
  }

  return records
}

const toRemoteStatus = (locationLabels) => {
  const combined = (Array.isArray(locationLabels) ? locationLabels : []).join(' ').toLowerCase()

  if (/\b(remote|work from home)\b/i.test(combined)) return 'Remote'
  if (/\bhybrid\b/i.test(combined)) return 'Hybrid'
  return 'On-site'
}

export const buildSearchUrl = (page, pageSize = PAGE_SIZE) => {
  const url = new URL(CAREERS_API_URL)
  url.searchParams.set('_fields', 'id,link,title,content,class_list')
  url.searchParams.set('per_page', String(pageSize))
  url.searchParams.set('page', String(page))
  return url.toString()
}

export const extractSearchResults = (records) => assertVerifiedFeed(records)
  .map((record) => {
    const classList = Array.isArray(record?.class_list) ? record.class_list : []
    const department = joinLabels(
      getClassSlugs(classList, 'job-category-').map(classSlugToLabel).filter(Boolean),
    )
    const employmentType = joinLabels(
      getClassSlugs(classList, 'job-type-').map(classSlugToLabel).filter(Boolean),
    )
    const locationLabels = uniqueLabels(
      getClassSlugs(classList, 'job-location-').map(classSlugToLabel).filter(Boolean),
    )

    return {
      title: normalizeWhitespace(record?.title?.rendered),
      company: COMPANY,
      department,
      location: joinLabels(locationLabels),
      city: null,
      country: 'India',
      jobId: record?.id == null ? null : String(record.id),
      requisitionId: record?.id == null ? null : String(record.id),
      sourceUrl: normalizeWhitespace(record?.link),
      applyUrl: normalizeWhitespace(record?.link),
      employmentType,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: stripHtml(record?.content?.rendered),
      remoteStatus: toRemoteStatus(locationLabels),
    }
  })
  .filter((job) => job.title && job.jobId && job.sourceUrl)

const defaultFetchText = (url, { signal } = {}) => fetchTextWithRetry(url, {
  signal,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 30000,
})

const defaultFetchJson = (url, { signal } = {}) => fetchJsonWithRetry(url, {
  signal,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
  },
  label: SOURCE,
  timeoutMs: 30000,
})

export const createInsureMileScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  pageSize = PAGE_SIZE,
} = {}) => ({
  async run({ signal,
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    const request = async (fetcher, url, options = {}) => {
      signal?.throwIfAborted()
      try { return await fetcher(url, { ...options, signal }) }
      finally { signal?.throwIfAborted() }
    }
    const careersHtml = await request(fetchText, CAREERS_URL)
    if (hasCurrentPublicRolesSignal(careersHtml)) {
      return extractCurrentPublicRoles(careersHtml).map(job => ({ ...job, source: SOURCE, link: job.applyUrl, scrapedAt: now() }))
    }
    if (!hasVerifiedCareersPageSignal(careersHtml)) {
      throw new Error('InsureMile verified first-party careers page no longer matches the known public surface')
    }

    if (hasCurrentZeroJobsCareersPageSignal(careersHtml)) {
      return []
    }

    const jobs = []

    for (let page = 1; ; page += 1) {
      const pageRecords = assertVerifiedFeed(await request(fetchJson, buildSearchUrl(page, pageSize)))
      jobs.push(...extractSearchResults(pageRecords).map((job) => ({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: now(),
      })))

      if (pageRecords.length < pageSize || (maxJobs && jobs.length >= maxJobs)) {
        break
      }
    }

    return maxJobs ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async (options = {}) => createInsureMileScraper().run(options)

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
