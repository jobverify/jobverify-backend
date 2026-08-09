import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { LAVA_INTERNATIONAL_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = LAVA_INTERNATIONAL_CATALOG.source
export const COMPANY = LAVA_INTERNATIONAL_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = LAVA_INTERNATIONAL_CATALOG.officialBrandName
export const VERIFIED_ON = LAVA_INTERNATIONAL_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = LAVA_INTERNATIONAL_CATALOG.verifiedSurfaceSummary
export const PROVIDER_METADATA = LAVA_INTERNATIONAL_CATALOG
export const HOMEPAGE_URL = LAVA_INTERNATIONAL_CATALOG.homepageUrl
export const ABOUT_PAGE_URL = LAVA_INTERNATIONAL_CATALOG.aboutPageUrl
export const CAREERS_URL = LAVA_INTERNATIONAL_CATALOG.companyCareerPage
export const APPLICATION_EMAIL = LAVA_INTERNATIONAL_CATALOG.applicationEmail
export const APPLICATION_URL = LAVA_INTERNATIONAL_CATALOG.applicationUrl
export const NO_PUBLIC_CAREER_ROUTE_URLS = [
  'https://shop.lavamobiles.com/careers',
  'https://shop.lavamobiles.com/jobs',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOB_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions?\b/i,
  /\bjob openings?\b/i,
  /\bcareer opportunities\b/i,
  /\bsearch jobs\b/i,
  /\bapply now\b/i,
  /\bjob description\b/i,
  /\bview all open positions\b/i,
  /href=["'][^"']*\/jobs\/[^"']*["']/i,
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
  /icims/i,
  /taleo/i,
]

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return {
    ok: response.ok,
    status: response.status,
    url: response.url,
    text: await response.text(),
  }
}

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&lsquo;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/â€™|â€˜/g, "'")
  .replace(/â€œ|â€�/g, '"')
  .replace(/Â©/g, '©')
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const isOfficialDomainUrl = (value) => {
  try {
    const hostname = new URL(value).hostname.replace(/^www\./i, '').toLowerCase()
    return hostname === 'shop.lavamobiles.com' || hostname === 'lavamobiles.com'
  } catch {
    return false
  }
}

export const hasOfficialAboutPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*About Us\b/i.test(page)
    && normalized.includes('OUR CULTURE AND PHILOSOPHY')
    && normalized.includes('A strong culture is what separates great companies from those that perish sooner or later.')
    && normalized.includes('To empower people to do more, to be more.')
    && normalized.includes('Hari Om Rai')
    && normalized.includes('Started in 2009 | 30,000+ people | Most Trusted Brand in India')
    && normalized.includes('Lava International Limited is a leading Mobile Handset Company in India')
    && normalized.includes('Head Office: Noida, India')
  }

export const hasResumeOnlyCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*career\b/i.test(page)
    && normalized.includes("It's an opportunity that lets you create possibilities.")
    && normalized.includes('Join two of the fastest growing consumer brands in India - Lava and Xolo.')
    && normalized.includes('Come join us and together lets create products that make a difference for the rest of the world.')
    && normalized.includes('To explore the opportunities at Lava, please share your updated Resume on mail id : careers@lavainternational.in')
    && /mailto:careers@lavainternational\.in/i.test(page)
    && /Copyright\s*(?:©\s*)?Lava International Limited/i.test(normalized)
  }

export const pageExposesPublicJobListings = (html = '') =>
  PUBLIC_JOB_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const isVerifiedMissingCareerRoute = (page = {}) => {
  const html = String(page.text ?? page.html ?? '')

  return Number(page.status) === 404
    && isOfficialDomainUrl(page.url || '')
    && !pageExposesPublicJobListings(html)
}

export const createLavaInternationalScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const aboutPage = await fetchPage(ABOUT_PAGE_URL)
    if (Number(aboutPage.status) !== 200 || !hasOfficialAboutPageSignal(aboutPage.text)) {
      throw new Error('The verified official about page for Lava International no longer matches the first-party surface')
    }

    if (pageExposesPublicJobListings(aboutPage.text)) {
      throw new Error('The official Lava International about page now appears to expose public job listings')
    }

    const careersPage = await fetchPage(CAREERS_URL)
    if (Number(careersPage.status) !== 200 || !hasResumeOnlyCareersSignal(careersPage.text)) {
      throw new Error('The verified Lava International resume-only careers page no longer matches the first-party surface')
    }

    if (pageExposesPublicJobListings(careersPage.text)) {
      throw new Error('The official Lava International careers page now appears to expose public job listings')
    }

    for (const routeUrl of NO_PUBLIC_CAREER_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)
      if (!isVerifiedMissingCareerRoute(routePage)) {
        throw new Error(`Lava International verified no-public-careers route changed: ${routePage.url || routeUrl}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createLavaInternationalScraper().run(options)

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
