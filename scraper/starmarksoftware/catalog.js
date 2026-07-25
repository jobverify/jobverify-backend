import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const STARMARK_SOFTWARE_CATALOG = {
  source: 'starmarksoftware',
  companyName: 'Starmark Software',
  officialBrandName: 'Starmark Software',
  adapter: 'script',
  homepageUrl: 'https://www.starmarksv.com/',
  companyCareerPage: 'https://www.starmarksv.com/careers.html',
  companyDomain: 'starmarksv.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-public-careers-shell',
  extractionStrategy: 'verified-careers-shell+resume-handoff-without-public-role-cards-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.starmarksv.com/careers.html is the live first-party Starmark Software careers shell and that it advertises an "Open Positions" section plus a resume handoff to careers@starmarksoftware.com, but the public first-party HTML does not expose trustworthy structured role cards or detail pages that can be scraped exactly. This local provider therefore fails closed until Starmark publishes a public job list.',
  dryRunFile: 'starmarksoftware/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default STARMARK_SOFTWARE_CATALOG
