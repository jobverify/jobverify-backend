import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { withRetry } from '../utils/retry.js'

import { provider as PROVIDER_METADATA } from './provider.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export { PROVIDER_METADATA }
export const HOMEPAGE_URL = PROVIDER_METADATA.companyCareerPage
export const CONTACT_URL = PROVIDER_METADATA.contactPageUrl
export const ROBOTS_TXT_URL = PROVIDER_METADATA.robotsTxtUrl
export const SITEMAP_URL = PROVIDER_METADATA.sitemapUrl
export const CAREERS_ROUTE_URLS = [
  'https://aavishkaargroup.com/careers/',
  'https://aavishkaargroup.com/career/',
  'https://aavishkaargroup.com/jobs/',
  'https://aavishkaargroup.com/job/',
  'https://aavishkaargroup.com/join-us/',
  'https://aavishkaargroup.com/work-with-us/',
  'https://aavishkaargroup.com/openings/',
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
  .replace(/&#39;|&apos;|&rsquo;|&lsquo;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
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
    return hostname === 'aavishkaargroup.com' || hostname === 'www.aavishkaargroup.com'
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

  return /href=["'](?:https?:\/\/(?:www\.)?aavishkaargroup\.com)?\/(?:career|careers|jobs?|join-us|work-with-us|openings)(?:\/|["'#?])/i.test(rawHtml)
    || /href=["']\/(?:career|careers|jobs?|join-us|work-with-us|openings)(?:\/|["'#?])/i.test(rawHtml)
}

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeText(rawHtml)

  return /<title>\s*Aavishkaar Group: One of the largest Impact Platforms across the Global South\s*<\/title>/i.test(rawHtml)
    && normalized.includes('we exist to bridge the opportunity gap for the emerging 3 billion')
    && normalized.includes('we do this by emboldening entrepreneurs or becoming one.')
    && normalized.includes('building impact investing ecosystems')
    && /140 mn\+\s+underserved customers(?:\s+\([^)]+\))?\s+supported through our investments and engagements/i.test(normalized)
    && normalized.includes('latest news')
    && /href=["']https:\/\/aavishkaargroup\.com\/contact-us\/["']/i.test(rawHtml)
}

export const hasOfficialContactPageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeText(rawHtml)

  return /<title>\s*Contact Us - Aavishkaar Group\s*<\/title>/i.test(rawHtml)
    && normalized.includes('get in touch')
    && normalized.includes('info@aavishkaargroup.com')
    && normalized.includes('mumbai')
    && normalized.includes('bandra kurla complex')
    && normalized.includes('delhi')
    && normalized.includes('whitehouse nbcc plaza')
    && normalized.includes('nairobi')
}

export const hasOpenRobotsSignal = (text) => {
  const normalized = String(text ?? '')

  return /User-agent:\s*\*/i.test(normalized)
    && /Disallow:\s*$/im.test(normalized)
    && /Sitemap:\s*https:\/\/aavishkaargroup\.com\/sitemap_index\.xml/i.test(normalized)
    && /YOAST BLOCK/i.test(normalized)
}

export const hasVerifiedSitemapIndex = (xml) => {
  const normalized = String(xml ?? '')

  return /<sitemapindex\b/i.test(normalized)
    && /https:\/\/aavishkaargroup\.com\/page-sitemap\.xml/i.test(normalized)
    && /https:\/\/aavishkaargroup\.com\/group-companies-sitemap\.xml/i.test(normalized)
    && /Yoast SEO/i.test(normalized)
}

export const isVerifiedMissingCareersRoute = (page = {}) => {
  const rawHtml = String(page.html ?? '')
  const normalized = normalizeText(rawHtml)

  return Number(page.status) === 404
    && isOfficialDomainUrl(page.url || '')
    && /<title>\s*Page not found \| Aavishkaar\s*<\/title>/i.test(rawHtml)
    && normalized.includes('404')
    && normalized.includes('page not found')
    && normalized.includes("we're sorry, we couldn't find the page you requested")
    && !hasPublicJobsSignal(rawHtml)
    && !hasFirstPartyCareerLikeLink(rawHtml)
}

export const createAavishkarScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Aavishkar homepage no longer matches the verified first-party surface')
    }
    if (hasPublicJobsSignal(homepage.html)) {
      throw new Error('Aavishkar homepage now appears to expose public jobs')
    }
    if (hasFirstPartyCareerLikeLink(homepage.html)) {
      throw new Error('Aavishkar homepage now exposes a first-party careers or jobs link')
    }

    const contactPage = await fetchPage(CONTACT_URL)
    if (contactPage.status !== 200 || !hasOfficialContactPageSignal(contactPage.html)) {
      throw new Error('Aavishkar contact page no longer matches the verified first-party surface')
    }
    if (hasPublicJobsSignal(contactPage.html) || hasFirstPartyCareerLikeLink(contactPage.html)) {
      throw new Error('Aavishkar contact page now appears to expose a careers or jobs surface')
    }

    const robotsTxt = await fetchPage(ROBOTS_TXT_URL)
    if (robotsTxt.status !== 200 || !hasOpenRobotsSignal(robotsTxt.html)) {
      throw new Error('Aavishkar robots.txt no longer matches the verified first-party surface')
    }

    const sitemap = await fetchPage(SITEMAP_URL)
    if (sitemap.status !== 200 || !hasVerifiedSitemapIndex(sitemap.html)) {
      throw new Error('Aavishkar sitemap no longer matches the verified first-party surface')
    }

    for (const careersRouteUrl of CAREERS_ROUTE_URLS) {
      const careersRoute = await fetchPage(careersRouteUrl)
      if (!isVerifiedMissingCareersRoute(careersRoute)) {
        throw new Error(`Aavishkar careers route changed materially or now exposes public jobs: ${careersRouteUrl}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createAavishkarScraper().run(options)

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
