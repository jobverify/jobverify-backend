import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { withRetry } from '../../scraper-support/utils/retry.js'

import { AAYUSHMAN_TECH_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = AAYUSHMAN_TECH_CATALOG.source
export const COMPANY = AAYUSHMAN_TECH_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = AAYUSHMAN_TECH_CATALOG.officialBrandName
export const LEGAL_ENTITY_NAME = AAYUSHMAN_TECH_CATALOG.legalEntityName
export const VERIFIED_ON = AAYUSHMAN_TECH_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = AAYUSHMAN_TECH_CATALOG.verifiedSurfaceSummary
export const PROVIDER_METADATA = AAYUSHMAN_TECH_CATALOG
export const HOMEPAGE_URL = AAYUSHMAN_TECH_CATALOG.companyCareerPage
export const COMPANY_PAGE_URL = AAYUSHMAN_TECH_CATALOG.companyPageUrl
export const CAREERS_ROUTE_URLS = [
  'https://www.aayushmantech.com/careers',
  'https://www.aayushmantech.com/career',
  'https://www.aayushmantech.com/jobs',
  'https://www.aayushmantech.com/job',
  'https://www.aayushmantech.com/join-us',
  'https://www.aayushmantech.com/openings',
  'https://www.aayushmantech.com/work-with-us',
  'https://www.aayushmantech.com/hiring',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions?\b/i,
  /\bjob openings?\b/i,
  /\bcareer opportunities\b/i,
  /\bsearch jobs\b/i,
  /\bview openings\b/i,
  /\bjoin our team\b/i,
  /\bwe(?:'re| are)\s+hiring\b/i,
  /\bapply now\b/i,
  /\bapply here\b/i,
  /\bjob description\b/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /successfactors/i,
  /oraclecloud/i,
  /darwinbox/i,
  /icims/i,
  /taleo/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&copy;|©/gi, 'copyright')
  .replace(/&#39;|&apos;|&rsquo;|&lsquo;|&#x27;|\u2019/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;|\u201c|\u201d/gi, '"')
  .replace(/&#8211;|&ndash;|\u2013|\u2014/gi, '-')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeText = (value) => normalizeWhitespace(value).toLowerCase()

const stripScriptAndStyle = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')

const isOfficialDomainUrl = (value) => {
  try {
    const hostname = new URL(value).hostname.toLowerCase()
    return hostname === 'aayushmantech.com' || hostname === 'www.aayushmantech.com'
  } catch {
    return false
  }
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

export const hasPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasFirstPartyCareerLikeLink = (html) => {
  const rawHtml = stripScriptAndStyle(html)

  return /href=["'](?:https?:\/\/(?:www\.)?aayushmantech\.com)?\/(?:career|careers|jobs?|join-us|openings|work-with-us|hiring)(?:\/|["'#?])/i.test(rawHtml)
    || /href=["']\/(?:career|careers|jobs?|join-us|openings|work-with-us|hiring)(?:\/|["'#?])/i.test(rawHtml)
}

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeText(rawHtml)

  return /<title>\s*Aayushman Technologies\s*-\s*Your Partner in Web Development,\s*Digital Marketing,\s*and App Solutions\s*<\/title>/i.test(rawHtml)
    && normalized.includes('a design & technology focused digital agency')
    && normalized.includes("empower your business's digital journey with aayushman's transformative web development solutions.")
    && normalized.includes('hire experienced developers')
    && normalized.includes('why partner with aayushman')
    && normalized.includes('info@aayushmantechnologies.in')
    && normalized.includes('+91 9930291005')
    && normalized.includes('copyright 2025 by aayushman tech services pvt. ltd.')
}

export const hasOfficialCompanyPageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeText(rawHtml)

  return /<title>\s*Company\s*\|\s*Aayushman\s*<\/title>/i.test(rawHtml)
    && normalized.includes("we're aayushman")
    && normalized.includes("we're on a mission to digitalise your business")
    && normalized.includes('our story')
    && normalized.includes('established by a team of seasoned digital professionals')
    && normalized.includes('try us for free')
    && normalized.includes('info@aayushmantechnologies.in')
    && normalized.includes('+91 9930291005')
    && normalized.includes('copyright 2025 by aayushman tech services pvt. ltd.')
}

export const isVerifiedMissingFirstPartyRoute = (page = {}) =>
  Number(page.status) === 404
  && isOfficialDomainUrl(page.url || '')
  && !hasPublicJobsSignal(page.html)
  && !hasFirstPartyCareerLikeLink(page.html)

export const createAayushmanTechScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Aayushman Tech homepage no longer matches the verified first-party surface')
    }
    if (hasPublicJobsSignal(homepage.html)) {
      throw new Error('Aayushman Tech homepage now appears to expose public jobs')
    }
    if (hasFirstPartyCareerLikeLink(homepage.html)) {
      throw new Error('Aayushman Tech homepage now exposes a first-party careers or jobs link')
    }

    const companyPage = await fetchPage(COMPANY_PAGE_URL)
    if (companyPage.status !== 200 || !hasOfficialCompanyPageSignal(companyPage.html)) {
      throw new Error('Aayushman Tech company page no longer matches the verified first-party surface')
    }
    if (hasPublicJobsSignal(companyPage.html) || hasFirstPartyCareerLikeLink(companyPage.html)) {
      throw new Error('Aayushman Tech company page now appears to expose a careers or jobs surface')
    }

    for (const careersRouteUrl of CAREERS_ROUTE_URLS) {
      const careersRoute = await fetchPage(careersRouteUrl)
      if (!isVerifiedMissingFirstPartyRoute(careersRoute)) {
        throw new Error(`Aayushman Tech careers route changed materially or now exposes public jobs: ${careersRouteUrl}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createAayushmanTechScraper().run(options)

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
