import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const SOURCE = 'selectsys'
export const COMPANY = 'Selectsys'
export const HOMEPAGE_URL = 'https://www.selectsys.com/'
export const CAREERS_URL = 'https://www.selectsys.com/careers'
export const APPLICATION_EMAIL = 'hr@selectsys.com'
export const ROLE_LIST_LABEL = "Roles We're Hiring For"
export const ROLE_LOCATION = 'Remote-first (U.S. and India hubs)'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  officialBrandName: 'Selectsys',
  adapter: 'script',
  modulePath: '../selectsys/script.js',
  homepageUrl: HOMEPAGE_URL,
  companyCareerPage: CAREERS_URL,
  atsPlatform: 'official-company-careers-email-apply',
  countryFilter: 'India',
  paginationStrategy: 'single-page-static-role-list',
  extractionStrategy: 'verified-first-party-careers-page+same-page-role-list+email-apply',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'selectsys.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.selectsys.com/careers was the live first-party Selectsys careers page, that it publicly listed six hiring titles under Roles We\'re Hiring For, and that candidates were instructed to email resumes to hr@selectsys.com with the job title in the subject line.',
  dryRunFile: 'selectsys/jobs.json',
}

const normalizeWhitespace = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const extractSection = (html, heading) => {
  const page = String(html ?? '')
  const pattern = new RegExp(
    `<h[1-6][^>]*>\\s*${escapeRegExp(heading)}\\s*<\\/h[1-6]>([\\s\\S]*?)(?:<h[1-6][^>]*>|$)`,
    'i',
  )
  return page.match(pattern)?.[1] ?? ''
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  return page.includes('Careers at Selectsys')
    && page.includes(ROLE_LIST_LABEL)
    && page.includes(APPLICATION_EMAIL)
    && page.includes('Selectsys is a global team across the U.S. and India')
}

export const extractRoles = (html = '') =>
  [...extractSection(html, ROLE_LIST_LABEL).matchAll(/<li>([\s\S]*?)<\/li>/gi)]
    .map((match) => normalizeWhitespace(match[1]))
    .filter(Boolean)

export const buildApplyUrl = (title) =>
  `mailto:${APPLICATION_EMAIL}?subject=${encodeURIComponent(`Application for ${title}`)}`

export const run = async ({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) => {
  const careersHtml = await fetchText(CAREERS_URL)
  if (!hasOfficialCareersSignal(careersHtml)) {
    throw new Error('Selectsys verified first-party careers page changed materially')
  }

  const roles = extractRoles(careersHtml)
  if (!roles.length) {
    throw new Error('Selectsys verified first-party careers page no longer exposes public role titles')
  }

  return roles.map((title) => {
    const applyUrl = buildApplyUrl(title)
    return {
      title,
      location: ROLE_LOCATION,
      applyUrl,
      sourceUrl: CAREERS_URL,
      company: COMPANY,
      country: 'India',
      link: applyUrl,
      source: SOURCE,
      scrapedAt: now(),
    }
  })
}
