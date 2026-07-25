import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const WEBKUL_SOFTWARE_CATALOG = {
  source: 'webkulsoftware',
  companyName: 'Webkul Software',
  officialBrandName: 'Webkul Software',
  adapter: 'script',
  companyCareerPage: 'https://webkul.com/jobs/',
  careersLandingUrl: 'https://webkul.com/careers/',
  jobsPageUrl: 'https://webkul.com/jobs/',
  companyDomain: 'webkul.com',
  atsPlatform: 'official-company-site-jobs-pages',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-jobs-page-html',
  extractionStrategy: 'verified-first-party-jobs-page+detail-pages+inline-open-position-cards',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://webkul.com/jobs/ is the live first-party jobs surface for Webkul Software, that it renders inline Open Positions cards linking to first-party detail pages such as IT Cloud Engineer and Performance Marketing Specialist, and that those detail pages expose Job Location, Education, and JobPosting metadata on webkul.com.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'webkulsoftware/jobs.json',
}

export default WEBKUL_SOFTWARE_CATALOG
