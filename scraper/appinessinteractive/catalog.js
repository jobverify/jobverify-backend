import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 18, 2026 that https://www.appinessworld.com/careers/job-details/ is the live first-party Appiness Interactive careers page and that it publicly exposes same-page role sections including SEO Expert, Python Developer, Senior Software Engineer - Java, and QA Engineer - Automation for Bangalore applicants. The verified page showed 15 public openings on the first-party surface.'

export const APPINESS_INTERACTIVE_CATALOG = {
  source: 'appinessinteractive',
  companyName: 'Appiness Interactive',
  officialBrandName: 'Appiness Interactive Pvt. Ltd.',
  adapter: 'script',
  homepageUrl: 'https://www.appinessworld.com/',
  companyCareerPage: 'https://www.appinessworld.com/careers/job-details/',
  companyDomain: 'appinessworld.com',
  atsPlatform: 'official-first-party-role-sections',
  countryFilter: 'India',
  paginationStrategy: 'single-page',
  extractionStrategy: 'same-page-role-sections',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedPublicOpeningCount: 15,
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'appinessinteractive/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default APPINESS_INTERACTIVE_CATALOG
