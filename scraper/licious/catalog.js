import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const LICIOUS_CATALOG = {
  source: 'licious',
  companyName: 'Licious',
  officialBrandName: 'Licious',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'licious/jobs.json',
  companyCareerPage: 'https://careers.licious.com/',
  officialCareersHandoffUrl: 'https://licious.darwinbox.in/ms/candidate/careers',
  publicPortalUrl: 'https://licious.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  darwinboxListingApiUrl: 'https://licious.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  darwinboxOrigin: 'https://licious.darwinbox.in',
  darwinboxCompanyId: 'main',
  companyDomain: 'careers.licious.com',
  atsPlatform: 'darwinbox',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-page-plus-darwinbox-listing-api',
  extractionStrategy: 'verified-official-careers-page-handoff+darwinbox-listing-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that https://careers.licious.com/ is the official Licious careers page and hands candidates to Darwinbox via https://licious.darwinbox.in/ms/candidate/careers. The public Darwinbox jobs portal at https://licious.darwinbox.in/ms/candidatev2/main/careers/allJobs showed 3 open jobs on the verified date, and the public listing endpoint https://licious.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main returned public India openings including Dispatch Supervisor, Area Sales Manager, and Store In Charge.',
}

export default LICIOUS_CATALOG
