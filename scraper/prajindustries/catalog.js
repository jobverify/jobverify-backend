import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PRAJ_INDUSTRIES_CATALOG = {
  source: 'prajindustries',
  companyName: 'Praj Industries',
  officialBrandName: 'Praj Industries',
  adapter: 'script',
  homepageUrl: 'https://www.praj.net/',
  companyCareerPage: 'https://www.praj.net/careers/',
  companyDomain: 'praj.net',
  atsPlatform: 'darwinbox',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-page-plus-public-darwinbox-candidateapi-pagination',
  extractionStrategy: 'verified-careers-page+darwinbox-public-listing-api+darwinbox-public-job-detail-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  officialCareersHandoffUrl: 'https://praj.darwinbox.in/ms/candidate/careers',
  darwinboxOrigin: 'https://praj.darwinbox.in',
  darwinboxCompanyId: 'main',
  officialListingApiUrl: 'https://praj.darwinbox.in/ms/candidateapi/job?page=1',
  officialJobDetailApiUrl: 'https://praj.darwinbox.in/ms/candidateapi/job/{id}',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.praj.net/careers/ is the live official Praj Industries careers page, that it exposes a SEARCH FOR JOB handoff to https://praj.darwinbox.in/ms/candidate/careers, and that the public Darwinbox candidate API at https://praj.darwinbox.in/ms/candidateapi/job?page=1 returned jobscount 12 with public India listings. Public job detail records were also available from https://praj.darwinbox.in/ms/candidateapi/job/{id}.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: path.join(currentDir, 'jobs.json'),
}

export default PRAJ_INDUSTRIES_CATALOG
