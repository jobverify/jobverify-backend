import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { DINEOUT_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = DINEOUT_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const PARENT_COMPANY_NAME = PROVIDER_METADATA.parentCompanyName
export const VERIFIED_AT = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CANONICAL_CONSUMER_SURFACE_URL = PROVIDER_METADATA.canonicalConsumerSurfaceUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const CAREERS_INTEGRATION_SCRIPT_URL = PROVIDER_METADATA.careersIntegrationScriptUrl
export const JOBS_BOARD_URL = PROVIDER_METADATA.jobsBoardUrl
export const JOBS_BOARD_DETAILS_URL = PROVIDER_METADATA.jobsBoardDetailsUrl
export const REDIRECTED_NO_TRUST_ROUTE_URL = PROVIDER_METADATA.redirectedNoTrustRouteUrl
export const NO_TRUST_PUBLIC_JOB_ROUTE_URLS = [
  'https://www.dineout.co.in/careers',
  'https://www.dineout.co.in/careers/',
  'https://www.dineout.co.in/jobs',
  'https://www.dineout.co.in/jobs/',
  'https://www.dineout.co.in/work-with-us',
  'https://www.dineout.co.in/join-us',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value = '') => String(value ?? '')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const parseJson = (value) => {
  try {
    return JSON.parse(String(value ?? ''))
  } catch {
    return null
  }
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const extractCanonicalConsumerSurfaceUrl = (html = '') => {
  const match = /<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i.exec(String(html ?? ''))
  return match?.[1] ?? null
}

export const hasOfficialHomepageSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)
  const keywordsMatch = /<meta\b[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i.exec(rawHtml)
  const keywords = keywordsMatch?.[1] ?? ''

  return extractCanonicalConsumerSurfaceUrl(rawHtml) === CANONICAL_CONSUMER_SURFACE_URL
    && /Swiggy Dineout/i.test(keywords)
    && /Swiggy Dineout/i.test(normalized)
}

export const isVerifiedRedirectedNoTrustPublicJobRoute = (page = {}) =>
  Number(page?.status) === 403
  && String(page?.url ?? '') === REDIRECTED_NO_TRUST_ROUTE_URL
  && /\b403 Forbidden\b/i.test(String(page?.html ?? ''))

export const hasParentCareersLandingSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*Swiggy Careers\s*<\/title>/i.test(rawHtml)
    && /<meta\s+name=["']description["']\s+content=["']Check out the exciting job opportunities at Swiggy!["']/i.test(rawHtml)
    && /assets\/js\/careers-integration\.js/i.test(rawHtml)
    && /\bSwiggy Careers\b/i.test(normalized)
}

export const extractJobsBoardUrlFromIntegrationScript = (scriptText = '') => {
  const text = String(scriptText ?? '')
  const directMatch = /(https:\/\/[a-z0-9-]+\.mynexthire\.com\/employer\/jobs\/careers)/i.exec(text)
  if (directMatch) {
    return directMatch[1]
  }

  const shortNameMatch = /clientShortName\s*=\s*["']([^"']+)["']/i.exec(text)
  if (shortNameMatch && /mynexthire\.com\/employer\/jobs\/careers/i.test(text)) {
    return `https://${shortNameMatch[1]}.mynexthire.com/employer/jobs/careers`
  }

  return null
}

export const hasJobsBoardLandingSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  return /<title>\s*Approved Jobs, powered by Smaclify Technologies!\s*<\/title>/i.test(rawHtml)
    && /\/employer\/ui\/js\/jobboard\/careers\.js/i.test(rawHtml)
}

export const hasDineoutAttributablePublicRoles = (value = '') => {
  const text = normalizeWhitespace(String(value ?? ''))
  return /\bDineout\b/i.test(text)
    && /\b(job|jobs|career|careers|role|roles|opening|openings|position|positions|hiring|apply)\b/i.test(text)
}

export const hasVerifiedJobBoardDetailsSignal = (jsonText = '') => {
  const payload = parseJson(jsonText)
  if (!payload || typeof payload !== 'object') {
    return false
  }

  return payload.clientName === 'Swiggy'
    && payload.career_page_url?.url?.list === 'https://careers.swiggy.com/#/careers'
    && payload.career_page_url?.url?.jd === 'https://careers.swiggy.com/#/careers'
    && payload.career_page_url?.url?.application === 'https://careers.swiggy.com/#/careers/apply'
    && payload.career_page_url?.referral_url?.list === JOBS_BOARD_URL
    && !hasDineoutAttributablePublicRoles(jsonText)
}

export const createDineoutScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Dineout verified official consumer homepage no longer matches the known public surface')
    }

    for (const routeUrl of NO_TRUST_PUBLIC_JOB_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)

      if (!isVerifiedRedirectedNoTrustPublicJobRoute(routePage)) {
        throw new Error(`Dineout verified no-trust Dineout job route changed: ${routePage.url || routeUrl}`)
      }
    }

    const careersPage = await fetchPage(CAREERS_URL)
    if (
      careersPage.status !== 200
      || !hasParentCareersLandingSignal(careersPage.html)
      || hasDineoutAttributablePublicRoles(careersPage.html)
    ) {
      throw new Error('Dineout verified Swiggy careers landing page no longer matches the known public surface or now exposes Dineout-attributable public roles')
    }

    const careersIntegrationScript = await fetchPage(CAREERS_INTEGRATION_SCRIPT_URL)
    if (
      careersIntegrationScript.status !== 200
      || extractJobsBoardUrlFromIntegrationScript(careersIntegrationScript.html) !== JOBS_BOARD_URL
      || hasDineoutAttributablePublicRoles(careersIntegrationScript.html)
    ) {
      throw new Error('Dineout verified Swiggy careers integration no longer matches the known public surface')
    }

    const jobsBoardPage = await fetchPage(JOBS_BOARD_URL)
    if (
      jobsBoardPage.status !== 200
      || !hasJobsBoardLandingSignal(jobsBoardPage.html)
      || hasDineoutAttributablePublicRoles(jobsBoardPage.html)
    ) {
      throw new Error('Dineout verified Swiggy jobs board landing page no longer matches the known public surface')
    }

    const jobsBoardDetails = await fetchPage(JOBS_BOARD_DETAILS_URL)
    if (hasDineoutAttributablePublicRoles(jobsBoardDetails.html)) {
      throw new Error('Swiggy job board now exposes Dineout-attributable public roles')
    }

    if (jobsBoardDetails.status !== 200 || !hasVerifiedJobBoardDetailsSignal(jobsBoardDetails.html)) {
      throw new Error('Dineout verified Swiggy job board details no longer match the known public surface')
    }

    return []
  },
})

export const run = async (options = {}) => createDineoutScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
