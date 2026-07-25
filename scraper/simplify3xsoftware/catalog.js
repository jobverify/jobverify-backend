import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SIMPLIFY3X_SOFTWARE_CATALOG = {
  source: 'simplify3xsoftware',
  companyName: 'Simplify3x Software',
  officialBrandName: 'Simplify3x',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  companyCareerPage: 'https://simplify3x.com/life.html',
  companyDomain: 'simplify3x.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'homepage-plus-life-page-plus-common-route-validation',
  extractionStrategy:
    'verified-homepage+verified-life-page+missing-common-job-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://simplify3x.com/ is the live first-party Simplify3x homepage and that https://simplify3x.com/life.html is the live Life at Simplify3x culture page. Those first-party pages expose marketing, culture, testimonials, and contact information but no trustworthy public jobs surface, no public ATS handoff, and no public role detail pages, so the local provider is intentionally fail-closed until a real first-party hiring surface appears.',
}

export default SIMPLIFY3X_SOFTWARE_CATALOG
