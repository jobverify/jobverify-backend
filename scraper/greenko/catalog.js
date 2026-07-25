import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.greenkogroup.com/ remains the live Greenko Group homepage and ' +
  'that it exposes a public Careers link to https://greenkogroup.darwinbox.in/ms/candidatev2/main/careers/allJobs.'

export const GREENKO_CATALOG = {
  source: 'greenko',
  companyName: 'Greenko',
  officialBrandName: 'Greenko Hub',
  adapter: 'script',
  dryRunFile: 'greenko/jobs.json',
  homepageUrl: 'https://www.greenkogroup.com/',
  companyCareerPage: 'https://www.greenkogroup.com/',
  atsPlatform: 'darwinbox',
  countryFilter: 'India',
  paginationStrategy: 'browser-session-darwinbox-pagination',
  extractionStrategy: 'verified-greenko-homepage-link+darwinbox-listing-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'greenkogroup.com',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  modulePath: path.join(currentDir, 'script.js'),
}

export default GREENKO_CATALOG
