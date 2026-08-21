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
    'verified-first-party-careers-page+inline-awsm-job-cards+same-domain-detail-links|verified-sucuri-challenge-empty-state',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-15',
  verifiedSurfaceSummary:
    'Verified on Saturday, August 15, 2026 that https://www.techtreeit.com/ and https://www.techtreeit.com/careers/ currently return the same first-party Sucuri challenge shell with the title "You are being redirected...". When this verified blocker state is present across the official homepage and careers page, the scraper returns an empty result instead of upstream-failing. When the public careers page is accessible again, the scraper still extracts inline wp-job-openings cards with same-domain detail links.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'techtreeitsystems/jobs.json',
}

export default TECHTREE_IT_SYSTEMS_CATALOG
