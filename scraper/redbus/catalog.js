import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, July 17, 2026 that https://www.redbus.in/careers is the live official redBus careers page, that https://www.redbus.in/careers/jobs is the live official RedBus public jobs route, that the current jobs bundle there exposes a Darwinbox apply handoff to https://gommt.darwinbox.in/ms/candidatev2/main/careers/jobDetails/<jobId>?from=all, that https://gommt.darwinbox.in/ms/candidatev2/main/careers/allJobs is a live public MakeMyTrip-group Darwinbox shell, and that the shared Darwinbox board exposed 5 public RedBus jobs identifiable by the RedBus-specific subtype marker "RB - Employee" during verification.'

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
  verifiedPublicJobCount: 5,
  paginationStrategy: 'official-redbus-careers-plus-shared-darwinbox-browser-session',
  extractionStrategy:
    'official-redbus-careers+jobs-page+bundle-verified-darwinbox-handoff+shared-darwinbox-rb-employee-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default REDBUS_CATALOG
