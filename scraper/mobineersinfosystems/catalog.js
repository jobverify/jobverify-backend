import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const MOBINEERS_INFO_SYSTEMS_CATALOG = {
  source: 'mobineersinfosystems',
  companyName: 'Mobineers Info Systems',
  officialBrandName: 'Mobineers Info Systems Pvt. Ltd.',
  adapter: 'script',
  homepageUrl: 'https://mobineers.com/',
  companyCareerPage: 'https://mobineers.com/career/',
  companyDomain: 'mobineers.com',
  atsPlatform: 'first-party-careers-page',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-listing-page-plus-detail-pages',
  extractionStrategy: 'verified-first-party-careers-page+job-card-links+detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://mobineers.com/career/ remained the live first-party Mobineers Info Systems careers page and visibly listed recent jobs including QA Automation Tester, SQL DEVELOPER, and Sr. Business Developer. A verified detail page such as https://mobineers.com/jobs/qa-automation-tester/ exposed the title, Delhi location, and apply form on the same first-party domain, so this local provider reads the first-party listing page and follows job-card links to trusted detail pages.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'mobineersinfosystems/jobs.json',
}

export default MOBINEERS_INFO_SYSTEMS_CATALOG
