import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { SAARTHI_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const ABOUT_URL = PROVIDER_METADATA.companyCareerPage
export const PUBLIC_MARKETPLACE_URL = PROVIDER_METADATA.publicMarketplaceUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/[‐-―]/g, '-')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

export const hasOfficialAboutPageSignal = (html = '') => {
  const text = normalizeWhitespace(html)

  return text.includes('About Saarthi - AI Career Coach for Freshers')
    && text.includes('About Us')
    && text.includes('Saarthi - AI Career Coach for Early Talent')
    && text.includes('We built Saarthi because finding your first job is unnecessarily painful.')
    && text.includes('Saarthi tracks 15,000+ companies every day and pulls together every fresher job, walk-in drive, and off-campus opportunity we can find.')
    && text.includes("India's fresher job app - connecting students to fresher jobs, internships, off campus drives, and hybrid opportunities across India.")
    && text.includes('Become Campus Ambassador')
}

export const hasOfficialMarketplaceSignal = (html = '') => {
  const text = normalizeWhitespace(html)

  return text.includes('Saarthi - Best App for Fresher Jobs & Internships in India')
    && text.includes('Land Your First Fresher Job or Internship in India')
    && text.includes('Saarthi brings every fresher job in India, internship, off campus drive, and hybrid opportunity to one place.')
    && text.includes('10,000+ students have already found fresher jobs and internships using Saarthi.')
    && text.includes('10,000+ verified jobs')
    && text.includes('Latest Jobs')
    && text.includes('Latest Drives')
    && text.includes('No Fake Listings. No Ghost Jobs. Ever.')
}

export const hasThirdPartyMarketplaceSignal = (html = '') => {
  const text = normalizeWhitespace(html)

  return text.includes('SLB Data Scientist')
    && text.includes('Honeywell International')
    && text.includes('Bayer')
    && text.includes('American Chase Off Campus Drive 2026 - Associate System Engineer')
    && text.includes('NielsenIQ Off Campus Drive 2026 - Data Operations Analyst')
    && text.includes('IndiaMART Off Campus Drive 2026: Associate Engineer')
    && text.includes('Every job, internship, and off campus drive on Saarthi is manually verified.')
}

export const hasExactCompanyHiringSignal = (html = '') => {
  const text = normalizeWhitespace(html)

  return /careers at saarthi/i.test(text)
    || /join saarthi/i.test(text)
    || /work at saarthi/i.test(text)
    || /current openings/i.test(text)
    || /open roles at saarthi/i.test(text)
}

export const createSaarthiScraper = () => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const aboutHtml = await fetchText(ABOUT_URL)
    if (hasExactCompanyHiringSignal(aboutHtml)) {
      throw new Error('Saarthi surface now appears to expose Saarthi jobs')
    }

    if (!hasOfficialAboutPageSignal(aboutHtml)) {
      throw new Error('Saarthi verified official about page no longer matches the trusted first-party surface')
    }

    const marketplaceHtml = await fetchText(PUBLIC_MARKETPLACE_URL)
    if (hasExactCompanyHiringSignal(marketplaceHtml)) {
      throw new Error('Saarthi surface now appears to expose Saarthi jobs')
    }

    if (!hasOfficialMarketplaceSignal(marketplaceHtml)) {
      throw new Error('Saarthi verified marketplace surface no longer matches the trusted first-party surface')
    }

    if (!hasThirdPartyMarketplaceSignal(marketplaceHtml)) {
      throw new Error('Saarthi verified third-party marketplace surface no longer matches the trusted first-party surface')
    }

    return []
  },
})

export const run = async (options = {}) => createSaarthiScraper().run(options)

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
