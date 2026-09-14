import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified September 13, 2026: the official careers page publishes seven role cards with explicit branch locations and role-specific hr@insuremile.in application links. The current parser checks the advertised total and every card; the historical AWSM parser remains available only for its verified legacy surface.'

export const INSUREMILE_CATALOG = {
  source: 'insuremile',
  companyName: 'InsureMile',
  officialBrandName: 'Insuremile',
  adapter: 'script',
  homepageUrl: 'https://insuremile.in/',
  companyCareerPage: 'https://insuremile.in/careers',
  companyDomain: 'insuremile.in',
  atsPlatform: 'official-first-party-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-verification',
  extractionStrategy: 'complete-public-role-cards+role-specific-email-apply',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-09-13',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'insuremile/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default INSUREMILE_CATALOG
