import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, July 17, 2026 that https://www.sage.com/en-us/sage-business-cloud/intacct/ is the live official Sage Intacct product page, that the first-party Sage hiring surface is the shared careers hub at https://www.sage.com/en-us/company/careers/ with the public search shell at https://www.sage.com/en-us/company/careers/career-search/, and that the official Sage locations page at https://www.sage.com/en-us/company/careers/locations/ lists India offices in Bangalore, Mohali, and Pune. Because Sage Intacct is presented on the verified first-party surface as a Sage product brand rather than a separate exact-name public jobs board, no trustworthy exact-name public jobs surface for Sage Intacct or Sage Intacct India was exposed during verification, so this provider is pinned as a fail-closed sentinel that returns no jobs.'

export const SAGE_INTACCT_CATALOG = {
  source: 'sageintacct',
  companyName: 'Sage Intacct',
  officialBrandName: 'Sage Intacct',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'sageintacct/jobs.json',
  officialBrandSiteUrl: 'https://www.sage.com/en-us/sage-business-cloud/intacct/',
  companyCareerPage: 'https://www.sage.com/en-us/company/careers/',
  officialSearchPageUrl: 'https://www.sage.com/en-us/company/careers/career-search/',
  indiaLocationsPageUrl: 'https://www.sage.com/en-us/company/careers/locations/',
  companyDomain: 'sage.com',
  atsPlatform: 'sage-shared-careers-hub-sentinel',
  countryFilter: 'India',
  paginationStrategy: 'shared-sage-careers-hub-without-exact-brand-job-surface',
  extractionStrategy:
    'verified-sage-intacct-product-page+verified-sage-careers-hub+verified-india-locations-no-exact-brand-job-surface-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default SAGE_INTACCT_CATALOG
