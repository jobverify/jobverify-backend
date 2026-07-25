import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const REPLICON_CATALOG = {
  source: 'replicon',
  companyName: 'Replicon',
  officialBrandName: 'Replicon',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'replicon/jobs.json',
  companyCareerPage: 'https://www.replicon.com/company/careers/',
  redirectCareersUrl: 'https://www.deltek.com/en/about/careers',
  genericSearchJobsUrl: 'https://careers.deltek.com/',
  upstreamCompanyName: 'Deltek',
  companyDomain: 'replicon.com',
  atsPlatform: 'redirected-parent-careers-no-standalone-replicon-jobs',
  countryFilter: 'India',
  paginationStrategy: 'exact-name-careers-redirect-validation',
  extractionStrategy:
    'verified-replicon-careers-redirect+generic-deltek-search-jobs+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.replicon.com/company/careers/ resolves to the generic Deltek careers page at https://www.deltek.com/en/about/careers, that the live page title is "Drive Your Career with #TeamDeltek | Search Jobs | Deltek", and that the hiring CTA points to https://careers.deltek.com/ rather than to a distinct Replicon public jobs surface. Replicon also remains a Deltek product after Deltek completed its acquisition of Replicon on August 22, 2023, so this local provider fails closed until an exact-name Replicon jobs surface reappears.',
}

export default REPLICON_CATALOG
