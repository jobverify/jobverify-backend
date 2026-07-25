import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 18, 2026 that https://nians.com/job/ was the live first-party openings page for Technians Softech under the current Nians brand, that the page explicitly stated "Technians is now Nians", and that it exposed department counts such as Technology/ IT department (1) plus a shared application selector containing roles including Trainee - Social Media.'

export const TECHNIANS_SOFTECH_CATALOG = {
  source: 'technianssoftech',
  companyName: 'Technians Softech',
  officialBrandName: 'Nians',
  adapter: 'script',
  homepageUrl: 'https://nians.com/',
  companyCareerPage: 'https://nians.com/job/',
  companyDomain: 'nians.com',
  atsPlatform: 'official-company-jobs-form',
  countryFilter: 'India',
  paginationStrategy: 'single-page-role-select-options',
  extractionStrategy: 'verified-roles-page+designation-select-options+shared-application-form',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'technianssoftech/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default TECHNIANS_SOFTECH_CATALOG
