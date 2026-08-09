import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const SOURCE = 'snowplow'
export const COMPANY = 'Snowplow'
export const VERIFIED_ON = '2026-07-25'
export const CAREERS_PAGE_URL = 'https://snowplow.io/careers'
export const HIBOB_CAREER_SITE_URL = 'https://snowplow.careers.hibob.com/'
export const HIBOB_CAREER_SITE_API_URL = 'https://snowplow.careers.hibob.com/api/career-site'
export const HIBOB_JOB_BOARD_API_URL = 'https://snowplow.careers.hibob.com/api/job-ad'
export const PROVIDER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  adapter: 'script',
  modulePath: '../../scraper/snowplow/script.js',
  dryRunFile: 'snowplow/jobs.json',
  companyCareerPage: CAREERS_PAGE_URL,
  hiBobCareerSiteUrl: HIBOB_CAREER_SITE_URL,
  hiBobCareerSiteApiUrl: HIBOB_CAREER_SITE_API_URL,
  hiBobJobBoardApiUrl: HIBOB_JOB_BOARD_API_URL,
  companyDomain: 'snowplow.io',
  atsPlatform: 'hibob',
  countryFilter: 'Global',
  paginationStrategy: 'single-hibob-job-ad-feed',
  extractionStrategy: 'verified-first-party-careers-page+verified-hibob-branding+public-hibob-job-ad-feed',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: VERIFIED_ON,
  verifiedSurfaceSummary:
    'Verified on Saturday, July 25, 2026 that https://snowplow.io/careers was the live first-party Snowplow careers page, that its public "See Open Roles" call-to-action linked directly to the official HiBob board at https://snowplow.careers.hibob.com/, and that the companion public HiBob endpoints https://snowplow.careers.hibob.com/api/career-site and https://snowplow.careers.hibob.com/api/job-ad returned live public Snowplow openings including Customer Success Engineer, Market Development Representative, and Product Manager.',
}

const HIBOB_HEADERS = {
  'User-Agent': USER_AGENT,
  Referer: HIBOB_CAREER_SITE_URL,
  Origin: HIBOB_CAREER_SITE_URL.replace(/\/$/, ''),
}

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(?:br|\/p|\/div|\/li|\/ul|\/ol|\/section|\/article|\/main|\/h[1-6]|\/a|\/span)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;|&#038;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&lsquo;|&#8217;|&#x27;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const buildDescription = (job = {}) => {
  const labels = job.sectionLabels || {}
  const sections = [
    normalizeWhitespace(job.description),
    normalizeWhitespace(job.responsibilities)
      ? `${normalizeWhitespace(labels.responsibilities) || 'Responsibilities'} ${normalizeWhitespace(job.responsibilities)}`
      : null,
    normalizeWhitespace(job.requirements)
      ? `${normalizeWhitespace(labels.requirements) || 'Requirements'} ${normalizeWhitespace(job.requirements)}`
      : null,
    normalizeWhitespace(job.benefits)
      ? `${normalizeWhitespace(labels.benefits) || 'Benefits'} ${normalizeWhitespace(job.benefits)}`
      : null,
  ]

  return sections.filter(Boolean).join(' ') || null
}

const buildLocation = (job = {}) => {
  const site = normalizeWhitespace(job.site)
  const country = normalizeWhitespace(job.country)

  if (site && country && site.toLowerCase() !== country.toLowerCase()) {
    return `${site}, ${country}`
  }

  return site || country || null
}

const inferRemoteStatus = (job = {}) => {
  if (job.workspaceTypeId === 'remote' || /remote/i.test(String(job.workspaceType ?? ''))) {
    return 'Remote'
  }

  if (job.workspaceTypeId === 'hybrid' || /hybrid/i.test(String(job.workspaceType ?? ''))) {
    return 'Hybrid'
  }

  if (job.workspaceTypeId || job.workspaceType) {
    return 'On-site'
  }

  return null
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    ...HIBOB_HEADERS,
    Accept: 'application/json',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml) || ''

  return normalized.includes('Shape the Future of Data')
    && normalized.includes('Ready to build with us?')
    && normalized.includes('See Open Roles')
}

export const extractVerifiedHiBobCareerSiteUrl = (html = '') =>
  String(html ?? '').includes(HIBOB_CAREER_SITE_URL)
    ? HIBOB_CAREER_SITE_URL
    : null

export const hasVerifiedCareerSitePayload = (payload = {}) => {
  const sections = Array.isArray(payload.sections) ? payload.sections : []
  const sectionText = normalizeWhitespace(JSON.stringify(sections)) || ''

  return sectionText.includes('Current openings')
    && sectionText.includes('Join the data foundation for AI')
}

export const extractHiBobJobs = (payload = {}) =>
  (Array.isArray(payload.jobAdDetails) ? payload.jobAdDetails : [])
    .map((job) => {
      const title = normalizeWhitespace(job.title)
      const jobId = normalizeWhitespace(job.id)
      const country = normalizeWhitespace(job.country)

      if (!title || !jobId) return null

      return {
        title,
        company: COMPANY,
        department: normalizeWhitespace(job.department),
        location: buildLocation(job),
        city: null,
        state: null,
        country,
        jobId,
        requisitionId: jobId,
        sourceUrl: `${HIBOB_CAREER_SITE_URL}jobs/${jobId}`,
        applyUrl: `${HIBOB_CAREER_SITE_URL}jobs/${jobId}/apply`,
        employmentType: normalizeWhitespace(job.employmentType),
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: normalizeWhitespace(job.publishedAt),
        closingDate: null,
        jobDescription: buildDescription(job),
        remoteStatus: inferRemoteStatus(job),
      }
    })
    .filter(Boolean)

export const createSnowplowScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_PAGE_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Verified Snowplow official careers page changed materially')
    }

    const verifiedCareerSiteUrl = extractVerifiedHiBobCareerSiteUrl(careersHtml)
    if (verifiedCareerSiteUrl !== HIBOB_CAREER_SITE_URL) {
      throw new Error('Verified HiBob career site handoff changed materially')
    }

    const careerSitePayload = await fetchJson(HIBOB_CAREER_SITE_API_URL)
    if (!hasVerifiedCareerSitePayload(careerSitePayload)) {
      throw new Error('Verified HiBob career site payload changed materially')
    }

    const jobBoardPayload = await fetchJson(HIBOB_JOB_BOARD_API_URL)
    if (!Array.isArray(jobBoardPayload?.jobAdDetails)) {
      throw new Error('Verified HiBob job board payload changed materially')
    }

    return extractHiBobJobs(jobBoardPayload).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createSnowplowScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}

