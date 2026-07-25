import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const MIRACLE_SOFTWARE_SYSTEMS_CATALOG = {
  source: 'miraclesoftwaresystems',
  companyName: 'Miracle Software Systems',
  officialBrandName: 'Miracle Software Systems, Inc.',
  adapter: 'script',
  homepageUrl: 'https://www.miraclesoft.com/',
  companyCareerPage: 'https://careers.miraclesoft.com/',
  companyDomain: 'miraclesoft.com',
  atsPlatform: 'first-party-careers-site',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-open-positions-page',
  extractionStrategy: 'verified-first-party-careers-page+visible-open-position-cards',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://careers.miraclesoft.com/ is the live first-party Miracle Software Systems careers page and that it publicly lists visible open positions including NAVISION 2009 Consultant and Unily/SharePoint Developer at Miracle Heights, India with Apply Now links to first-party detail pages. This local provider reads those visible job cards directly from the first-party careers page.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'miraclesoftwaresystems/jobs.json',
}

export default MIRACLE_SOFTWARE_SYSTEMS_CATALOG
