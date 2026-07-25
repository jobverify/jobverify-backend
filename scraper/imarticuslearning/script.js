import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { IMARTICUS_LEARNING_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = IMARTICUS_LEARNING_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const CANONICAL_CAREER_SERVICES_URL = PROVIDER_METADATA.canonicalCareerServicesPage
export const COMPANY_DOMAIN = PROVIDER_METADATA.companyDomain
export const ATS_PLATFORM = PROVIDER_METADATA.atsPlatform
export const COUNTRY_FILTER = PROVIDER_METADATA.countryFilter
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOB_PATTERNS = [
  /\bjob openings?\b/i,
  /\bopen positions?\b/i,
  /\bcurrent openings?\b/i,
  /\bjob description\b/i,
  /\bcareer opportunities\b/i,
  /\bjobposting\b/i,
  /"@type"\s*:\s*"JobPosting"/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /breezy\.hr/i,
  /darwinbox/i,
]

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;|&rsquo;|&#8217;/gi, "'")
  .replace(/&#8211;|&#8212;|&ndash;|&mdash;/gi, '-')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201C\u201D]/g, '"')

const normalizeWhitespace = (value) =>
  decodeHtmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const toAbsoluteUrl = (value, baseUrl = HOMEPAGE_URL) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  return response.text()
}

export const extractCareerPageUrl = (html) => {
  for (const match of String(html ?? '').matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = toAbsoluteUrl(match[1], HOMEPAGE_URL)
    const text = normalizeWhitespace(match[2])?.toLowerCase() || ''

    if (text === 'careers at imarticus' || href === CAREERS_URL) {
      return href
    }
  }

  return null
}

export const hasVerifiedHomepageSignals = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Job Oriented Courses for Freshers & Executives \| Imarticus Learning\s*<\/title>/i.test(page)
    && normalized.includes('Real Learning that delivers your career goals')
    && normalized.includes('3,500+ hiring partners')
    && normalized.includes('Imarticus Learning')
    && extractCareerPageUrl(page) === CAREERS_URL
}

export const hasVerifiedCareerServicesSignals = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Build your dream career with Imarticus Rise\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/imarticus\.org\/building-careers-of-the-future-with-imarticus-rise\/["']/i.test(page)
    && normalized.includes('Building Careers Of The Future')
    && normalized.includes('Benefit From A Global Network Of 3500+ Hiring Partners')
    && normalized.includes("We're passionate about building meaningful careers that create an impact.")
    && normalized.includes('Imarticus Rise')
}

export const hasPublicEmployerJobSignals = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return PUBLIC_JOB_PATTERNS.some((pattern) => pattern.test(page) || pattern.test(normalized))
}

export const createImarticusLearningScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasVerifiedHomepageSignals(homepageHtml)) {
      throw new Error('Imarticus Learning verified homepage no longer matches the known first-party surface')
    }
    if (hasPublicEmployerJobSignals(homepageHtml)) {
      throw new Error('Imarticus Learning homepage now appears to expose a public jobs surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (hasPublicEmployerJobSignals(careersHtml)) {
      throw new Error('Imarticus Learning careers page now appears to expose a public jobs surface')
    }
    if (!hasVerifiedCareerServicesSignals(careersHtml)) {
      throw new Error('Imarticus Learning verified career services page no longer matches the known first-party surface')
    }

    return []
  },
})

export const run = async (options = {}) => createImarticusLearningScraper().run(options)

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
