import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Tuesday, August 4, 2026 that https://www.redbus.in/careers is the live official redBus careers page, that https://www.redbus.in/careers/jobs is the live official redBus public jobs route, that both pages now encode their verification copy inside the inline page payload, that the current jobs bundle there still exposes a Darwinbox apply handoff to https://gommt.darwinbox.in/ms/candidatev2/main/careers/jobDetails/<jobId>?from=all, that https://gommt.darwinbox.in/ms/candidatev2/main/careers/allJobs now serves the live public Darwinbox candidate shell with the current candidatev2 app assets, and that the shared Darwinbox board exposed 6 public RedBus jobs identifiable by the RedBus-specific subtype marker "RB - Employee" during verification.'

export const REDBUS_CATALOG = {
  source: 'redbus',
  companyName: 'RedBus',
  officialBrandName: 'redBus India Pvt Ltd.',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'redbus/jobs.json',
  officialBrandSiteUrl: 'https://www.redbus.in/',
  companyCareerPage: 'https://www.redbus.in/careers',
  jobListingsUrl: 'https://www.redbus.in/careers/jobs',
  darwinboxOrigin: 'https://gommt.darwinbox.in',
  darwinboxCompanyId: 'main',
  darwinboxAllJobsUrl: 'https://gommt.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  companyDomain: 'gommt.darwinbox.in',
  atsPlatform: 'darwinbox',
  countryFilter: 'India',
  verifiedPublicJobCount: 6,
  paginationStrategy: 'official-redbus-careers-plus-shared-darwinbox-browser-session',
  extractionStrategy:
    'official-redbus-careers+jobs-page+bundle-verified-darwinbox-handoff+shared-darwinbox-rb-employee-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-04',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default REDBUS_CATALOG
