import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 16, 2026 that https://shop.lavamobiles.com/pages/about-us is the live first-party Lava International Limited about page, that https://shop.lavamobiles.com/pages/career is the live first-party careers page, and that the careers page instructs applicants to share updated resumes at careers@lavainternational.in instead of publishing trustworthy public job listings. Common first-party job routes such as https://shop.lavamobiles.com/careers and https://shop.lavamobiles.com/jobs returned 404 responses during verification. There are no trustworthy public job listings on the verified first-party Lava International surface.'

export const LAVA_INTERNATIONAL_CATALOG = {
  source: 'lavainternational',
  companyName: 'Lava International',
  officialBrandName: 'Lava International Limited',
  adapter: 'script',
  homepageUrl: 'https://shop.lavamobiles.com/',
  aboutPageUrl: 'https://shop.lavamobiles.com/pages/about-us',
  companyCareerPage: 'https://shop.lavamobiles.com/pages/career',
  applicationEmail: 'careers@lavainternational.in',
  applicationUrl: 'mailto:careers@lavainternational.in',
  companyDomain: 'lavamobiles.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-about-page-plus-resume-only-careers-page-plus-common-route-404-validation',
  extractionStrategy: 'verified-about-page+verified-resume-only-careers-page+verified-missing-common-job-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'lavainternational/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default LAVA_INTERNATIONAL_CATALOG
