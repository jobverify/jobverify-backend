import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const MAGMA_GENERAL_INSURANCE_CATALOG = {
  source: 'magmageneralinsurance',
  companyName: 'Magma General Insurance',
  officialBrandName: 'Magma Insurance',
  adapter: 'script',
  homepageUrl: 'https://www.magmainsurance.com/',
  companyCareerPage: 'https://www.magmainsurance.com/fi/more/career',
  alternateCareerPageUrl: 'https://www.magmainsurance.com/career',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'validated-first-party-careers-form-pages',
  extractionStrategy:
    'verified-primary-and-alternate-careers-form-pages+no-public-role-listings-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'magmainsurance.com',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.magmainsurance.com/fi/more/career and https://www.magmainsurance.com/career were live first-party Magma Insurance careers routes. Both first-party pages exposed a generic Apply for Job form with fields including Educational Qualification, Insurance Experience, Location, and Upload CV, but no trustworthy public job listings surface or current openings surface.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'magmageneralinsurance/jobs.json',
}

export default MAGMA_GENERAL_INSURANCE_CATALOG
