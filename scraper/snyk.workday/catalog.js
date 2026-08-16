import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SNYK_CATALOG = {
  source: 'snyk',
  companyName: 'Snyk',
  officialBrandName: 'Snyk',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'snyk.workday/jobs.json',
  officialCareersLandingUrl: 'https://snyk.io/careers/',
  companyCareerPage: 'https://snyk.io/careers/all-jobs/',
  firstPartyJobsApiUrl: 'https://snyk.io/api/next/jobs',
  workdayTenantUrl: 'https://snyk.wd103.myworkdayjobs.com/External',
  atsPlatform: 'workday',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-next-jobs-api-page',
  extractionStrategy:
    'verified-first-party-careers-pages+first-party-next-jobs-api+workday-detail-urls+return-empty-when-no-india-locations',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'snyk.io',
  verifiedOn: '2026-08-13',
  verifiedSurfaceSummary:
    'Verified on Thursday, August 13, 2026 that https://snyk.io/careers/ remains the live first-party Snyk careers landing page, that https://snyk.io/careers/all-jobs/ remains the live first-party open-jobs page, and that the current jobs bundle still calls the first-party endpoint https://snyk.io/api/next/jobs for Workday-backed openings under https://snyk.wd103.myworkdayjobs.com/External. Direct verification of that first-party jobs API returned 24 public roles and 0 India roles on the verified date.',
}

export default SNYK_CATALOG
