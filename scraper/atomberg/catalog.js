import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on August 17, 2026 that https://atomberg.com/ is the live first-party Atomberg Shopify storefront and that https://atomberg.com/careers now redirects to the first-party careers page at https://atomberg.com/pages/careers, where the public surface remains resume-only recruiting copy asking candidates to share resumes at career@atomberg.com. Also verified on August 17, 2026 that https://atomberg.com/jobs and https://atomberg.com/career return first-party Shopify 404 noindex pages. There is no trustworthy public jobs surface for Atomberg right now.'

export const ATOMBERG_CATALOG = {
  source: 'atomberg',
  companyName: 'Atomberg',
  officialBrandName: 'Atomberg',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'atomberg/jobs.json',
  companyCareerPage: 'https://atomberg.com/careers',
  homepageUrl: 'https://atomberg.com/',
  applicationEmail: 'career@atomberg.com',
  applicationUrl: 'mailto:career@atomberg.com',
  noPublicJobRouteUrls: [
    'https://atomberg.com/jobs',
  ],
  brokenCareerRouteUrl: 'https://atomberg.com/career',
  companyDomain: 'atomberg.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-shopify-homepage-plus-resume-only-careers-page-plus-shopify-404-validation',
  extractionStrategy:
    'verified-shopify-homepage+verified-careers-page-email-resume-handoff-without-public-listings+verified-shopify-404-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default ATOMBERG_CATALOG
