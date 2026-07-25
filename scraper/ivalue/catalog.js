import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 16, 2026 that both https://ivaluegroup.com/working-at-ivalue/ and https://ivaluegroup.com/en-in/careers/working-at-ivalue/ currently return an Incapsula noindex interstitial rather than a trustworthy scrapeable careers page. Also verified that the public iValue Group jobs board at https://ivgroup.greythr.com/hire/jobs/ is live, the GreytHR company details API at https://ivgroup.greythr.com/hire/api/career/get_company_details/ identifies iValue Group and https://ivaluegroup.com/, the public GreytHR employment category catalog at https://ivgroup.greythr.com/hire/api/greythr/emp-category/ exposes India location values such as Mumbai, Delhi, Ahmedabad, and Bangalore, and the public published jobs API at https://ivgroup.greythr.com/hire/api/career/published_jobs/ returns 36 India roles.'

export const IVALUE_CATALOG = {
  source: 'ivalue',
  companyName: 'iValue',
  officialBrandName: 'iValue Group',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'ivalue/jobs.json',
  companyCareerPage: 'https://ivaluegroup.com/en-in/careers/working-at-ivalue/',
  legacyCareerPageUrl: 'https://ivaluegroup.com/working-at-ivalue/',
  verifiedPublicJobsPageUrl: 'https://ivgroup.greythr.com/hire/jobs/',
  companyDetailsUrl: 'https://ivgroup.greythr.com/hire/api/career/get_company_details/',
  employmentCategoriesUrl: 'https://ivgroup.greythr.com/hire/api/greythr/emp-category/',
  jobsApiUrl: 'https://ivgroup.greythr.com/hire/api/career/published_jobs/',
  companyDomain: 'ivaluegroup.com',
  officialHomepageUrl: 'https://ivaluegroup.com/',
  atsPlatform: 'greythr',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-block-verification-plus-greythr-published-jobs-api',
  extractionStrategy:
    'verified-blocked-official-careers-pages+verified-greythr-jobs-page+greythr-company-details+greythr-location-catalog+published-jobs-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default IVALUE_CATALOG
