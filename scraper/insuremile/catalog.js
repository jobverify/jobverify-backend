import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on September 3, 2026 that https://insuremile.in/careers is the live first-party InsureMile careers page, that it now says "While we don\'t have active job listings right now", and that it directs resumes to careers@insuremile.in on the official domain. The historical wp-job-openings assets and AWSM REST feed are no longer present on the public page, so this provider now returns an empty array until a trustworthy public jobs surface reappears.'

export const INSUREMILE_CATALOG = {
  source: 'insuremile',
  companyName: 'InsureMile',
  officialBrandName: 'Insuremile',
  adapter: 'script',
  homepageUrl: 'https://insuremile.in/',
  companyCareerPage: 'https://insuremile.in/careers',
  companyDomain: 'insuremile.in',
  atsPlatform: 'official-company-site-no-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-verification',
  extractionStrategy: 'verified-first-party-careers-page-no-open-roles-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-09-03',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'insuremile/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default INSUREMILE_CATALOG
