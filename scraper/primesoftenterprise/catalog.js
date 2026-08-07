import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PRIMESOFT_ENTERPRISE_CATALOG = {
  source: 'primesoftenterprise',
  companyName: 'Primesoft Enterprise',
  adapter: 'script',
  homepageUrl: 'https://primesoft.net/',
  companyCareerPage: 'https://primesoft.net/careers/',
  companyDomain: 'primesoft.net',
  atsPlatform: 'darwinbox',
  countryFilter: 'India',
  paginationStrategy: 'browser-session-darwinbox-pagination',
  extractionStrategy:
    'verified-first-party-careers-page+official-darwinbox-handoff+darwinbox-listing-api+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  officialCareersHandoffUrl: 'https://primesoft.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  publicAllJobsUrl: 'https://primesoft.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  darwinboxOrigin: 'https://primesoft.darwinbox.in',
  darwinboxCompanyId: 'main',
  verifiedOn: '2026-08-04',
  verifiedSurfaceSummary:
    'Verified on Tuesday, August 4, 2026 that https://primesoft.net/careers/ was the live first-party PrimeSoft careers page, that it still linked India job seekers to the official Darwinbox board at https://primesoft.darwinbox.in/ms/candidatev2/main/careers/allJobs, and that the public Darwinbox portal returned 15 India openings during verification.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default PRIMESOFT_ENTERPRISE_CATALOG
