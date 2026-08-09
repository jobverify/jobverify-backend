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
  verifiedOn: '2026-08-03',
  verifiedSurfaceSummary:
    'Verified on Monday, August 3, 2026 that https://www.magmainsurance.com/fi/more/career and https://www.magmainsurance.com/career remained live first-party Magma Insurance careers routes. The primary page title now ends with "- Magma" and the alternate route uses the singular "Career" title, but both first-party pages still expose only a generic Apply for Job form with fields including Educational Qualification, Insurance Experience, Location, and Upload CV, with no trustworthy public job listings surface or current openings surface.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'magmageneralinsurance/jobs.json',
}

export default MAGMA_GENERAL_INSURANCE_CATALOG
