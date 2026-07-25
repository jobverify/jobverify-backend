import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.fincarebank.com/ redirects to https://www.au.bank.in/ in live browser checks, that direct HTTP probes of https://fincarebank.in/, https://fincarebank.in/careers, https://fincarebank.in/jobs, and https://fincarebank.in/about-us/careers all resolved to https://www.au.bank.in/ with 403 responses, and that the first-party AU migration page https://www.au.bank.in/au-small-finance-bank-and-fincare-small-finance-bank-merger remains live while the AU homepage still exposes migrated customer links such as "Fincare NetBanking". There is no trustworthy public jobs surface for the exact-name Fincare brand anymore: the public exact-name domains now hand off to AU Small Finance Bank rather than to a Fincare-branded careers or jobs listing surface.'

export const FINCARE_CATALOG = {
  source: 'fincare',
  companyName: 'Fincare',
  officialBrandName: 'Fincare',
  adapter: 'script',
  homepageUrl: 'https://fincarebank.in/',
  companyCareerPage: 'https://fincarebank.in/careers',
  legacyWwwHomepageUrl: 'https://www.fincarebank.com/',
  mergedParentHomepageUrl: 'https://www.au.bank.in/',
  legacyMergerInfoUrl: 'https://www.au.bank.in/au-small-finance-bank-and-fincare-small-finance-bank-merger',
  checkedRedirectRouteUrls: [
    'https://fincarebank.in/',
    'https://fincarebank.in/careers',
    'https://fincarebank.in/jobs',
    'https://fincarebank.in/about-us/careers',
  ],
  companyDomain: 'fincarebank.in',
  atsPlatform: 'legacy-brand-redirect-to-au-bank-homepage',
  countryFilter: 'India',
  paginationStrategy: 'legacy-homepage-and-careers-route-redirect-validation',
  extractionStrategy:
    'verified-legacy-fincare-routes-redirect-to-au-homepage-without-public-jobs-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'fincare/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default FINCARE_CATALOG
