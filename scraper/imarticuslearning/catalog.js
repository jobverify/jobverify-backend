import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 16, 2026 that https://imarticus.org/ is the live first-party Imarticus Learning homepage, that its footer link "Careers at Imarticus" resolves to https://imarticus.org/careers/, and that the verified first-party careers route canonicals to https://imarticus.org/building-careers-of-the-future-with-imarticus-rise/. The exposed surface is an Imarticus Rise career-services marketing page rather than an employer hiring board, and no trustworthy public employer job listings or ATS handoff were exposed on the official first-party surface.'

export const IMARTICUS_LEARNING_CATALOG = {
  source: 'imarticuslearning',
  companyName: 'Imarticus Learning',
  officialBrandName: 'Imarticus Learning',
  adapter: 'script',
  homepageUrl: 'https://imarticus.org/',
  companyCareerPage: 'https://imarticus.org/careers/',
  canonicalCareerServicesPage: 'https://imarticus.org/building-careers-of-the-future-with-imarticus-rise/',
  companyDomain: 'imarticus.org',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-homepage-plus-career-services-page-validation',
  extractionStrategy:
    'verified-homepage+verified-career-services-page-without-public-employer-listings-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'imarticuslearning/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default IMARTICUS_LEARNING_CATALOG
