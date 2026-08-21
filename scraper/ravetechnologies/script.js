import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  fetchJsonWithRetry,
  fetchTextWithRetry,
} from '../../scraper-support/utils/fetch.js'

import { RAVE_TECHNOLOGIES_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const LEGACY_BRAND_URL = PROVIDER_METADATA.homepageUrl
export const SUCCESSOR_HOMEPAGE_URL = PROVIDER_METADATA.successorHomepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const TRANSITION_EVIDENCE_URL = PROVIDER_METADATA.transitionEvidenceUrl
export const SMARTRECRUITERS_BOARD_URL = PROVIDER_METADATA.smartRecruitersBoardUrl
export const SMARTRECRUITERS_COMPANY_IDENTIFIER =
  PROVIDER_METADATA.smartRecruitersCompanyIdentifier
export const SMARTRECRUITERS_LISTING_API_URL =
  PROVIDER_METADATA.smartRecruitersListingApiUrl
export const SMARTRECRUITERS_DETAIL_API_URL_TEMPLATE =
  PROVIDER_METADATA.smartRecruitersDetailApiUrlTemplate

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const PAGE_SIZE = 100

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/\u00a0/g, ' ')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtml(value)
    .replace(/[\u2013\u2014\u2212\uff0d]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const normalizeUrl = (value) => {
  try {
    return new URL(decodeHtml(value)).toString()
  } catch {
    return null
  }
}

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || ''

const createManualFetchSignal = () =>
  typeof AbortSignal?.timeout === 'function'
    ? AbortSignal.timeout(20000)
    : undefined

const findErrorInChain = (error, predicate) => {
  const seen = new Set()
  let current = error

  while (current && !seen.has(current)) {
    seen.add(current)
    if (predicate(current)) {
      return current
    }
    current = current?.cause
  }

  return null
}

const hasHttpStatus = (error, status) =>
  Boolean(findErrorInChain(error, (candidate) => Number(candidate?.status) === status))

const fetchTextWithCapturedHttpBody = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'manual',
    signal: createManualFetchSignal(),
  })
  const html = await response.text()

  if (response.ok) {
    return html
  }

  const error = new Error(`HTTP ${response.status} for ${url}`)
  error.status = response.status
  error.responseBody = html
  throw error
}

const defaultFetchText = async (url) => {
  try {
    return await fetchTextWithRetry(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      label: SOURCE,
      timeoutMs: 20000,
    })
  } catch (error) {
    if (!hasHttpStatus(error, 307)) {
      throw error
    }

    return fetchTextWithCapturedHttpBody(url)
  }
}

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
    Referer: CAREERS_URL,
  },
  label: SOURCE,
  timeoutMs: 20000,
})

export const hasSuccessorHomepageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = stripTags(page) || ''
  return /<title>\s*NEC Software Solutions - Orchestrating a Brighter World\s*<\/title>/i.test(page)
    && normalized.includes('NEC Software Solutions')
    && /href=["']https:\/\/www\.necsws\.com\/india\/careers\/["']/i.test(page)
}

export const hasSuccessorCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = stripTags(page) || ''
  return /<title>\s*Careers - NEC Software Solutions\s*<\/title>/i.test(page)
    && normalized.includes('Careers')
    && /https:\/\/jobs\.smartrecruiters\.com\/NECSWS\//i.test(page)
}

export const hasSmartRecruitersBoardSignal = (html = '') => {
  const page = String(html ?? '')
  return /<title>\s*Careers at NECSWS\s*<\/title>/i.test(page)
    && /window\._jsErrorTrackerOptions/i.test(page)
    && /career-site-ui/i.test(page)
}

export const hasBlockedSuccessorHomepageSignal = (html = '') => {
  const page = String(html ?? '')
  return /<title>\s*You are being redirected\.\.\.\s*<\/title>/i.test(page)
    && /Javascript is required\./i.test(page)
    && /sucuri_cloudproxy_js/i.test(page)
}

const hasVerifiedBlockedSuccessorHomepageError = (error) =>
  Boolean(
    findErrorInChain(
      error,
      (candidate) =>
        Number(candidate?.status) === 307
        && hasBlockedSuccessorHomepageSignal(candidate?.responseBody),
    ),
  )

const buildListingApiUrl = (offset = 0) => {
  const url = new URL(SMARTRECRUITERS_LISTING_API_URL)
  url.searchParams.set('limit', String(PAGE_SIZE))
  url.searchParams.set('country', 'in')
  url.searchParams.set('offset', String(offset))
  return url.toString()
}

const buildDetailApiUrl = (jobId) =>
  SMARTRECRUITERS_DETAIL_API_URL_TEMPLATE.replace('{{jobId}}', encodeURIComponent(String(jobId)))

const buildPostingUrl = (posting = {}) => {
  const jobId = normalizeWhitespace(posting.id)
  const title = normalizeWhitespace(posting.name)
  if (!jobId || !title) return null
  return `https://jobs.smartrecruiters.com/${SMARTRECRUITERS_COMPANY_IDENTIFIER}/${jobId}-${slugify(title)}`
}

const sectionText = (detail = {}, key) => stripTags(detail.jobAd?.sections?.[key]?.text)

const resolveLocation = (posting = {}) => {
  const location = posting.location || {}
  return normalizeWhitespace(location.fullLocation)
    || [location.city, location.region, 'India'].map(normalizeWhitespace).filter(Boolean).join(', ')
    || null
}

const isIndiaPosting = (posting = {}) => {
  const country = normalizeWhitespace(posting.location?.country)
  if (country?.toLowerCase() === 'in') return true

  const location = resolveLocation(posting)
  return /\bIndia\b/i.test(location || '')
}

const isPublicPosting = (posting = {}) =>
  normalizeWhitespace(posting.visibility)?.toUpperCase() === 'PUBLIC'

const getRemoteStatus = (posting = {}) => {
  if (posting.location?.remote) return 'Remote'
  if (posting.location?.hybrid) return 'Hybrid'
  return 'On-site'
}

const mapSmartRecruitersJob = (posting = {}, detail = {}, scrapedAt = new Date().toISOString()) => {
  const merged = { ...posting, ...detail }
  const title = normalizeWhitespace(merged.name)
  const jobId = normalizeWhitespace(merged.id)
  const location = resolveLocation(merged)
  const sourceUrl = normalizeUrl(merged.postingUrl) || buildPostingUrl(merged)
  const applyUrl = normalizeUrl(merged.applyUrl) || (sourceUrl ? `${sourceUrl}?oga=true` : null)

  if (!title || !jobId || !sourceUrl || !location) {
    throw new Error('Rave Technologies SmartRecruiters payload no longer exposes the verified public job fields')
  }

  return {
    title,
    company: COMPANY,
    department:
      normalizeWhitespace(merged.function?.label)
      || normalizeWhitespace(merged.department?.label),
    location,
    city: normalizeWhitespace(merged.location?.city) || normalizeWhitespace(location.split(',')[0]),
    country: 'India',
    link: sourceUrl,
    applyUrl,
    sourceUrl,
    source: SOURCE,
    jobId,
    requisitionId: normalizeWhitespace(merged.refNumber),
    employmentType: normalizeWhitespace(merged.typeOfEmployment?.label),
    experienceRequired: null,
    experienceLevel: normalizeWhitespace(merged.experienceLevel?.label),
    minimumQualification: sectionText(detail, 'qualifications'),
    preferredQualification: sectionText(detail, 'additionalInformation'),
    requiredSkills: [],
    postingDate: normalizeWhitespace(merged.releasedDate),
    closingDate: null,
    jobDescription: sectionText(detail, 'jobDescription') || 'Apply via the NEC Software Solutions careers page.',
    remoteStatus: getRemoteStatus(merged),
    scrapedAt,
  }
}

export const createRaveTechnologiesScraper = ({
  maxJobs = null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    let successorHomepageHtml = null
    try {
      successorHomepageHtml = await fetchText(SUCCESSOR_HOMEPAGE_URL)
    } catch (error) {
      if (!hasVerifiedBlockedSuccessorHomepageError(error)) {
        throw error
      }
    }

    if (
      successorHomepageHtml != null
      && !hasSuccessorHomepageSignal(successorHomepageHtml)
      && !hasBlockedSuccessorHomepageSignal(successorHomepageHtml)
    ) {
      throw new Error(
        'Rave Technologies verified successor homepage no longer matches the trusted NEC India surface',
      )
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasSuccessorCareersSignal(careersHtml)) {
      throw new Error(
        'Rave Technologies verified successor careers page no longer matches the trusted SmartRecruiters handoff',
      )
    }

    const boardHtml = await fetchText(SMARTRECRUITERS_BOARD_URL)
    if (!hasSmartRecruitersBoardSignal(boardHtml)) {
      throw new Error(
        'Rave Technologies verified SmartRecruiters careers board no longer matches the trusted public jobs surface',
      )
    }

    const jobs = []
    let offset = 0

    while (!Number.isFinite(maxJobs) || jobs.length < maxJobs) {
      const payload = await fetchJson(buildListingApiUrl(offset))
      const postings = Array.isArray(payload?.content) ? payload.content : null

      if (!postings) {
        throw new Error('Rave Technologies SmartRecruiters listings payload no longer returns content[]')
      }

      for (const posting of postings) {
        const companyIdentifier = normalizeWhitespace(posting.company?.identifier)
        if (companyIdentifier && companyIdentifier !== SMARTRECRUITERS_COMPANY_IDENTIFIER) {
          throw new Error('Rave Technologies SmartRecruiters payload company identifier changed')
        }

        if (!isPublicPosting(posting) || !isIndiaPosting(posting)) continue

        const detailUrl = normalizeUrl(posting.ref) || buildDetailApiUrl(posting.id)
        const detail = await fetchJson(detailUrl)
        jobs.push(mapSmartRecruitersJob(posting, detail, now()))

        if (Number.isFinite(maxJobs) && jobs.length >= maxJobs) break
      }

      const totalFound = Number(payload?.totalFound)
      offset += postings.length
      if (!postings.length || !Number.isFinite(totalFound) || offset >= totalFound) break
    }

    if (jobs.length === 0) {
      throw new Error('Rave Technologies SmartRecruiters API returned no public India jobs')
    }

    return Number.isFinite(maxJobs) ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async (options = {}) => createRaveTechnologiesScraper().run(options)

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
