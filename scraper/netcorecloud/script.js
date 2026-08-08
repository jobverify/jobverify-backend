import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

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

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: createTimeoutSignal(15000),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const isVerifiedCareersSurface = (page) =>
  page?.status === 200
  && hasVerifiedNetcoreCareersSignal(page.html)

const isVerifiedCareersListSurface = (page) =>
  (page?.status === 200 && hasVerifiedNetcoreRedirectShellSignal(page.html))
  || (page?.status === 403 && hasVerifiedNetcoreForbiddenSignal(page.html))

export const createNetcoreCloudScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const careersPage = await fetchPage(CAREERS_URL)

    if (hasPublicNetcoreJobSignals(careersPage?.html)) {
      throw new Error('Netcore Cloud careers landing now appears to expose a public jobs surface')
    }

    if (!isVerifiedCareersSurface(careersPage)) {
      throw new Error(
        'Netcore Cloud verified official careers surface no longer matches the known blocked-shell state',
      )
    }

    const careersListPage = await fetchPage(CAREERS_LIST_URL)

    if (hasPublicNetcoreJobSignals(careersListPage?.html)) {
      throw new Error('Netcore Cloud careers-list surface now appears to expose a public jobs surface')
    }

    if (!isVerifiedCareersListSurface(careersListPage)) {
      throw new Error(
        'Netcore Cloud verified careers-list surface no longer matches the known blocked-shell state',
      )
    }

    return []
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
