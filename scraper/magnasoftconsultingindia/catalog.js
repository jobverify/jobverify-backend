import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 18, 2026 that https://www.magnasoft.com/careers/ is the live first-party Magnasoft careers shell, but it only exposes a contact-style form and Talk to Us CTA rather than public role cards, searchable openings, or a trustworthy public ATS handoff. No trustworthy public jobs surface is currently exposed on the verified page, so this company stays fail-closed until Magnasoft publishes real public listings.'

export const MAGNASOFT_CONSULTING_INDIA_CATALOG = {
  source: 'magnasoftconsultingindia',
  companyName: 'Magnasoft Consulting India',
  officialBrandName: 'Magnasoft',
  adapter: 'script',
  homepageUrl: 'https://www.magnasoft.com/',
  companyCareerPage: 'https://www.magnasoft.com/careers/',
  companyDomain: 'magnasoft.com',
  atsPlatform: 'official-first-party-careers-shell-no-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'single-careers-shell-validation',
  extractionStrategy: 'verified-careers-shell+no-public-job-listings+return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'magnasoftconsultingindia/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default MAGNASOFT_CONSULTING_INDIA_CATALOG
