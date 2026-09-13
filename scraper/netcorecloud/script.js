import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry } from '../../scraper-support/utils/fetch.js'

import { NETCORE_CLOUD_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = NETCORE_CLOUD_CATALOG.source
export const COMPANY = NETCORE_CLOUD_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = NETCORE_CLOUD_CATALOG.officialBrandName
export const HOMEPAGE_URL = NETCORE_CLOUD_CATALOG.homepageUrl
export const CAREERS_URL = NETCORE_CLOUD_CATALOG.companyCareerPage
export const CAREERS_LIST_URL = NETCORE_CLOUD_CATALOG.companyCareersListUrl
export const COMPANY_DOMAIN = NETCORE_CLOUD_CATALOG.companyDomain
export const VERIFIED_ON = NETCORE_CLOUD_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = NETCORE_CLOUD_CATALOG.verifiedSurfaceSummary
export const PROVIDER_METADATA = NETCORE_CLOUD_CATALOG

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36'
export const LISTING_API_URL = 'https://netcoreai.mynexthire.com/employer/careers/reqlist/get'
const BOARD_URL = 'https://netcoreai.mynexthire.com/employer/jobs/careers'

const PUBLIC_JOB_PATTERNS = [
  /\bapply now\b/i,
  /\bapply here\b/i,
  /"@type"\s*:\s*"JobPosting"/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /teamtailor/i,
  /workable/i,
  /darwinbox/i,
]

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

export const hasVerifiedNetcoreCareersSignal = (html = '') => {
  const text = (normalizeWhitespace(html) || '').toLowerCase()

  return text.includes('careers - netcore')
    && (
      text.includes('join the community shaping the future of agentic marketing here')
      || text.includes('netcore cloud is now netcore.ai')
    )
    && text.includes('please wait while you are redirected to the right page')
}

export const hasVerifiedNetcoreRedirectShellSignal = (html = '') => {
  const text = (normalizeWhitespace(html) || '').toLowerCase()

  return text.includes('careers list - netcore')
    && text.includes('please wait while you are redirected to the right page')
}

export const hasVerifiedNetcoreForbiddenSignal = (html = '') => {
  const text = (normalizeWhitespace(html) || '').toLowerCase()

  return text.includes('error 403 forbidden')
    && text.includes('403 forbidden')
}

export const hasPublicNetcoreJobSignals = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page) || ''

  return PUBLIC_JOB_PATTERNS.some((pattern) => pattern.test(page) || pattern.test(text))
}

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined
  }

  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

const defaultFetchPage = async (url, { signal } = {}) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: signal ? AbortSignal.any([signal, createTimeoutSignal(15000)]) : createTimeoutSignal(15000),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const defaultFetchJson = (url, options = {}) => fetchJsonWithRetry(url, {
  ...options,
  headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...options.headers },
  timeoutMs: 15000,
  label: SOURCE,
})

const isOfficialUrl = (actual, expected) => {
  try {
    const url = new URL(actual)
    const target = new URL(expected)
    return ['netcorecloud.com', 'netcore.ai'].includes(url.hostname)
      && url.pathname.replace(/\/$/, '') === target.pathname.replace(/\/$/, '')
      && url.search === target.search
  } catch { return false }
}

export const hasMyNextHireHandoff = (html = '') =>
  /<title>\s*Careers list - Netcore\s*<\/title>/i.test(html)
  && html.includes('https://netcoreai.mynexthire.com/employer/ui/js/jobboard/careers-integration.js')
  && /mnh_ci_onreadystatechange\(["']careers["'],\s*["']netcoreai["']\)/i.test(html)
  && /<iframe[^>]*id=["']mnhembedded["']/i.test(html)

const buildJobUrl = (id) => {
  const context = { pageType: 'jd', cvSource: 'careers', reqId: Number(id), requester: { id: '', code: '', name: '' }, page: 'careers', bufilter: -1, customFields: {} }
  const url = new URL(BOARD_URL)
  url.searchParams.set('src', 'careers')
  url.searchParams.set('p', Buffer.from(JSON.stringify(context)).toString('base64'))
  return url.toString()
}

export const extractNetcoreJobs = (payload) => {
  if (!Array.isArray(payload?.reqDetailsBOList) || payload.errorMessage) throw new Error('Netcore incomplete MyNextHire inventory: invalid jobs array')
  const seen = new Set()
  const jobs = []
  for (const row of payload.reqDetailsBOList) {
    const id = normalizeWhitespace(row?.reqId)
    const title = normalizeWhitespace(row?.reqTitle)
    const location = normalizeWhitespace(row?.location)
    if (!/^\d+$/.test(id || '') || !title || !location || !normalizeWhitespace(row?.jdDisplay)) throw new Error('Netcore incomplete MyNextHire inventory: invalid job')
    if (seen.has(id)) throw new Error('Netcore incomplete MyNextHire inventory: duplicate job ID')
    seen.add(id)
    const countryText = [location, row.locationAddress, ...(Array.isArray(row.locationGroup) ? row.locationGroup : [])].join(' ')
    const india = /^IN$/i.test(row.countryCode || '') || /\b(?:India|Mumbai|Bengaluru|Bangalore|Thane|Gurugram|Gurgaon|Pune|Chennai|Hyderabad|Noida|Delhi)\b/i.test(countryText)
    if (!india) {
      if (/\b(?:Philippines|Manila|Singapore|Indonesia|Jakarta|Vietnam|Malaysia|Thailand|United States|USA|United Kingdom|London|Australia|UAE|Dubai)\b/i.test(countryText) || /^[A-Z]{2}$/i.test(row.countryCode || '')) continue
      throw new Error('Netcore incomplete MyNextHire inventory: unknown job country')
    }
    const sourceUrl = buildJobUrl(id)
    jobs.push({
      title, company: COMPANY, source: SOURCE, jobId: id, requisitionId: id,
      location: /\bIndia\b/i.test(location) ? location : location + ', India', city: location, country: 'India',
      department: normalizeWhitespace(row.buName), sourceUrl, applyUrl: sourceUrl,
      postingDate: normalizeWhitespace(row.approvedOn)?.slice(0, 10) || null,
      employmentType: normalizeWhitespace(row.employmentType),
      experienceRequired: Number.isFinite(row.expMin) && Number.isFinite(row.expMax) ? row.expMin + '-' + row.expMax + ' years' : null,
      jobDescription: normalizeWhitespace(row.jdDisplay),
    })
  }
  return jobs
}

export const createNetcoreCloudScraper = () => ({
  async run({ fetchPage = defaultFetchPage, fetchJson = defaultFetchJson, signal, now = () => new Date().toISOString() } = {}) {
    signal?.throwIfAborted()
    const careersPage = await fetchPage(CAREERS_URL, { signal })
    signal?.throwIfAborted()
    if (careersPage.status !== 200 || !isOfficialUrl(careersPage.url, CAREERS_URL)
      || !/<title>\s*Careers - Netcore\s*<\/title>/i.test(careersPage.html)
      || !String(careersPage.html).includes('https://careerpagenetcore.lovable.app/')) {
      throw new Error('Netcore Cloud verified official careers surface is unavailable or missing its current careers handoff')
    }
    const careersListPage = await fetchPage(CAREERS_LIST_URL, { signal })
    signal?.throwIfAborted()
    if (careersListPage.status !== 200) throw new Error('Netcore careers-list blocked or unavailable: HTTP ' + careersListPage.status)
    if (!isOfficialUrl(careersListPage.url, CAREERS_LIST_URL) || !hasMyNextHireHandoff(careersListPage.html)) throw new Error('Netcore incomplete careers-list surface: verified MyNextHire handoff is unavailable')
    const payload = await fetchJson(LISTING_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'careers', code: '', filterByBuId: -1 }), signal })
    signal?.throwIfAborted()
    return extractNetcoreJobs(payload).map(job => ({ ...job, link: job.applyUrl, scrapedAt: now() }))
  },
})

export const run = async (options = {}) => createNetcoreCloudScraper().run(options)

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
