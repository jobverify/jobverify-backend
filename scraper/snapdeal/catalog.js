import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SNAPDEAL_CATALOG = {
  source: 'snapdeal',
  companyName: 'Snapdeal',
  officialBrandName: 'Snapdeal',
  adapter: 'script',
  companyCareerPage: 'https://www.snapdeal.com/',
  officialCareersPageUrl: 'https://www.snapdeal.com/',
  officialCareersHandoffUrl: 'https://snapdeal.darwinbox.in/ms/candidate/careers',
  darwinboxOrigin: 'https://snapdeal.darwinbox.in',
  darwinboxCompanyId: 'main',
  companyDomain: 'snapdeal.com',
  atsPlatform: 'darwinbox',
  countryFilter: 'India',
  paginationStrategy: 'browser-session-darwinbox-pagination',
  extractionStrategy: 'official-homepage-footer-careers-link+darwinbox-listing-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that the official Snapdeal homepage at https://www.snapdeal.com/ exposed a first-party Careers footer link that handed job seekers to the official Darwinbox candidate portal at https://snapdeal.darwinbox.in/ms/candidate/careers. This exact-name provider is pinned to that verified homepage footer handoff and uses the repo\'s Darwinbox listing pattern for public India roles.',
  dryRunFile: 'snapdeal/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default SNAPDEAL_CATALOG
