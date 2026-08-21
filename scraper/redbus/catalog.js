import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, August 14, 2026 that https://www.redbus.in/careers is the live official redBus careers page, that https://www.redbus.in/careers/jobs is the live official redBus public jobs route, that the current jobs bundle there still exposes both the signed first-party jobs APIs at https://www.redbus.in/careers/api/getJobsList and https://www.redbus.in/careers/api/getJobDesc plus the Darwinbox apply handoff to https://gommt.darwinbox.in/ms/candidatev2/main/careers/jobDetails/<jobId>?from=all, and that direct runtime-style calls to the shared Darwinbox inventory endpoint returned a Cloudflare-backed HTTP 403 while the signed first-party RedBus APIs remained reachable and exposed 11 public RedBus jobs identifiable by live RB_MMT / RBMR markers during verification.'

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
  companyDomain: 'redbus.in',
  atsPlatform: 'signed-first-party-jobs-api',
  countryFilter: 'India',
  verifiedPublicJobCount: 11,
  paginationStrategy: 'official-redbus-jobs-page-plus-signed-first-party-api',
  extractionStrategy:
    'official-redbus-careers+jobs-page+bundle-verified-signed-jobs-api+redbus-only-detail-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-14',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default REDBUS_CATALOG
