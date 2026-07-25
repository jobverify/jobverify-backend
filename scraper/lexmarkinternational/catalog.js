import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 18, 2026 that https://www.lexmark.com/en_us/about-us/careers.html was the official Lexmark careers page and still handed off job discovery to https://lexmark.wd1.myworkdayjobs.com/Lexmark, but that public Workday board currently resolved to the Workday outage page https://community.workday.com/outage-page/40755 instead of a trustworthy job board. This local provider therefore stays fail-closed and returns an empty set until the first-party board becomes publicly usable again.'

export const LEXMARK_INTERNATIONAL_CATALOG = {
  source: 'lexmarkinternational',
  companyName: 'Lexmark International',
  officialBrandName: 'Lexmark',
  adapter: 'script',
  homepageUrl: 'https://www.lexmark.com/',
  companyCareerPage: 'https://www.lexmark.com/en_us/about-us/careers.html',
  officialCareersPageUrl: 'https://www.lexmark.com/en_us/about-us/careers.html',
  officialWorkdayBoardUrl: 'https://lexmark.wd1.myworkdayjobs.com/Lexmark',
  workdayOutageCanonicalUrl: 'https://community.workday.com/outage-page/40755',
  companyDomain: 'lexmark.com',
  atsPlatform: 'official-careers-page-workday-outage-sentinel',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-careers-page-plus-workday-outage-sentinel',
  extractionStrategy:
    'verified-first-party-careers-page+verified-workday-handoff+verified-workday-outage+return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedPublicJobCount: 0,
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'lexmarkinternational/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default LEXMARK_INTERNATIONAL_CATALOG
