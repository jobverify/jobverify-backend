import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, July 17, 2026 that https://www.shopclues.com/career.html is the live first-party ShopClues careers landing page and that https://www.shopclues.com/current-opening.html is the first-party current openings page exposing public static role blocks including Technology openings such as Software Engineer (PHP, MYSQL) on the official shopclues.com domain.'

export const SHOPCLUES_CATALOG = {
  source: 'shopclues',
  companyName: 'ShopClues',
  officialBrandName: 'ShopClues',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'shopclues/jobs.json',
  homepageUrl: 'https://www.shopclues.com/',
  companyCareerPage: 'https://www.shopclues.com/career.html',
  currentOpeningsUrl: 'https://www.shopclues.com/current-opening.html',
  companyDomain: 'shopclues.com',
  atsPlatform: 'official-company-site-static-current-openings-page',
  countryFilter: 'India',
  paginationStrategy: 'single-official-current-openings-page-no-pagination',
  extractionStrategy: 'verified-careers-landing+verified-current-openings-page+static-position-block-parsing',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedSampleRoleTitle: 'Software Engineer (PHP, MYSQL)',
  verifiedSampleDepartment: 'Technology',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default SHOPCLUES_CATALOG
