import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const R_LOGIC_TECHNOLOGY_SERVICES_CATALOG = {
  source: 'rlogictechnologyservices',
  companyName: 'R-Logic Technology Services',
  officialBrandName: 'R-Logic',
  adapter: 'script',
  companyCareerPage: 'https://www.r-logic.com/careers-culture/',
  contactPageUrl: 'https://www.r-logic.com/contact-us/',
  companyDomain: 'r-logic.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-careers-culture-page-contact-handoff',
  extractionStrategy: 'verified-first-party-careers-culture-page+contact-handoff+no-public-job-listings',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.r-logic.com/careers-culture/ is the live first-party careers-and-culture page for R-Logic, that it presents Join Our Team and a Get Started button which routes candidates to https://www.r-logic.com/contact-us/, and that the surface exposes no trustworthy public job listings or structured openings.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'rlogictechnologyservices/jobs.json',
}

export default R_LOGIC_TECHNOLOGY_SERVICES_CATALOG
