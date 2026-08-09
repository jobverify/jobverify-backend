import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { withRetry } from '../../scraper-support/utils/retry.js'

import { NEKTAR_AI_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = NEKTAR_AI_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const OPEN_ROLES_URL = PROVIDER_METADATA.officialOpenRolesUrl
export const APPLY_FORM_URL = PROVIDER_METADATA.officialApplyFormUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const ROLE_TITLE_PATTERN =
  /<(?:a|h[1-6]|li|p|div|span)[^>]*>\s*[^<]{0,120}\b(?:engineer|developer|designer|manager|sales|marketing|product|operations|analyst|architect|scientist|intern|lead|consultant|executive)\b[^<]{0,120}<\/(?:a|h[1-6]|li|p|div|span)>/i

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&#x27;|&#8217;|&rsquo;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeText = (value) => normalizeWhitespace(value).toLowerCase()

const normalizeComparableUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    url.hash = ''
    url.search = ''
    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, '')
    }
    return url.toString()
  } catch {
    return String(value ?? '').replace(/\/+$/, '')
  }
}

const sameUrl = (left, right) => normalizeComparableUrl(left) === normalizeComparableUrl(right)

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

const defaultFetchPage = (url) => withRetry(async () => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: createTimeoutSignal(15000),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}, {
  attempts: 3,
  baseDelayMs: 2000,
  label: SOURCE,
})

const matchesKnownOpenRolesUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    const hostname = url.hostname.replace(/^www\./i, '').toLowerCase()
    return (hostname === 'coda.io' || hostname === 'docs.superhuman.com')
      && /\/(?:@anusha-laksh\/)?open-roles-for-website-publication\/?$/i.test(url.pathname)
  } catch {
    return false
  }
}

const matchesKnownApplyFormUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    const hostname = url.hostname.replace(/^www\./i, '').toLowerCase()
    return (hostname === 'coda.io' || hostname === 'docs.superhuman.com')
      && /\/form\/Kick-start-your-career-with-us_dfLGyijCu1N\/?$/i.test(url.pathname)
  } catch {
    return false
  }
}

export const hasOfficialCareersLandingSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const text = normalizeText(rawHtml)

  return /<title>\s*Careers\s*\|\s*Nektar\s*-\s*Close Revenue Faster with Better CRM Data\s*<\/title>/i.test(rawHtml)
    && text.includes('come solve challenging problems with an exceptional team')
    && text.includes('explore a career at nektar')
    && text.includes('see open roles')
    && text.includes('apply online')
    && text.includes('questions about joining nektar')
    && text.includes('careers@nektar.ai')
}

export const extractOfficialCodaTargets = (html = '') => {
  const rawHtml = String(html ?? '')
  const openRolesMatch = rawHtml.match(/href=["'](https:\/\/coda\.io\/@anusha-laksh\/open-roles-for-website-publication)["']/i)
  const applyFormMatch = rawHtml.match(/href=["'](https:\/\/coda\.io\/form\/Kick-start-your-career-with-us_dfLGyijCu1N)["']/i)

  return {
    openRolesUrl: openRolesMatch?.[1] || null,
    applyFormUrl: applyFormMatch?.[1] || null,
  }
}

export const hasOfficialOpenRolesSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const text = normalizeText(rawHtml)

  return (/<title>\s*Open Roles\s*@\s*Nektar\.ai\s*<\/title>/i.test(rawHtml) || text.includes('open roles @ nektar.ai'))
    && text.includes('javascript required')
    && text.includes('open roles')
    && text.includes('what’s it like to work at nektar?')
    && text.includes('need to get in touch?')
    && text.includes('careers@nektar.ai')
}

export const hasOfficialApplyFormSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const text = normalizeText(rawHtml)

  return (/<title>\s*Kick start your career with us!\s*<\/title>/i.test(rawHtml) || text.includes('kick start your career with us!'))
    && text.includes('javascript required')
    && text.includes("superhuman docs doesn't work properly without javascript enabled")
}

export const pageExposesPublicJobListings = (html = '') => {
  const rawHtml = String(html ?? '')
  const text = normalizeText(rawHtml)

  return /"@type"\s*:\s*"JobPosting"/i.test(rawHtml)
    || /\bapply now\b/i.test(text)
    || /\bjob description\b/i.test(text)
    || /\bresponsibilities\b/i.test(text)
    || /\brequirements\b/i.test(text)
    || ROLE_TITLE_PATTERN.test(rawHtml)
}

export const createNektarAIScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const careersResponse = await fetchPage(CAREERS_URL)
    let openRolesPage = careersResponse
    let applyFormTarget = APPLY_FORM_URL

    if (sameUrl(careersResponse.url, CAREERS_URL)) {
      if (!hasOfficialCareersLandingSignal(careersResponse.html)) {
        throw new Error('Nektar AI careers surface no longer matches the verified first-party landing page')
      }

      const targets = extractOfficialCodaTargets(careersResponse.html)
      if (!matchesKnownOpenRolesUrl(targets.openRolesUrl) || !matchesKnownApplyFormUrl(targets.applyFormUrl)) {
        throw new Error('Nektar AI careers surface no longer links to the verified Coda targets')
      }

      openRolesPage = await fetchPage(targets.openRolesUrl)
      applyFormTarget = targets.applyFormUrl
    }

    if (
      openRolesPage.status !== 200
      || !matchesKnownOpenRolesUrl(openRolesPage.url || OPEN_ROLES_URL)
      || !hasOfficialOpenRolesSignal(openRolesPage.html)
    ) {
      throw new Error('Nektar AI open roles surface no longer matches the verified public document')
    }

    if (pageExposesPublicJobListings(openRolesPage.html)) {
      throw new Error('Nektar AI open roles surface now exposes public job listings')
    }

    const applyFormPage = await fetchPage(applyFormTarget)
    if (
      applyFormPage.status !== 200
      || !matchesKnownApplyFormUrl(applyFormPage.url || APPLY_FORM_URL)
      || !hasOfficialApplyFormSignal(applyFormPage.html)
    ) {
      throw new Error('Nektar AI apply form no longer matches the verified public handoff')
    }

    if (pageExposesPublicJobListings(applyFormPage.html)) {
      throw new Error('Nektar AI apply form now exposes public job listings')
    }

    return []
  },
})

export const run = async (options = {}) => createNektarAIScraper().run(options)

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
