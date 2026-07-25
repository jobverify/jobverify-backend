import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const TECHTREE_IT_SYSTEMS_CATALOG = {
  source: 'techtreeitsystems',
  companyName: 'Techtree It Systems',
  officialBrandName: 'TechTree IT System Pvt Ltd',
  adapter: 'script',
  homepageUrl: 'https://www.techtreeit.com/',
  companyCareerPage: 'https://www.techtreeit.com/careers/',
  companyDomain: 'techtreeit.com',
  atsPlatform: 'wp-job-openings',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-awsm-careers-page',
  extractionStrategy:
    'verified-first-party-careers-page+inline-awsm-job-cards+same-domain-detail-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.techtreeit.com/careers/ is the live first-party TechTree IT careers page linked from the exact-name homepage nav, and that it exposes inline wp-job-openings cards with same-domain detail links including UI Developer, Associate QA Engineer, Associate Business Consultant, Sr. Power Bi Developer, and SQL Developer.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'techtreeitsystems/jobs.json',
}

export default TECHTREE_IT_SYSTEMS_CATALOG
