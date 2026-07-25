import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.finobank.com/ redirects through https://fino.bank.in/ to the live first-party homepage https://www.fino.bank.in/, whose navigation exposes Careers at https://www.fino.bank.in/company/careers. Verified that the careers page publicly renders Open Roles with Search by role, Select Location, Select Department, and No Roles Found, while exposing only contact and self-referential careers links instead of any trustworthy public job detail, application, or ATS endpoint. Verified also that https://www.fino.bank.in/careers, https://www.fino.bank.in/career, https://www.fino.bank.in/jobs, https://www.fino.bank.in/join-us, https://www.fino.bank.in/work-with-us, and https://www.fino.bank.in/current-openings returned first-party 404s on July 15, 2026. There is no trustworthy public jobs surface right now.'

export const FINO_PAYMENTS_BANK_CATALOG = {
  source: 'finopaymentsbank',
  companyName: 'Fino Payments Bank',
  officialBrandName: 'Fino Payments Bank',
  adapter: 'script',
  legacyHomepageUrl: 'https://www.finobank.com/',
  homepageUrl: 'https://www.fino.bank.in/',
  companyCareerPage: 'https://www.fino.bank.in/company/careers',
  alternateRouteUrls: [
    'https://www.fino.bank.in/careers',
    'https://www.fino.bank.in/career',
    'https://www.fino.bank.in/jobs',
    'https://www.fino.bank.in/join-us',
    'https://www.fino.bank.in/work-with-us',
    'https://www.fino.bank.in/current-openings',
  ],
  atsPlatform: 'official-company-careers-nonlisting',
  companyDomain: 'fino.bank.in',
  countryFilter: 'India',
  paginationStrategy:
    'legacy-homepage-redirect-plus-homepage-careers-handoff-plus-nonlisting-careers-page-and-404-alternate-route-validation',
  extractionStrategy:
    'verified-legacy-homepage-redirect+verified-homepage-careers-link+verified-careers-page-open-roles-no-roles-found+verified-alternate-careers-routes-404-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'finopaymentsbank/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default FINO_PAYMENTS_BANK_CATALOG
