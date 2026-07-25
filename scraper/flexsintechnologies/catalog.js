import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const FLEXSIN_TECHNOLOGIES_CATALOG = {
  source: 'flexsintechnologies',
  companyName: 'Flexsin Technologies',
  officialBrandName: 'Flexsin',
  adapter: 'script',
  homepageUrl: 'https://www.flexsin.com/',
  companyCareerPage: 'https://www.flexsin.com/careers/',
  atsPlatform: 'official-first-party-job-listings',
  countryFilter: 'India',
  paginationStrategy: 'single-page',
  extractionStrategy: 'verified-first-party-inline-job-cards',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'flexsin.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.flexsin.com/careers/ is the live first-party Flexsin careers page and that it publicly exposes inline job cards including Director - Open Source, AI Architect - Artificial Intelligence, Intern - Software Engineering, and Software Engineer - Python in Noida.',
  dryRunFile: 'flexsintechnologies/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default FLEXSIN_TECHNOLOGIES_CATALOG
