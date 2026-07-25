import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, July 17, 2026 that https://sciative.com/ was the live exact-name first-party Sciative homepage, that https://sciative.com/about-us exposed the public "Humans of Sciative" company page plus a "Join Our Talent Community" prompt, and that no trustworthy public job listings were exposed on the verified first-party surface.'

export const SCIATIVE_SOLUTIONS_CATALOG = {
  source: 'sciative',
  companyName: 'Sciative Solutions',
  officialBrandName: 'Sciative',
  adapter: 'script',
  homepageUrl: 'https://sciative.com/',
  companyCareerPage: 'https://sciative.com/about-us',
  companyDomain: 'sciative.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-homepage-plus-about-page-talent-community-scan',
  extractionStrategy: 'verified-homepage+verified-about-page-talent-community-without-public-openings-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'sciative/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default SCIATIVE_SOLUTIONS_CATALOG
