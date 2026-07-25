import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const STAN_PLUS_CATALOG = {
  source: 'stanplus',
  companyName: 'StanPlus',
  adapter: 'script',
  companyCareerPage: 'https://www.red.health/career',
  officialHomepageUrl: 'https://www.red.health/',
  contactUsUrl: 'https://www.red.health/contact-us',
  termsUrl: 'https://www.red.health/terms-conditions',
  officialBrandName: 'RED.Health',
  legalEntityName: 'Stanplus Technologies Private Limited',
  officialCareersHandoffUrl: 'https://redhealth.darwinbox.in/ms/candidatev2/main',
  darwinboxJobsUrl: 'https://redhealth.darwinbox.in/jobs',
  darwinboxCandidateCareersUrl: 'https://redhealth.darwinbox.in/ms/candidate/careers',
  darwinboxPublicHomeUrl: 'https://redhealth.darwinbox.in/ms/candidatev2/main/careers/home',
  darwinboxPublicAllJobsUrl: 'https://redhealth.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  darwinboxListingApiUrl: 'https://redhealth.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-careers-page-plus-darwinbox-timeout-validation',
  extractionStrategy:
    'verified-first-party-careers-page+verified-darwinbox-handoff+timed-out-public-darwinbox-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'red.health',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    "Verified on July 17, 2026 that https://www.red.health/career was the live first-party RED.Health careers page for StanPlus and linked candidates via Discover Roles to the Darwinbox handoff at https://redhealth.darwinbox.in/ms/candidatev2/main, while first-party legal copy on https://www.red.health/contact-us identified Stanplus Technologies Private Limited. Direct probes to https://redhealth.darwinbox.in/jobs, https://redhealth.darwinbox.in/ms/candidate/careers, https://redhealth.darwinbox.in/ms/candidatev2/main/careers/home, https://redhealth.darwinbox.in/ms/candidatev2/main/careers/allJobs, and https://redhealth.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main timed out, so there was no trustworthy public jobs surface on Friday, July 17, 2026.",
  darwinboxTimeoutRouteUrls: [
    'https://redhealth.darwinbox.in/jobs',
    'https://redhealth.darwinbox.in/ms/candidate/careers',
    'https://redhealth.darwinbox.in/ms/candidatev2/main/careers/home',
    'https://redhealth.darwinbox.in/ms/candidatev2/main/careers/allJobs',
    'https://redhealth.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  ],
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: path.join(currentDir, 'jobs.json'),
}

export default STAN_PLUS_CATALOG
