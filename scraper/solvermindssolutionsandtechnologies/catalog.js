import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 18, 2026 that https://www.solverminds.com/ is the live Solverminds homepage, https://www.solverminds.com/about includes first-party careers copy for the company, and https://careers.solverminds.com/candidateportal?source=career currently resolves to a login-gated candidate portal requiring TOTP-based sign-in rather than exposing trustworthy public job listings. The implementation therefore fails closed until a public first-party jobs surface appears.'

export const SOLVERMINDS_SOLUTIONS_AND_TECHNOLOGIES_CATALOG = {
  source: 'solvermindssolutionsandtechnologies',
  companyName: 'Solverminds Solutions and Technologies',
  officialBrandName: 'Solverminds Solutions and Technologies Pvt. Ltd.',
  adapter: 'script',
  homepageUrl: 'https://www.solverminds.com/',
  companyCareerPage: 'https://careers.solverminds.com/candidateportal?source=career',
  aboutPageUrl: 'https://www.solverminds.com/about',
  companyDomain: 'solverminds.com',
  atsPlatform: 'official-company-site-blocked-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'homepage-plus-about-plus-login-gated-candidate-portal-validation',
  extractionStrategy: 'verified-homepage+verified-about-careers-copy+verified-login-gated-candidate-portal-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'solvermindssolutionsandtechnologies/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default SOLVERMINDS_SOLUTIONS_AND_TECHNOLOGIES_CATALOG
