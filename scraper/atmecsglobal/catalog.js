import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 18, 2026 that https://atmecs.com/jobs/ is the live first-party ATMECS Global jobs route, but the page still renders only the literal placeholder shortcode "[jobs]" instead of public role cards, job detail pages, or a first-party ATS handoff. Because the verified jobs route is placeholder-only and exposes no trustworthy public jobs surface, this provider is pinned as a fail-closed sentinel that returns an empty set until ATMECS publishes real first-party listings.'

export const ATMECS_GLOBAL_CATALOG = {
  source: 'atmecsglobal',
  companyName: 'ATMECS Global',
  officialBrandName: 'ATMECS Global',
  adapter: 'script',
  homepageUrl: 'https://atmecs.com/',
  companyCareerPage: 'https://atmecs.com/jobs/',
  officialCareersPageUrl: 'https://atmecs.com/jobs/',
  companyDomain: 'atmecs.com',
  atsPlatform: 'official-first-party-jobs-page-placeholder-shortcode',
  countryFilter: 'India',
  paginationStrategy: 'single-jobs-page-placeholder-shortcode-validation',
  extractionStrategy:
    'verified-first-party-jobs-page+verified-placeholder-shortcode-without-public-listings+return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'atmecsglobal/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default ATMECS_GLOBAL_CATALOG
