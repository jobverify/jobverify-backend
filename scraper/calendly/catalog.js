import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 25, 2026 that https://calendly.com/careers is the live official Calendly careers page with the Careers at Calendly hero, Join us in creating better meeting experiences headline, and Open roles section, and that Calendly\'s public Greenhouse board is live at https://job-boards.greenhouse.io/calendly. The public Greenhouse feed at https://boards-api.greenhouse.io/v1/boards/calendly/jobs?content=true returned 14 live roles on the verified date, all in US locations such as Remote - US and San Francisco (Hybrid). No India roles were present in the verified public feed, so this provider currently returns an honest empty India slice while the trusted public surface remains unchanged.'

export const CALENDLY_CATALOG = {
  source: 'calendly',
  companyName: 'Calendly',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'calendly/jobs.json',
  companyCareerPage: 'https://calendly.com/careers',
  greenhouseBoardUrl: 'https://job-boards.greenhouse.io/calendly',
  greenhouseJobsApiUrl: 'https://boards-api.greenhouse.io/v1/boards/calendly/jobs',
  companyDomain: 'calendly.com',
  verifiedPublicJobCount: 14,
  verifiedIndiaJobCount: 0,
  atsPlatform: 'greenhouse',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-careers-page-plus-single-greenhouse-jobs-api',
  extractionStrategy:
    'verified-first-party-careers-page+greenhouse-jobs-api+greenhouse-detail-url-canonicalization+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-25',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default CALENDLY_CATALOG
